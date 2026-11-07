import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      return NextResponse.json(
        { error: "Invalid staff credentials." },
        { status: 401 }
      );
    }

    // 2. Verify staff or supervisor role in public.users
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, email, full_name, role")
      .eq("email", email)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Authorized profile not found in system." },
        { status: 403 }
      );
    }

    if (profile.role !== "staff" && profile.role !== "supervisor") {
      return NextResponse.json(
        { error: "Access denied. Staff or Supervisor role required." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
      },
    });
  } catch (err: unknown) {
    console.error("Staff auth error:", err);
    return NextResponse.json(
      { error: "Internal authentication error" },
      { status: 500 }
    );
  }
}
