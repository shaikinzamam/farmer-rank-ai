import { createOpenAI } from "@ai-sdk/openai";
import { env, isLlmMocked } from "../config/env";

/**
 * Mastra's `Agent` class expects a Vercel AI SDK model object. Grok (xAI)
 * exposes an OpenAI-compatible /chat/completions API, so we point the
 * OpenAI provider factory at Grok's base URL. This is what lets every
 * `new Agent({ model: getModel() })` in this project actually call Grok.
 *
 * NOTE: The agents in this codebase call `chatComplete()` from
 * `src/llm/client.ts` directly for their core reasoning (so we control the
 * circuit-breaker/fallback/mock behavior precisely). `getModel()` is provided
 * so each Agent is still a fully valid, independently invokable Mastra
 * primitive (e.g. for `agent.generate()` / `agent.stream()` calls from
 * Mastra tooling, playground, or workflow steps) — both paths hit the same
 * underlying Grok deployment.
 */
export function getModel() {
  if (isLlmMocked()) {
    // Mastra still needs *a* model reference even in mock mode; agents in
    // this project don't call agent.generate() when mocked, they call
    // chatComplete() with a mockResponder instead. This provider is never
    // actually invoked in that mode.
    return createOpenAI({ apiKey: "mock-key" })("gpt-4o-mini");
  }

  if (env.llmProvider === "featherless" && env.featherless.apiKey) {
    const featherlessProvider = createOpenAI({
      apiKey: env.featherless.apiKey,
      baseURL: env.featherless.baseUrl,
    });
    return featherlessProvider(env.featherless.model);
  }

  if (env.grok.apiKey) {
    const grokProvider = createOpenAI({
      apiKey: env.grok.apiKey,
      baseURL: env.grok.baseUrl,
    });
    return grokProvider(env.grok.model);
  }

  const openaiProvider = createOpenAI({ apiKey: env.openai.apiKey });
  return openaiProvider("gpt-4o-mini");
}
