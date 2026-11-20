import { NextRequest, NextResponse } from "next/server";
import { getNotifications, markNotificationAsRead } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const notifications = await getNotifications(parseInt(userId, 10));
  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
    }

    const ok = await markNotificationAsRead(parseInt(id, 10));
    return NextResponse.json({ success: ok });
  } catch (err: unknown) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Internal notification update error" }, { status: 500 });
  }
}
