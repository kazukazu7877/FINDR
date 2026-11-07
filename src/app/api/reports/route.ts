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
    const image = formData.get("image") as File | null;

    if (!type || !title || !description || !category || !location) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let imagePath: string | null = null;
    let aiAttributes: Record<string, unknown> | null = null;
    let embedding: number[] | null = null;

    if (image && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mimeType = image.type || "image/jpeg";

      // 1. Upload to storage
      imagePath = await uploadReportImage(buffer, image.name, mimeType);

      // 2. Structured attribute extraction
      aiAttributes = await analyzeImage(base64, mimeType);

      // 3. Multimodal embedding
      embedding = await generateEmbedding(base64, description, aiAttributes, mimeType);
    }

    // Insert Report
    const report = await createReport({
      type: type as "lost" | "found",
      title,
      description,
      category,
      location,
      brand,
      color,
      distinctive_features,
      distinctive_secret,
      date_lost_found,
      contact_info,
      image_path: imagePath,
      ai_attributes: aiAttributes,
      embedding,
      status: "active",
    });

    if (!report) {
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }

    // Trigger AI Matching Pipeline asynchronously against opposite reports
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
        // Dot product of normalized vectors
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

    candidateMatches.sort((a, b) => b.similarity_score - a.similarity_score);
    const topMatches = candidateMatches.slice(0, MAX_MATCHES);

    for (const m of topMatches) {
      await supabase.from("matches").upsert([m], { onConflict: "lost_report_id,found_report_id" });
    }

    await logAuditEvent("System / User", "Create Report", "report", report.id, `Created ${type} report: ${title}`);

    return NextResponse.json({ success: true, report, matchesFound: topMatches.length });
  } catch (err: unknown) {
    console.error("API /reports error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || undefined;
  const category = searchParams.get("category") || undefined;
  const status = searchParams.get("status") || undefined;

  const reports = await getReports({ type, category, status });
  return NextResponse.json({ reports });
}

