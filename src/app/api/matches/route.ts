import { NextRequest, NextResponse } from "next/server";
import { getMatches, confirmMatch, dismissMatch, logAuditEvent } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const matches = await getMatches({ status });
  return NextResponse.json({ matches });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, action, reviewerName, notes } = body;

    if (!matchId || !action || !reviewerName) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (action === "confirm") {
      const ok = await confirmMatch(matchId, reviewerName, notes);
      if (ok) {
        await logAuditEvent(reviewerName, "Confirm Match", "match", matchId, notes);
        return NextResponse.json({ success: true, status: "confirmed" });
      }
    } else if (action === "dismiss") {
      const ok = await dismissMatch(matchId, reviewerName, notes);
      if (ok) {
        await logAuditEvent(reviewerName, "Dismiss Match", "match", matchId, notes);
        return NextResponse.json({ success: true, status: "dismissed" });
      }
    }

    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  } catch (err: unknown) {
    console.error("API /matches error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

