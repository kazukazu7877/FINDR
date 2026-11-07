export const WEIGHT_EMBEDDING = 0.65;
export const WEIGHT_ATTRIBUTE = 0.25;
export const WEIGHT_LOCATION = 0.10;
export const MATCH_THRESHOLD = 0.30;
export const MAX_MATCHES = 10;
export const EMBEDDING_DIMENSIONS = 768;

export const LOCATION_STOPWORDS = new Set([
  "the", "a", "an", "at", "in", "on", "of", "near", "by", "and", "or",
  "to", "from", "floor", "level", "building", "block", "hall", "room",
  "area", "entrance", "exit", "gate", "-", "–", "/", "\\", ",", ".",
]);

export const FEATURE_STOPWORDS = new Set([
  "the", "a", "an", "with", "and", "or", "is", "has", "on", "in", "of",
  "to", "for", "by", "at", "from", "its", "it", "very", "small", "large",
]);

export interface MatchScoreResult {
  finalScore: number;
  embeddingScore: number | null;
  attributeScore: number | null;
  locationScore: number | null;
  explanation: string;
  effectiveWeights: Record<string, number>;
  details: Record<string, unknown>;
}

export function isValidVector(vec: unknown, expectedDims = EMBEDDING_DIMENSIONS): vec is number[] {
  if (!Array.isArray(vec)) return false;
  if (vec.length !== expectedDims) return false;
  let sumSq = 0;
  for (const val of vec) {
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) return false;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  return norm > 0 && isFinite(norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  const raw = dot / denom;
  return Math.max(0, Math.min(1, raw));
}

function isUnknown(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return ["", "unknown", "none", "n/a", "null", "unspecified"].includes(v);
  }
  if (Array.isArray(val)) {
    const clean = val.filter((item) => !isUnknown(item));
    return clean.length === 0;
  }
  return false;
}

export function compareAttributes(
  attrsA?: Record<string, unknown> | null,
  attrsB?: Record<string, unknown> | null
): { score: number | null; details: Record<string, unknown> } {
  if (!attrsA || !attrsB || typeof attrsA !== "object" || typeof attrsB !== "object") {
    return { score: null, details: { available: false, note: "Attributes unavailable" } };
  }

  const matches: Record<string, unknown> = {};
  let totalWeight = 0;
  let weightedScore = 0;

  // 1. Color (weight: 3.0)
  const rawColA = attrsA.colors || attrsA.color;
  const rawColB = attrsB.colors || attrsB.color;
  if (!isUnknown(rawColA) && !isUnknown(rawColB)) {
    const listA = Array.isArray(rawColA) ? rawColA : [rawColA];
    const listB = Array.isArray(rawColB) ? rawColB : [rawColB];
    const setA = new Set(listA.map((c) => String(c).trim().toLowerCase()).filter((c) => !isUnknown(c)));
    const setB = new Set(listB.map((c) => String(c).trim().toLowerCase()).filter((c) => !isUnknown(c)));
    if (setA.size > 0 && setB.size > 0) {
      const weight = 3.0;
      totalWeight += weight;
      const common = [...setA].filter((x) => setB.has(x));
      const union = new Set([...setA, ...setB]);
      const cScore = union.size > 0 ? common.length / union.size : 0;
      weightedScore += weight * cScore;
      matches.color = { match: cScore > 0, score: cScore, common };
    } else {
      matches.color = { match: null, note: "Colors unknown" };
    }
  } else {
    matches.color = { match: null, note: "Colors unknown" };
  }

  // 2. Material (weight: 2.0)
  const matA = attrsA.material;
  const matB = attrsB.material;
  if (!isUnknown(matA) && !isUnknown(matB)) {
    const strA = String(matA).trim().toLowerCase();
    const strB = String(matB).trim().toLowerCase();
    const weight = 2.0;
    totalWeight += weight;
    let mScore = 0;
    if (strA === strB) mScore = 1.0;
    else if (strA.includes(strB) || strB.includes(strA)) mScore = 0.8;
    weightedScore += weight * mScore;
    matches.material = { match: mScore > 0, score: mScore, source: strA, candidate: strB };
  } else {
    matches.material = { match: null, note: "Material unknown" };
  }

  // 3. Brand or Logo (weight: 3.0)
  const brandA = attrsA.brand_or_logo || attrsA.brand;
  const brandB = attrsB.brand_or_logo || attrsB.brand;
  if (!isUnknown(brandA) && !isUnknown(brandB)) {
    const strA = String(brandA).trim().toLowerCase();
    const strB = String(brandB).trim().toLowerCase();
    const weight = 3.0;
    totalWeight += weight;
    let bScore = 0;
    if (strA === strB) bScore = 1.0;
    else if (strA.includes(strB) || strB.includes(strA)) bScore = 0.8;
    weightedScore += weight * bScore;
    matches.brand = { match: bScore > 0, score: bScore, source: strA, candidate: strB };
  } else {
    matches.brand = { match: null, note: "Brand unknown" };
  }

  // 4. Distinctive Features (weight: 2.0)
  const featsA = attrsA.distinctive_features;
  const featsB = attrsB.distinctive_features;
  if (!isUnknown(featsA) && !isUnknown(featsB)) {
    const extractTokens = (raw: unknown) => {
      const tokens = new Set<string>();
      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        const words = String(item).toLowerCase().match(/[a-z0-9]{2,}/g) || [];
        for (const w of words) {
          if (!FEATURE_STOPWORDS.has(w)) tokens.add(w);
        }
      }
      return tokens;
    };
    const tokA = extractTokens(featsA);
    const tokB = extractTokens(featsB);
    if (tokA.size > 0 && tokB.size > 0) {
      const weight = 2.0;
      totalWeight += weight;
      const common = [...tokA].filter((x) => tokB.has(x));
      const union = new Set([...tokA, ...tokB]);
      const fScore = union.size > 0 ? common.length / union.size : 0;
      weightedScore += weight * fScore;
      matches.features = { match: fScore > 0, score: fScore, common };
    } else {
      matches.features = { match: null, note: "No distinctive feature tokens" };
    }
  } else {
    matches.features = { match: null, note: "Features unknown" };
  }

  if (totalWeight === 0) {
    return { score: null, details: { available: false, matches } };
  }

  return {
    score: weightedScore / totalWeight,
    details: { available: true, matches, evaluatedWeight: totalWeight },
  };
}

export function compareLocation(
  locA?: string | null,
  locB?: string | null
): { score: number | null; summary: string } {
  if (!locA || !locB || isUnknown(locA) || isUnknown(locB)) {
    return { score: null, summary: "Location information incomplete or unspecified" };
  }

  const tok = (str: string) => {
    const words = str.toLowerCase().match(/[a-z0-9]{2,}/g) || [];
    return new Set(words.filter((w) => !LOCATION_STOPWORDS.has(w)));
  };

  const tokA = tok(locA);
  const tokB = tok(locB);

  if (tokA.size === 0 || tokB.size === 0) {
    return { score: null, summary: "Location keywords unspecified" };
  }

  const common = [...tokA].filter((x) => tokB.has(x));
  const union = new Set([...tokA, ...tokB]);
  const score = union.size > 0 ? common.length / union.size : 0;
  const summary = common.length > 0
    ? `Shared location keywords: ${common.join(", ")}`
    : `Different locations (${locA.trim()} vs ${locB.trim()})`;

  return { score, summary };
}

export function computeCompositeScore(
  embScore: number | null,
  attrScore: number | null,
  locScore: number | null
): { finalScore: number; effectiveWeights: Record<string, number> } {
  const candidates = [
    { name: "embedding", baseWeight: WEIGHT_EMBEDDING, score: embScore },
    { name: "attribute", baseWeight: WEIGHT_ATTRIBUTE, score: attrScore },
    { name: "location", baseWeight: WEIGHT_LOCATION, score: locScore },
  ];

  const available = candidates.filter((c) => c.score !== null);
  const totalAvailable = available.reduce((acc, c) => acc + c.baseWeight, 0);

  if (totalAvailable <= 0) {
    return { finalScore: 0, effectiveWeights: { embedding: 0, attribute: 0, location: 0 } };
  }

  const effectiveWeights: Record<string, number> = {};
  let finalScore = 0;

  for (const c of candidates) {
    if (c.score !== null) {
      const normW = c.baseWeight / totalAvailable;
      effectiveWeights[c.name] = normW;
      finalScore += normW * c.score;
    } else {
      effectiveWeights[c.name] = 0;
    }
  }

  return {
    finalScore: Math.max(0, Math.min(1, finalScore)),
    effectiveWeights,
  };
}

export function buildMatchExplanation(
  finalScore: number,
  embScore: number | null,
  attrScore: number | null,
  locScore: number | null,
  effectiveWeights: Record<string, number>,
  locSummary: string
): string {
  const pct = (s: number | null) => (s !== null ? `${Math.round(s * 100)}%` : "N/A");
  const wtPct = (k: string) => `${Math.round((effectiveWeights[k] || 0) * 100)}%`;

  const lines: string[] = [
    `Similarity Score: ${pct(finalScore)}`,
    "----------------------------------------",
  ];

  if (embScore !== null) {
    lines.push(`• Multimodal Similarity (Image + Text): ${pct(embScore)} [Weight: ${wtPct("embedding")}]`);
  } else {
    lines.push("• Multimodal Similarity: Unavailable (weight redistributed)");
  }

  if (attrScore !== null) {
    lines.push(`• Visual Attributes: ${pct(attrScore)} [Weight: ${wtPct("attribute")}]`);
  } else {
    lines.push("• Visual Attributes: Incomplete/Unknown (weight redistributed)");
  }

  if (locScore !== null) {
    lines.push(`• Location Context: ${pct(locScore)} [Weight: ${wtPct("location")}] — ${locSummary}`);
  } else {
    lines.push("• Location Context: Incomplete/Unspecified (weight redistributed)");
  }

  lines.push("");
  lines.push(
    "Notice: This score reflects estimated visual and contextual similarity, " +
    "not confirmed ownership. Physical verification is required before confirming a match."
  );

  return lines.join("\n");
}

