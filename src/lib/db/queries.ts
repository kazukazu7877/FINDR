import { getAdminClient } from "@/lib/supabase/admin";
import { Report, Match, Notification, AuditLog, CaseNote } from "@/types/database";

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
}): Promise<Report[]> {
  const supabase = getAdminClient();
  let query = supabase.from("reports").select("*").order("created_at", { ascending: false });

  if (filter?.type) query = query.eq("type", filter.type);
  if (filter?.category) query = query.eq("category", filter.category);
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.userId) query = query.eq("user_id", filter.userId);

  const { data, error } = await query;
  if (error) {
    console.error("getReports error:", error);
    return [];
  }
  return data as Report[];
}

export async function getReportById(id: number): Promise<Report | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.from("reports").select("*").eq("id", id).single();
  if (error) return null;
  return data as Report;
}

export async function updateReportStatus(id: number, status: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  return !error;
}

export async function getMatches(filter?: { status?: string }): Promise<Match[]> {
  const supabase = getAdminClient();
  let query = supabase
    .from("matches")
    .select(`
      *,
      lost_report:reports!matches_lost_report_id_fkey(*),
      found_report:reports!matches_found_report_id_fkey(*)
    `)
    .order("created_at", { ascending: false });

  if (filter?.status) query = query.eq("status", filter.status);

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

  // 1. Get match record
  const { data: match, error: fetchErr } = await supabase
    .from("matches")
    .select("lost_report_id, found_report_id")
    .eq("id", matchId)
    .single();

  if (fetchErr || !match) return false;

  // 2. Update match status
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

  // 3. Mark both reports as 'matched'
  await supabase
    .from("reports")
    .update({ status: "matched" })
    .in("id", [match.lost_report_id, match.found_report_id]);

  return true;
}

export async function dismissMatch(matchId: number, reviewerName: string, notes?: string): Promise<boolean> {
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

export async function logAuditEvent(
  actorName: string,
  action: string,
  targetType: string,
  targetId?: number | null,
  details?: string | null,
  actorId?: number | null
): Promise<void> {
  const supabase = getAdminClient();
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
}

