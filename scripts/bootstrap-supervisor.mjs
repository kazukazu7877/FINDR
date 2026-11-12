import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env without external dependencies
for (const envFile of ["../.env", "../.env.local", ".env"]) {
  const fullPath = path.resolve(__dirname, envFile);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function bootstrapSupervisor() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || "Campus Supervisor";

  if (!email || !password) {
    console.log("Usage: node bootstrap-supervisor.mjs <email> <password> [full_name]");
    process.exit(1);
  }

  console.log(`Bootstrapping supervisor: ${email}...`);

  // 1. Create or get user in Supabase Auth
  let authUserId = null;
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "supervisor" },
  });

  if (createError) {
    if (createError.message.includes("already registered") || createError.message.includes("exists")) {
      console.log("User already exists in Supabase Auth, updating password...");
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        authUserId = existing.id;
        await supabase.auth.admin.updateUserById(authUserId, {
          password,
          user_metadata: { full_name: fullName, role: "supervisor" },
        });
        console.log("Password updated in Supabase Auth.");
      }
    } else {
      console.error("Supabase Auth error:", createError.message);
      process.exit(1);
    }
  } else {
    authUserId = createData.user.id;
    console.log("Created user in Supabase Auth successfully.");
  }

  // 2. Insert or update in public.users table
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  if (existingUser) {
    const { error: updateError } = await supabase
      .from("users")
      .update({
        role: "supervisor",
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id);

    if (updateError) {
      console.error("Error updating public.users record:", updateError.message);
    } else {
      console.log(`Updated user record #${existingUser.id} to role: supervisor.`);
    }
  } else {
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email: email.toLowerCase(),
          password_hash: "SUPABASE_AUTH_MANAGED",
          full_name: fullName,
          academic_year: "Faculty / Staff",
          branch: "Administration",
          section: "Security & Lost-Found",
          role: "supervisor",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating public.users record:", insertError.message);
    } else {
      console.log(`Created public.users record #${newUser.id} with role: supervisor.`);
    }
  }

  console.log("\nSupervisor bootstrap complete!");
}

bootstrapSupervisor().catch(console.error);
