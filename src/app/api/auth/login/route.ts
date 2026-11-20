import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/db/queries";

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
      console.error("Supabase Auth login error:", authErr);
      if (
        authErr.name === "AuthRetryableFetchError" ||
        authErr.status === 0 ||
        authErr.message?.includes("fetch failed")
      ) {
        return NextResponse.json(
          {
            error:
              "Unable to reach Supabase authentication server. Your Supabase project (azjyyijcrqqqjbpifgcb) is currently paused or inactive in your Supabase dashboard. Please click 'Restore project' in Supabase to resume it.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 2. Fetch User Profile
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "User profile not found. Please complete registration." },
        { status: 404 }
      );
    }

    await logAuditEvent(profile.full_name, "User Signed In", "user", profile.id);

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        full_name: profile.full_name,
        role: profile.role || "student",
        academic_year: profile.academic_year || "",
        branch: profile.branch || "",
        section: profile.section || "",
        phone: profile.phone || "",
      },
    });
  } catch (err: unknown) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal login error" }, { status: 500 });
  }
}
