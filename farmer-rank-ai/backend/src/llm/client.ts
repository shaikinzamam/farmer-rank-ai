import axios from "axios";
import CircuitBreaker from "opossum";
import { env, isLlmMocked } from "../config/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callGrok(messages: ChatMessage[], jsonMode: boolean): Promise<string> {
  const res = await axios.post(
    `${env.grok.baseUrl}/chat/completions`,
    {
      model: env.grok.model,
      messages,
      temperature: 0.2,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    },
    {
      headers: { Authorization: `Bearer ${env.grok.apiKey}`, "Content-Type": "application/json" },
      timeout: 10000,
    }
  );
  return res.data.choices[0].message.content as string;
}

async function callOpenAiFallback(messages: ChatMessage[], jsonMode: boolean): Promise<string> {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    },
    {
      headers: { Authorization: `Bearer ${env.openai.apiKey}`, "Content-Type": "application/json" },
      timeout: 10000,
    }
  );
  return res.data.choices[0].message.content as string;
}

// Circuit breaker protects against Grok downtime per the PRD's NFR ("circuit
// breakers for external LLM and Safety APIs"). On repeated failure it opens
// and requests go straight to the fallback provider without waiting to time out.
const grokBreaker = new CircuitBreaker(
  (messages: ChatMessage[], jsonMode: boolean) => callGrok(messages, jsonMode),
  { timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 15000 }
);
grokBreaker.fallback((messages: ChatMessage[], jsonMode: boolean) => callOpenAiFallback(messages, jsonMode));

/**
 * Central chat-completion entry point used by every Mastra agent.
 * Falls back to a deterministic mock when no LLM credentials are configured
 * at all, so the full agent pipeline can be demoed without live API keys.
 */
export async function chatComplete(messages: ChatMessage[], opts: { jsonMode?: boolean; mockResponder?: (messages: ChatMessage[]) => string } = {}): Promise<string> {
  if (isLlmMocked()) {
    if (!opts.mockResponder) {
      throw new Error("LLM is not configured (no GROK_API_KEY/OPENAI_API_KEY) and no mockResponder was supplied.");
    }
    return opts.mockResponder(messages);
  }

  if (env.grok.apiKey) {
    return grokBreaker.fire(messages, !!opts.jsonMode) as Promise<string>;
  }
  return callOpenAiFallback(messages, !!opts.jsonMode);
}
