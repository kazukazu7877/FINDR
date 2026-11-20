/**
 * Resolves report image paths into valid, browser-renderable URLs.
 * Handles:
 * - Full URLs (https://...)
 * - Data URLs and Blob URLs
 * - Leading-slash local paths (/...)
 * - Supabase Storage relative paths (e.g. reports/...)
 */
export function formatImageUrl(path?: string | null): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // Supabase storage object path (e.g. reports/1794471374853_...jpg)
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://azjyyijcrqqqjbpifgcb.supabase.co";
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "findr-images";

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${trimmed}`;
}
