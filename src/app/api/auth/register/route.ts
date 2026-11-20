import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      full_name,
      phone,
      academic_year,
      branch,
      section,
    } = body;

    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedName = full_name?.trim();
    const trimmedPhone = phone?.trim();
    const trimmedYear = academic_year?.trim();
    const trimmedBranch = branch?.trim();
    const trimmedSection = section?.trim();

    // 1. Mandatory validation for all 6 profile fields
    if (!trimmedEmail || !password || !trimmedName || !trimmedPhone || !trimmedYear || !trimmedBranch || !trimmedSection) {
      return NextResponse.json(
        { error: "All 6 profile fields (Full Name, Email, Phone, Academic Year, Branch, Section) and Password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Phone format check
    const digitsOnly = trimmedPhone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number for secure claim verification." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 2. Create user in Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: trimmedName,
        phone: trimmedPhone,
        academic_year: trimmedYear,
        branch: trimmedBranch,
        section: trimmedSection,
        role: "student",
      },
    });

    if (authErr && !authErr.message.includes("already registered")) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    // 3. Upsert user in public.users
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", trimmedEmail)
      .single();

    let userRecordId: number;

    if (existingUser) {
      userRecordId = existingUser.id;
      await supabase
        .from("users")
        .update({
          full_name: trimmedName,
          phone: trimmedPhone,
          academic_year: trimmedYear,
          branch: trimmedBranch,
          section: trimmedSection,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userRecordId);
    } else {
      const { data: newRec, error: insertErr } = await supabase
        .from("users")
        .insert([
          {
            email: trimmedEmail,
            password_hash: "supabase_auth_managed",
            full_name: trimmedName,
            phone: trimmedPhone,
            academic_year: trimmedYear,
            branch: trimmedBranch,
            section: trimmedSection,
            role: "student",
          },
        ])
        .select()
        .single();

      if (insertErr || !newRec) {
        console.error("Insert user profile error:", insertErr);
        return NextResponse.json(
          { error: "Failed to persist user profile in database." },
          { status: 500 }
        );
      }
      userRecordId = newRec.id;
    }

    await logAuditEvent(trimmedName, "User Registered", "user", userRecordId, `Profile: ${trimmedBranch} ${trimmedYear}`);

    return NextResponse.json({
      success: true,
      user: {
        id: userRecordId,
        email: trimmedEmail,
        name: trimmedName,
        phone: trimmedPhone,
        academic_year: trimmedYear,
        branch: trimmedBranch,
        section: trimmedSection,
        role: existingUser?.role || "student",
      },
    });
  } catch (err: unknown) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal registration error" }, { status: 500 });
  }
}
