/**
 * Pure helpers for the AI room companion.
 *
 * The model only ever proposes *search queries* and a short blurb. Sphere then
 * runs those queries against the real music provider, so no media id, URL or
 * availability is ever invented by the model.
 */

export interface SuggestionPlan {
  intro: string;
  queries: string[];
}

const MAX_QUERIES = 4;

/** Keep only non-empty, reasonably-sized, de-duplicated query strings. */
export function sanitizeQueries(input: unknown, max = MAX_QUERIES): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const value = raw.replace(/\s+/g, " ").trim().slice(0, 80);
    if (value.length < 2) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Parse a model response into a {@link SuggestionPlan}.
 *
 * Tolerates code fences and surrounding prose by extracting the first JSON
 * object. Returns null when nothing usable is present.
 */
export function parseSuggestionPlan(text: string): SuggestionPlan | null {
  if (typeof text !== "string") return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }

  const record = parsed as { intro?: unknown; queries?: unknown };
  const queries = sanitizeQueries(record.queries);
  if (queries.length === 0) return null;

  const intro = typeof record.intro === "string" ? record.intro.trim().slice(0, 200) : "";
  return { intro, queries };
}

/** The system prompt that constrains the model to queries only. */
export const SUGGESTION_SYSTEM_PROMPT = [
  "You are Sphere's music/video discovery assistant.",
  "Given a room request, reply with JSON only: {\"intro\": string, \"queries\": string[]}.",
  "Each query is a short search phrase (2-6 words) for a media search API.",
  "Provide 2-4 diverse queries mixing familiar hits and fresh discoveries.",
  "Never invent URLs, media ids, artists that do not exist, or availability.",
  "Do not include markdown or any text outside the JSON object.",
].join(" ");
