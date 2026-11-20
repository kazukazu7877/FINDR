import { NextRequest, NextResponse } from "next/server";
import { createReport, getReports, logAuditEvent } from "@/lib/db/queries";
import { uploadReportImage } from "@/lib/storage/supabase";
import { analyzeImage, generateEmbedding } from "@/lib/ai/gemini";
import {
  compareAttributes,
  compareLocation,
  computeCompositeScore,
  buildMatchExplanation,
  MATCH_THRESHOLD,
  MAX_MATCHES,
} from "@/lib/matching/engine";
import { getAdminClient } from "@/lib/supabase/admin";
import { dispatchNotification } from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const userId = searchParams.get("userId") ? parseInt(searchParams.get("userId")!, 10) : undefined;
    const publicView = searchParams.get("public") === "true";

    const reports = await getReports({ type, category, status, userId, publicView });
    return NextResponse.json({ reports });
  } catch (err: unknown) {
    console.error("GET /api/reports error:", err);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const location = formData.get("location") as string;
    const brand = (formData.get("brand") as string) || null;
    const color = (formData.get("color") as string) || null;
    const distinctive_features = (formData.get("distinctive_features") as string) || null;
    const distinctive_secret = (formData.get("distinctive_secret") as string) || null;
    const date_lost_found = (formData.get("date_lost_found") as string) || null;
    const contact_info = (formData.get("contact_info") as string) || null;
    const userIdStr = formData.get("user_id") as string | null;
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;
    const image = formData.get("image") as File | null;

    if (!type || !title || !description || !category || !location) {
      return NextResponse.json({ error: "Missing required fields (type, title, description, category, location)" }, { status: 400 });
    }

    let imagePath: string | null = null;
    let aiAttributes: Record<string, unknown> | null = null;
    let embedding: number[] | null = null;

    // Process image with Gemini if provided
    if (image && image.size > 0) {
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mimeType = image.type || "image/jpeg";

        // 1. Upload to Supabase storage
        imagePath = await uploadReportImage(buffer, image.name, mimeType);

        // 2. Structured attribute extraction with Gemini Vision
        aiAttributes = await analyzeImage(base64, mimeType);

        // 3. Multimodal embedding with Gemini Embedding 2
        embedding = await generateEmbedding(base64, description, aiAttributes, mimeType);
      } catch (imgErr) {
        console.error("AI image processing warning:", imgErr);
        // Graceful continuation even if AI API limits or network hiccup
      }
    }

    // Insert Report record
    const report = await createReport({
      user_id: userId,
      type: type as "lost" | "found",
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      location: location.trim(),
      brand: brand ? brand.trim() : null,
      color: color ? color.trim() : null,
      distinctive_features: distinctive_features ? distinctive_features.trim() : null,
      distinctive_secret: distinctive_secret ? distinctive_secret.trim() : null,
      date_lost_found: date_lost_found || new Date().toISOString().split("T")[0],
      contact_info: contact_info || null,
      image_path: imagePath,
      ai_attributes: aiAttributes,
      embedding,
      status: "active",
    });

    if (!report) {
      return NextResponse.json({ error: "Failed to create report record" }, { status: 500 });
    }

    // Trigger AI Matching Pipeline asynchronously against opposite-type reports in the same category
    const oppositeType = type === "lost" ? "found" : "lost";
    const candidates = await getReports({
      type: oppositeType,
      category,
      status: "active",
    });

    const supabase = getAdminClient();
    const candidateMatches = [];

    for (const cand of candidates) {
      if (cand.id === report.id) continue;

      let embScore: number | null = null;
      if (report.embedding && cand.embedding) {
        let dot = 0;
        for (let i = 0; i < report.embedding.length; i++) {
          dot += report.embedding[i] * cand.embedding[i];
        }
        embScore = Math.max(0, Math.min(1, dot));
      }

      const { score: attrScore } = compareAttributes(
        report.ai_attributes as Record<string, unknown>,
        cand.ai_attributes as Record<string, unknown>
      );

      const { score: locScore, summary: locSummary } = compareLocation(
        report.location,
        cand.location
      );

      const { finalScore, effectiveWeights } = computeCompositeScore(
        embScore,
        attrScore,
        locScore
      );

      if (finalScore >= MATCH_THRESHOLD) {
        const explanation = buildMatchExplanation(
          finalScore,
          embScore,
          attrScore,
          locScore,
          effectiveWeights,
          locSummary
        );

        const lostId = type === "lost" ? report.id : cand.id;
        const foundId = type === "found" ? report.id : cand.id;

        candidateMatches.push({
          lost_report_id: lostId,
          found_report_id: foundId,
          matching_method: "ai",
          similarity_score: finalScore,
          embedding_score: embScore,
          attribute_score: attrScore,
          location_score: locScore,
          explanation,
          status: "pending",
        });
      }
    }

    candidateMatches.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    const topMatches = candidateMatches.slice(0, MAX_MATCHES);

    for (const m of topMatches) {
      await supabase.from("matches").upsert([m], { onConflict: "lost_report_id,found_report_id" });
    }

    // Audit log
    await logAuditEvent(
      userId ? `User #${userId}` : "Anonymous Reporter",
      `Reported ${type.toUpperCase()} Item`,
      "report",
      report.id,
      `Title: "${report.title}", Category: ${report.category}, Matches found: ${topMatches.length}`,
      userId
    );

    // Confirmation notification to reporter
    if (userId) {
      await dispatchNotification({
        userId,
        type: "system",
        title: `${type === "lost" ? "Lost" : "Found"} Report Submitted`,
        message: `Your report for "${report.title}" (Ref #FNDR-${type[0].toUpperCase()}-${report.id}) has been recorded. FINDR AI is scanning campus records for potential matches.`,
        reportId: report.id,
      });
    }

    return NextResponse.json({
      success: true,
      report,
      matchesGenerated: topMatches.length,
    });
  } catch (err: unknown) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: "Internal report submission error" }, { status: 500 });
  }
}
