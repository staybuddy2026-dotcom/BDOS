import { logger } from '@/lib/logger';

/**
 * One way to call Gemini for the whole app. The configured model (GEMINI_MODEL) is tried first; when it
 * is overloaded, rate limited, unknown or slow, the next model is tried. Busy models are skipped for a
 * while. When every model fails, AiUnavailableError is thrown: callers show that, they never invent output.
 */

// The newest models are often overloaded (503); the lite models usually answer in a few seconds.
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];
// Overloaded or slow: skip for a few minutes. Out of quota: an hour. Unknown model: a day.
const COOLDOWN_MS: Record<number, number> = { 503: 2 * 60 * 1000, 500: 2 * 60 * 1000, 429: 60 * 60 * 1000, 404: 24 * 60 * 60 * 1000 };
const cooldownUntil = new Map<string, number>();

export class AiUnavailableError extends Error {
  constructor(message = 'The AI service is busy or unavailable right now. Please try again in a minute.') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export const hasGeminiKey = () => !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY);

function modelChain(): string[] {
  const extra = (process.env.GEMINI_FALLBACK_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean);
  const chain = [...new Set([process.env.GEMINI_MODEL || FALLBACK_MODELS[0], ...(extra.length ? extra : FALLBACK_MODELS)])];
  const ready = chain.filter((m) => (cooldownUntil.get(m) || 0) <= Date.now());
  return ready.length ? ready : chain;
}

export type GeminiResult = { text: string; model: string; promptTokens: number; completionTokens: number };

/**
 * Sends a generateContent request body (contents, generationConfig...) and returns the first candidate's text,
 * with any ```json fences removed.
 */
export async function geminiGenerate(body: Record<string, unknown>, options: { label?: string; timeoutMs?: number } = {}): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) throw new AiUnavailableError('AI is not set up: add GEMINI_API_KEY to the server settings.');
  const payload = JSON.stringify(body);
  let lastError: unknown;

  for (const model of modelChain()) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
      });
      if (!response.ok) {
        if (COOLDOWN_MS[response.status]) cooldownUntil.set(model, Date.now() + COOLDOWN_MS[response.status]);
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('empty answer');
      return {
        text: String(text).trim().replace(/^```(?:json)?\s*|\s*```$/g, ''),
        model,
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      };
    } catch (err) {
      lastError = err;
      // A model that hangs is as unavailable as one that says 503: skip it for a while.
      if (err instanceof Error && /timeout|abort/i.test(err.name + err.message)) cooldownUntil.set(model, Date.now() + COOLDOWN_MS[503]);
      logger.warn(`Gemini ${model} unavailable${options.label ? ` (${options.label})` : ''}, trying the next model`, { error: String(err) });
    }
  }
  logger.error(`Every Gemini model failed${options.label ? ` (${options.label})` : ''}`, { error: String(lastError) });
  throw new AiUnavailableError();
}
