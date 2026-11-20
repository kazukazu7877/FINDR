import { NextRequest, NextResponse } from "next/server";
import { getUserProfile, updateUserProfile, logAuditEvent } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  const profile = await getUserProfile(parseInt(userId, 10));
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, full_name, phone, academic_year, branch, section } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const updated = await updateUserProfile(parseInt(userId, 10), {
      full_name,
      phone,
      academic_year,
      branch,
      section,
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    await logAuditEvent(updated.full_name, "Updated Profile", "user", updated.id);

    return NextResponse.json({ success: true, profile: updated });
  } catch (err: unknown) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Internal profile error" }, { status: 500 });
  }
}
