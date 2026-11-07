import { getAdminClient } from "@/lib/supabase/admin";

export async function uploadReportImage(
  fileBuffer: Buffer,
  fileName: string,
  contentType = "image/jpeg"
): Promise<string | null> {
  try {
    const supabase = getAdminClient();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "findr-images";
    const objectPath = `reports/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;

    const { error } = await supabase.storage.from(bucket).upload(objectPath, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }
    return objectPath;
  } catch (err) {
    console.error("uploadReportImage error:", err);
    return null;
  }
}

export async function getSignedImageUrl(objectPath: string, expiresIn = 3600): Promise<string | null> {
  try {
    if (!objectPath) return null;
    if (objectPath.startsWith("http://") || objectPath.startsWith("https://")) {
      return objectPath;
    }

    const supabase = getAdminClient();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "findr-images";

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresIn);

    if (error || !data) {
      console.error("createSignedUrl error:", error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error("getSignedImageUrl error:", err);
    return null;
  }
}

