import { NextRequest, NextResponse } from "next/server";
import {
  getMatches,
  confirmMatch,
  dismissMatch,
  createManualMatch,
  logAuditEvent,
} from "@/lib/db/queries";
import { getAdminClient } from "@/lib/supabase/admin";
import { dispatchNotification } from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const reportId = searchParams.get("reportId") ? parseInt(searchParams.get("reportId")!, 10) : undefined;
  const matches = await getMatches({ status, reportId });
  return NextResponse.json({ matches });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, action, reviewerName, notes, lostReportId, foundReportId } = body;

    const supabase = getAdminClient();

    // 1. Manual Match creation
    if (action === "manual") {
      if (!lostReportId || !foundReportId || !reviewerName) {
        return NextResponse.json(
          { error: "Lost report ID, found report ID, and reviewer name are required for manual matching." },
          { status: 400 }
        );
      }

      const match = await createManualMatch(lostReportId, foundReportId, reviewerName, notes);
      if (!match) {
        return NextResponse.json({ error: "Failed to create manual match." }, { status: 500 });
      }

      await logAuditEvent(
        reviewerName,
        "Created Manual Match",
        "match",
        match.id,
        `Lost #${lostReportId} paired with Found #${foundReportId}`
      );

      return NextResponse.json({ success: true, match });
    }

    if (!matchId || !action || !reviewerName) {
      return NextResponse.json(
        { error: "Missing required parameters (matchId, action, reviewerName)" },
        { status: 400 }
      );
    }

    // 2. Fetch Match Details
    const { data: match, error: fetchErr } = await supabase
      .from("matches")
      .select(`
        *,
        lost_report:reports!matches_lost_report_id_fkey(*, user:users(*)),
        found_report:reports!matches_found_report_id_fkey(*, user:users(*))
      `)
      .eq("id", matchId)
      .single();

    if (fetchErr || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // 3. Stage 1: Approve for User Verification
    if (action === "approve_candidate") {
      const { error: updErr } = await supabase
        .from("matches")
        .update({
          status: "investigating",
          reviewed_by: reviewerName,
          review_notes: notes || "Approved by staff for user confirmation",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", matchId);

      if (updErr) {
        return NextResponse.json({ error: "Failed to update match status" }, { status: 500 });
      }

      // Notify Lost Item Reporter
      if (match.lost_report?.user_id) {
        await dispatchNotification({
          userId: match.lost_report.user_id,
          type: "match_approved",
          title: "Potential Match Found for Your Lost Item",
          message: `Our team reviewed a potential match for "${match.lost_report.title}". Sign in to FINDR to review the details and confirm whether it is yours.`,
          reportId: match.lost_report_id,
          matchId: match.id,
          email: match.lost_report.user?.email,
          phone: match.lost_report.user?.phone,
        });
      }

      // Notify Found Item Reporter
      if (match.found_report?.user_id) {
        await dispatchNotification({
          userId: match.found_report.user_id,
          type: "match_suggested",
          title: "Update on Item You Reported Finding",
          message: `We've identified a possible match for "${match.found_report.title}". Our team is coordinating ownership verification with the potential owner.`,
          reportId: match.found_report_id,
          matchId: match.id,
          email: match.found_report.user?.email,
          phone: match.found_report.user?.phone,
        });
      }

      await logAuditEvent(
        reviewerName,
        "Approved AI Match for User Review",
        "match",
        matchId,
        notes || "Forwarded to student confirmation"
      );

      return NextResponse.json({ success: true, status: "investigating" });
    }

    // 4. Stage 2: Final Confirmation (Ownership verified)
    if (action === "confirm") {
      const ok = await confirmMatch(matchId, reviewerName, notes);
      if (ok) {
        // Notify both parties
        if (match.lost_report?.user_id) {
          await dispatchNotification({
            userId: match.lost_report.user_id,
            type: "match_confirmed",
            title: "Ownership Verified — Contact Unlocked",
            message: `Your ownership claim for "${match.lost_report.title}" has been verified! You can now view authorized contact details on FINDR to coordinate recovery.`,
            reportId: match.lost_report_id,
            matchId: match.id,
            email: match.lost_report.user?.email,
            phone: match.lost_report.user?.phone,
          });
        }

        if (match.found_report?.user_id) {
          await dispatchNotification({
            userId: match.found_report.user_id,
            type: "match_confirmed",
            title: "Belonging Owner Verified",
            message: `The rightful owner for "${match.found_report.title}" has been verified. You can now coordinate the return via FINDR.`,
            reportId: match.found_report_id,
            matchId: match.id,
            email: match.found_report.user?.email,
            phone: match.found_report.user?.phone,
          });
        }

        await logAuditEvent(reviewerName, "Confirm Match & Authorize Disclosure", "match", matchId, notes);
        return NextResponse.json({ success: true, status: "confirmed" });
      }
    }

    // 5. Dismiss Match
    if (action === "dismiss") {
      const ok = await dismissMatch(matchId, reviewerName, notes);
      if (ok) {
        await logAuditEvent(reviewerName, "Dismiss Match", "match", matchId, notes);
        return NextResponse.json({ success: true, status: "dismissed" });
      }
    }

    return NextResponse.json({ error: "Invalid action or operation failed" }, { status: 400 });
  } catch (err: unknown) {
    console.error("API /matches error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
