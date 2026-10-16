/**
 * Modular AI provider for the room companion.
 *
 * Uses any OpenAI-compatible chat-completions endpoint, configured entirely via
 * environment variables so Sphere never hard-codes a paid dependency:
 *
 *   AI_API_KEY   — required to enable the feature
 *   AI_BASE_URL  — defaults to https://api.openai.com/v1
 *   AI_MODEL     — defaults to gpt-4o-mini
 *
 * When `AI_API_KEY` is absent, {@link getAiProvider} returns null and the API
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

export interface AiProvider {
  readonly id: string;
  readonly model: string;
  suggest(input: { prompt: string; context?: string }): Promise<SuggestionPlan>;
}

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getAiConfig(env: EnvLike = process.env): AiConfig | null {
  const apiKey = env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model: env.AI_MODEL?.trim() || "gpt-4o-mini",
  };
}

export function isAiConfigured(env: EnvLike = process.env): boolean {
  return getAiConfig(env) !== null;
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
    this.timeoutMs = options.timeoutMs ?? 12_000;
  }

  async suggest(input: { prompt: string; context?: string }): Promise<SuggestionPlan> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const messages = [
        { role: "system", content: SUGGESTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: input.context ? `${input.prompt}\n\nRoom context: ${input.context}` : input.prompt,
        },
      ];

      const response = await this.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: 0.7,
          max_tokens: 300,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI provider responded with ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = payload?.choices?.[0]?.message?.content;
      const plan = typeof content === "string" ? parseSuggestionPlan(content) : null;
      if (!plan) throw new Error("AI provider returned an unusable response");
      return plan;
    } finally {
      clearTimeout(timer);
    }
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
