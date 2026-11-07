import { GoogleGenAI } from "@google/genai";
import { AiAttributes } from "@/types/database";
import { EMBEDDING_DIMENSIONS } from "../matching/engine";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const GENERATION_MODEL = process.env.GENERATION_MODEL || "gemini-3.8-flash";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "gemini-embedding-2";

const ANALYSIS_PROMPT = `Analyse this image of a lost or found item. Extract the following attributes and return ONLY valid JSON with this exact structure:

{
    "category": "the most appropriate category for this item",
    "colors": ["list", "of", "main", "colors"],
    "material": "the material if visually identifiable, otherwise unknown",
    "brand_or_logo": "any visible brand name or logo text, otherwise unknown",
    "distinctive_features": ["list", "of", "notable", "features"],
    "condition": "brief description of item condition (e.g. good, worn, damaged)",
    "visual_description": "a concise one-sentence description of the item as seen in the image"
}

RULES:
- Return ONLY the JSON object, no Markdown backticks, no other text.
- For "material": only state what you can clearly see. If uncertain, return "unknown".
- For "brand_or_logo": only state text or logos you can clearly read/see. If uncertain, return "unknown".
- Do NOT invent, guess, or assume brands or materials you cannot visually verify.
- Keep "distinctive_features" to visually observable features only.
- Keep "visual_description" factual and under 30 words.
`;

export async function analyzeImage(imageBase64: string, mimeType = "image/jpeg"): Promise<AiAttributes | null> {
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: [
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
        ANALYSIS_PROMPT,
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    let raw = response.text?.trim() || "";
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```json|^```/i, "").replace(/```$/, "").trim();
    }
    return JSON.parse(raw) as AiAttributes;
  } catch (err) {
    console.error("AI analyzeImage error:", err);
    return null;
  }
}

export async function generateEmbedding(
  imageBase64: string,
  userDescription: string,
  aiAttributes?: AiAttributes | null,
  mimeType = "image/jpeg"
): Promise<number[] | null> {
  if (!ai) return null;
  try {
    const textParts: string[] = [];
    if (userDescription) textParts.push(userDescription.trim());

    if (aiAttributes) {
      if (aiAttributes.visual_description && aiAttributes.visual_description !== "unknown") {
        textParts.push(aiAttributes.visual_description);
      }
      if (aiAttributes.colors && Array.isArray(aiAttributes.colors)) {
        const c = aiAttributes.colors.filter((x: unknown) => x && x !== "unknown");
        if (c.length) textParts.push(`Colors: ${c.join(", ")}`);
      }
      if (aiAttributes.material && aiAttributes.material !== "unknown") {
        textParts.push(`Material: ${aiAttributes.material}`);
      }
      if (aiAttributes.brand_or_logo && aiAttributes.brand_or_logo !== "unknown") {
        textParts.push(`Brand: ${aiAttributes.brand_or_logo}`);
      }
      if (aiAttributes.distinctive_features && Array.isArray(aiAttributes.distinctive_features)) {
        const f = aiAttributes.distinctive_features.filter(Boolean);
        if (f.length) textParts.push(`Features: ${f.join(", ")}`);
      }
    }

    const combinedText = textParts.join(". ") || "Item photograph";

    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: [
        combinedText,
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ],
      config: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (values && values.length === EMBEDDING_DIMENSIONS) {
      let sumSq = 0;
      for (const v of values) sumSq += (v as number) * (v as number);
      const norm = Math.sqrt(sumSq);
      if (norm > 0) {
        return values.map((v: number) => v / norm);
      }
    }
    return null;
  } catch (err) {
    console.error("AI generateEmbedding error:", err);
    return null;
  }
}
