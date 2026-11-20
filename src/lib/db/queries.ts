import { getAdminClient } from "@/lib/supabase/admin";
import {
  Report,
  Match,
  Notification,
  AuditLog,
  CaseNote,
  UserProfile,
  Claim,
} from "@/types/database";

export async function createReport(data: Partial<Report>): Promise<Report | null> {
  const supabase = getAdminClient();
  const { data: record, error } = await supabase
    .from("reports")
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error("createReport error:", error);
    return null;
  }
  return record as Report;
}

export async function getReports(filter?: {
  type?: string;
  category?: string;
  status?: string;
  userId?: number;
  publicView?: boolean;
}): Promise<Report[]> {
  const supabase = getAdminClient();
  let query = supabase.from("reports").select("*, user:users(*)").order("created_at", { ascending: false });

  if (filter?.type && filter.type !== "all" && filter.type !== "All") {
    query = query.eq("type", filter.type.toLowerCase());
  }
  if (filter?.category && filter.category !== "all" && filter.category !== "All") {
    query = query.eq("category", filter.category);
  }
  if (filter?.status && filter.status !== "all" && filter.status !== "All") {
    query = query.eq("status", filter.status.toLowerCase());
  }
  if (filter?.userId) {
    query = query.eq("user_id", filter.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getReports error:", error);
    return [];
  }

  const reports = (data || []) as Report[];

  // If publicView, strip private distinct secrets and unconfirmed contact info
  if (filter?.publicView) {
    return reports.map((r) => {
      const isConfirmed = r.status === "matched" || r.status === "resolved";
      return {
        ...r,
        distinctive_secret: undefined,
        contact_info: isConfirmed ? r.contact_info : undefined,
        user: r.user
          ? {
              ...r.user,
              phone: isConfirmed ? r.user.phone : null,
              email: isConfirmed ? r.user.email : "hidden@protected.campus",
            }
          : undefined,
      };
    });
  }

  return reports;
}

export async function getReportById(id: number): Promise<Report | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*, user:users(*)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Report;
}

export async function updateReportStatus(id: number, status: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  return !error;
}

export async function getMatches(filter?: { status?: string; reportId?: number }): Promise<Match[]> {
  const supabase = getAdminClient();
  let query = supabase
    .from("matches")
    .select(`
      *,
      lost_report:reports!matches_lost_report_id_fkey(*, user:users(*)),
      found_report:reports!matches_found_report_id_fkey(*, user:users(*))
    `)
    .order("created_at", { ascending: false });

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }
  if (filter?.reportId) {
    query = query.or(`lost_report_id.eq.${filter.reportId},found_report_id.eq.${filter.reportId}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getMatches error:", error);
    return [];
  }
  return data as Match[];
}

export async function confirmMatch(
  matchId: number,
  reviewerName: string,
  notes?: string
): Promise<boolean> {
  const supabase = getAdminClient();

  const { data: match, error: fetchErr } = await supabase
    .from("matches")
    .select("lost_report_id, found_report_id")
    .eq("id", matchId)
    .single();

  if (fetchErr || !match) return false;

  const { error: matchErr } = await supabase
    .from("matches")
    .update({
      status: "confirmed",
      reviewed_by: reviewerName,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (matchErr) return false;

  await supabase
    .from("reports")
    .update({ status: "matched" })
    .in("id", [match.lost_report_id, match.found_report_id]);

  return true;
}

export async function dismissMatch(
  matchId: number,
  reviewerName: string,
  notes?: string
): Promise<boolean> {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      status: "dismissed",
      reviewed_by: reviewerName,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  return !error;
}

export async function createManualMatch(
  lostReportId: number,
  foundReportId: number,
  reviewerName: string,
  notes?: string
): Promise<Match | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .upsert(
      [
        {
          lost_report_id: lostReportId,
          found_report_id: foundReportId,
          matching_method: "manual",
          similarity_score: 1.0,
          explanation: `Manually linked by ${reviewerName}: ${notes || "Verified by staff"}`,
          status: "pending",
          reviewed_by: reviewerName,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        },
      ],
      { onConflict: "lost_report_id,found_report_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("createManualMatch error:", error);
    return null;
  }
  return data as Match;
}

// User Profiles
export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
  if (error) return null;
  return data as UserProfile;
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();
  if (error) return null;
  return data as UserProfile;
}

export async function updateUserProfile(
  userId: number,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("users")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("updateUserProfile error:", error);
    return null;
  }
  return data as UserProfile;
}

// Ownership Claims ("This Might Be Mine")
export async function createClaim(claimData: {
  report_id: number;
  claimant_id: number;
  claim_reason: string;
  identifying_details: string;
  additional_evidence?: string;
}): Promise<Claim | null> {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from("claims")
      .insert([claimData])
      .select("*, report:reports(*), claimant:users(*)")
      .single();

    if (error) {
      console.error("createClaim error:", error);
      return null;
    }
    return data as Claim;
  } catch (err) {
    console.error("createClaim exception:", err);
    return null;
  }
}

export async function getClaims(filter?: {
  claimantId?: number;
  reportId?: number;
  status?: string;
}): Promise<Claim[]> {
  const supabase = getAdminClient();
  try {
    let query = supabase
      .from("claims")
      .select("*, report:reports(*), claimant:users(*)")
      .order("created_at", { ascending: false });

    if (filter?.claimantId) query = query.eq("claimant_id", filter.claimantId);
    if (filter?.reportId) query = query.eq("report_id", filter.reportId);
    if (filter?.status && filter.status !== "all") query = query.eq("status", filter.status);

    const { data, error } = await query;
    if (error) {
      console.error("getClaims error:", error);
      return [];
    }
    return (data || []) as Claim[];
  } catch {
    return [];
  }
}

export async function updateClaimStatus(
  claimId: number,
  status: "approved" | "rejected" | "more_info_needed",
  reviewerName: string,
  staffNotes?: string
): Promise<boolean> {
  const supabase = getAdminClient();
  try {
    const { data: claim, error: fetchErr } = await supabase
      .from("claims")
      .select("*, report:reports(*), claimant:users(*)")
      .eq("id", claimId)
      .single();

    if (fetchErr || !claim) return false;

    const { error } = await supabase
      .from("claims")
      .update({
        status,
        reviewed_by: reviewerName,
        staff_notes: staffNotes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", claimId);

    if (error) return false;

    // If claim approved, update the found report status to matched/resolved
    if (status === "approved" && claim.report_id) {
      await supabase
        .from("reports")
        .update({ status: "matched" })
        .eq("id", claim.report_id);
    }

    return true;
  } catch {
    return false;
  }
}

// Notifications
export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  reportId?: number | null,
  matchId?: number | null
): Promise<boolean> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("notifications").insert([
    {
      user_id: userId,
      type,
      title,
      message,
      report_id: reportId || null,
      match_id: matchId || null,
    },
  ]);
  return !error;
}

export async function getNotifications(userId: number): Promise<Notification[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data as Notification[];
}

export async function markNotificationAsRead(id: number): Promise<boolean> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  return !error;
}

// Audit Logs
export async function logAuditEvent(
  actorName: string,
  action: string,
  targetType: string,
  targetId?: number | null,
  details?: string | null,
  actorId?: number | null
): Promise<void> {
  const supabase = getAdminClient();
  try {
    await supabase.from("audit_logs").insert([
      {
        actor_id: actorId || null,
        actor_name: actorName,
        action,
        target_type: targetType,
        target_id: targetId || null,
        details: details || null,
      },
    ]);
  } catch {
    // Non-blocking
  }
}
