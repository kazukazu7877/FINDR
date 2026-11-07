export type UserRole = "student" | "staff" | "supervisor";

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  academic_year: string;
  branch: string;
  section: string;
  phone?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type ReportType = "lost" | "found";
export type ReportStatus = "active" | "matched" | "resolved" | "withdrawn" | "investigating";

export interface AiAttributes {
  category?: string;
  colors?: string[];
  material?: string;
  brand_or_logo?: string;
  distinctive_features?: string[];
  condition?: string;
  visual_description?: string;
  [key: string]: unknown;
}

export interface Report {
  id: number;
  user_id?: number | null;
  type: ReportType;
  title: string;
  description: string;
  category: string;
  location: string;
  brand?: string | null;
  color?: string | null;
  distinctive_features?: string | null;
  distinctive_secret?: string | null;
  date_lost_found?: string | null;
  image_path?: string | null;
  ai_attributes?: AiAttributes | null;
  embedding?: number[] | null;
  status: ReportStatus;
  created_at: string;
  contact_info?: string | null;
}

export type MatchStatus = "pending" | "confirmed" | "dismissed" | "investigating";
export type MatchingMethod = "ai" | "manual";

export interface Match {
  id: number;
  lost_report_id: number;
  found_report_id: number;
  matching_method: MatchingMethod;
  similarity_score?: number | null;
  embedding_score?: number | null;
  attribute_score?: number | null;
  location_score?: number | null;
  explanation?: string | null;
  status: MatchStatus;
  reviewed_by?: string | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  lost_report?: Report;
  found_report?: Report;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  report_id?: number | null;
  match_id?: number | null;
  is_read: boolean;
  created_at: string;
}

export interface CaseNote {
  id: number;
  report_id: number;
  match_id?: number | null;
  author_id?: number | null;
  author_name: string;
  note: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_id?: number | null;
  actor_name: string;
  action: string;
  target_type: string;
  target_id?: number | null;
  details?: string | null;
  created_at: string;
}

