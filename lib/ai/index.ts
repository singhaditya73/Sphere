/**
 * Modular AI provider for the room companion.
 *
 * Uses any OpenAI-compatible chat-completions endpoint. It defaults to **Groq**
 * (fast, cheap, OpenAI-compatible) but stays provider-agnostic so a different
 * endpoint can be swapped in with environment variables alone:
 *
 *   AI_API_KEY     — required to enable the feature (alias: GROQ_API_KEY)
 *   AI_BASE_URL    — defaults to https://api.groq.com/openai/v1
 *   AI_MODEL       — defaults to openai/gpt-oss-20b
 *   AI_TIMEOUT_MS  — optional request timeout (defaults to 20000ms)
 *
 * When no API key is present, {@link getAiProvider} returns null and the API
 * reports the feature as unconfigured instead of failing.
 */

import {
  SUGGESTION_SYSTEM_PROMPT,
  parseSuggestionPlan,
  type SuggestionPlan,
} from "./parse.ts";

export { parseSuggestionPlan, sanitizeQueries, SUGGESTION_SYSTEM_PROMPT } from "./parse.ts";
export type { SuggestionPlan } from "./parse.ts";

type EnvLike = Record<string, string | undefined>;

/** Groq's OpenAI-compatible base URL. */
export const DEFAULT_AI_BASE_URL = "https://api.groq.com/openai/v1";
/** Fast, cheap production model that is well suited to short JSON responses. */
export const DEFAULT_AI_MODEL = "openai/gpt-oss-20b";
/** Generous enough for reasoning-capable models, still snappy on Groq's LPUs. */
export const DEFAULT_AI_TIMEOUT_MS = 20_000;

export interface AiProvider {
  readonly id: string;
  readonly model: string;
  suggest(input: { prompt: string; context?: string }): Promise<SuggestionPlan>;
}

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export function getAiConfig(env: EnvLike = process.env): AiConfig | null {
  const apiKey =
    env.AI_API_KEY?.trim() ||
    env.GROQ_API_KEY?.trim() ||
    env.GROK_API_KEY?.trim() ||
    env.XAI_API_KEY?.trim();
  if (!apiKey) return null;

  const parsedTimeout = Number.parseInt(env.AI_TIMEOUT_MS ?? "", 10);
  return {
    apiKey,
    baseUrl: (env.AI_BASE_URL?.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, ""),
    model: env.AI_MODEL?.trim() || DEFAULT_AI_MODEL,
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_AI_TIMEOUT_MS,
  };
}

export function isAiConfigured(env: EnvLike = process.env): boolean {
  return getAiConfig(env) !== null;
}

interface ProviderResponse {
  ok: boolean;
  status: number;
  payload: unknown;
}

class OpenAiCompatibleProvider implements AiProvider {
  readonly id = "openai-compatible";
  readonly model: string;
  private config: AiConfig;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;

  constructor(config: AiConfig, options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}) {
    this.config = config;
    this.model = config.model;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? config.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS;
  }

  /** POST to `/chat/completions`, reading the body within the request timeout. */
  private async post(body: Record<string, unknown>): Promise<ProviderResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, payload };
    } finally {
      clearTimeout(timer);
    }
  }

  async suggest(input: { prompt: string; context?: string }): Promise<SuggestionPlan> {
    const messages = [
      { role: "system", content: SUGGESTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: input.context ? `${input.prompt}\n\nRoom context: ${input.context}` : input.prompt,
      },
    ];

    const baseBody = {
      model: this.config.model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    };

    // Prefer structured JSON output. Not every model/provider accepts
    // `response_format`, so retry once without it — the system prompt plus the
    // tolerant parser are enough on their own.
    let result = await this.post({ ...baseBody, response_format: { type: "json_object" } });
    if (!result.ok && (result.status === 400 || result.status === 422)) {
      result = await this.post(baseBody);
    }
    if (!result.ok) {
      throw new Error(`AI provider responded with ${result.status}`);
    }

    const content = (result.payload as { choices?: Array<{ message?: { content?: unknown } }> })
      ?.choices?.[0]?.message?.content;
    const plan = typeof content === "string" ? parseSuggestionPlan(content) : null;
    if (!plan) throw new Error("AI provider returned an unusable response");
    return plan;
  }
}

/** Resolve the configured AI provider, or null when AI is not configured. */
export function getAiProvider(env: EnvLike = process.env): AiProvider | null {
  const config = getAiConfig(env);
  if (!config) return null;
  return new OpenAiCompatibleProvider(config);
}

/** Exposed for tests: build a provider against a mocked fetch. */
export function createAiProvider(
  config: AiConfig,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): AiProvider {
  return new OpenAiCompatibleProvider(config, options);
}
