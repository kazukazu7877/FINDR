import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClaim, getClaims, updateClaimStatus, logAuditEvent } from "@/lib/db/queries";
import { dispatchNotification } from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const claimantId = searchParams.get("claimantId") ? parseInt(searchParams.get("claimantId")!, 10) : undefined;
    const reportId = searchParams.get("reportId") ? parseInt(searchParams.get("reportId")!, 10) : undefined;
    const status = searchParams.get("status") || undefined;

    const claims = await getClaims({ claimantId, reportId, status });
    return NextResponse.json({ claims });
  } catch (err: unknown) {
    console.error("GET /api/claims error:", err);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { report_id, claimant_id, claim_reason, identifying_details, additional_evidence } = body;

    if (!report_id || !claimant_id || !claim_reason || !identifying_details) {
      return NextResponse.json(
        { error: "Report ID, claimant, claim reason, and distinguishing details are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Check for existing claim
    const { data: existing } = await supabase
      .from("claims")
      .select("id, status")
      .eq("report_id", report_id)
      .eq("claimant_id", claimant_id)
      .single();

    if (existing && existing.status !== "rejected") {
      return NextResponse.json(
        { error: "You have already submitted an active claim for this report. Staff is reviewing it." },
        { status: 400 }
      );
    }

    // Fetch report to verify and notify
    const { data: report } = await supabase
      .from("reports")
      .select("id, title, type")
      .eq("id", report_id)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    // Fetch claimant profile
    const { data: claimant } = await supabase
      .from("users")
      .select("id, full_name, email, phone")
      .eq("id", claimant_id)
      .single();

    // Create claim
    const claim = await createClaim({
      report_id,
      claimant_id,
      claim_reason,
      identifying_details,
      additional_evidence,
    });

    if (!claim) {
      return NextResponse.json({ error: "Failed to create claim record." }, { status: 500 });
    }

    // Notify staff supervisors of new claim
    const { data: staffUsers } = await supabase
      .from("users")
      .select("id, email, phone")
      .in("role", ["staff", "supervisor"]);

    if (staffUsers && staffUsers.length > 0) {
      for (const staff of staffUsers) {
        await dispatchNotification({
          userId: staff.id,
          type: "claim_submitted",
          title: "New Ownership Claim Requires Review",
          message: `Claim submitted by ${claimant?.full_name || "a student"} for "${report.title}" (Ref #${report.id}). Review details in Staff Mode.`,
          reportId: report.id,
          email: staff.email,
          phone: staff.phone,
        });
      }
    }

    // Confirmation notification to claimant
    await dispatchNotification({
      userId: claimant_id,
      type: "system",
      title: "Ownership Claim Received",
      message: `Your claim for "${report.title}" has been submitted for staff verification. You will be notified once reviewed.`,
      reportId: report.id,
      email: claimant?.email,
      phone: claimant?.phone,
    });

    await logAuditEvent(
      claimant?.full_name || `User #${claimant_id}`,
      "Submitted Ownership Claim",
      "claim",
      claim.id,
      `Report: #${report_id} (${report.title})`,
      claimant_id
    );

    return NextResponse.json({ success: true, claim });
  } catch (err: unknown) {
    console.error("POST /api/claims error:", err);
    return NextResponse.json({ error: "Internal claim submission error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { claimId, action, reviewerName, staffNotes } = body;

    if (!claimId || !action || !reviewerName) {
      return NextResponse.json(
        { error: "Claim ID, action ('approved' | 'rejected' | 'more_info_needed'), and reviewer name are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Fetch claim with claimant & report
    const { data: claim, error: fetchErr } = await supabase
      .from("claims")
      .select("*, claimant:users(*), report:reports(*)")
      .eq("id", claimId)
      .single();

    if (fetchErr || !claim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    const ok = await updateClaimStatus(claimId, action, reviewerName, staffNotes);
    if (!ok) {
      return NextResponse.json({ error: "Failed to update claim status." }, { status: 500 });
    }

    // Dispatch notifications based on decision
    if (action === "approved") {
      // 1. Notify claimant that claim is verified and contact info is unlocked
      await dispatchNotification({
        userId: claim.claimant_id,
        type: "claim_approved",
        title: "Ownership Claim Verified!",
        message: `Your claim for "${claim.report?.title}" has been verified by ${reviewerName}. You can now view authorized contact details on FINDR to coordinate recovery.`,
        reportId: claim.report_id,
        email: claim.claimant?.email,
        phone: claim.claimant?.phone,
      });

      // 2. Notify the person who found the item if registered
      if (claim.report?.user_id) {
        const { data: finder } = await supabase
          .from("users")
          .select("id, email, phone, full_name")
          .eq("id", claim.report.user_id)
          .single();

        if (finder) {
          await dispatchNotification({
            userId: finder.id,
            type: "claim_approved",
            title: "Belonging Owner Verified",
            message: `The owner for "${claim.report.title}" has been verified (${claim.claimant?.full_name}). Visit FINDR to view contact information.`,
            reportId: claim.report_id,
            email: finder.email,
            phone: finder.phone,
          });
        }
      }
    } else if (action === "rejected") {
      await dispatchNotification({
        userId: claim.claimant_id,
        type: "claim_rejected",
        title: "Claim Review Update",
        message: `Your ownership claim for "${claim.report?.title}" could not be confirmed. Reason: ${
          staffNotes || "Identifying details provided did not match item characteristics."
        }`,
        reportId: claim.report_id,
        email: claim.claimant?.email,
        phone: claim.claimant?.phone,
      });
    } else if (action === "more_info_needed") {
      await dispatchNotification({
        userId: claim.claimant_id,
        type: "claim_info_needed",
        title: "Additional Information Required",
        message: `Staff reviewing your claim for "${claim.report?.title}" requested more details: ${
          staffNotes || "Please provide distinctive features or purchase/serial proof."
        }`,
        reportId: claim.report_id,
        email: claim.claimant?.email,
        phone: claim.claimant?.phone,
      });
    }

    await logAuditEvent(
      reviewerName,
      `Claim ${action.toUpperCase()}`,
      "claim",
      claimId,
      staffNotes || `Action: ${action}`
    );

    return NextResponse.json({ success: true, status: action });
  } catch (err: unknown) {
    console.error("PATCH /api/claims error:", err);
    return NextResponse.json({ error: "Internal claim review error" }, { status: 500 });
  }
}
