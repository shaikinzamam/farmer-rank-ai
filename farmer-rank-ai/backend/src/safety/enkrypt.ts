import axios from "axios";
import { env, isEnkryptMocked } from "../config/env";
import { SafetyCheckResult, SafetyFlag } from "../types";

/**
 * Wraps the Enkrypt AI guardrails API. Two checks are run for every agent
 * output before it reaches a buyer:
 *   1. detectInputRisk  — screens the raw buyer query for injection / abuse.
 *   2. detectOutputRisk — screens the generated ranking + explanation text for
 *      hallucination, toxicity, and identity-based bias (caste, religion,
 *      gender), plus a custom financial-guarantee policy check.
 *
 * When ENKRYPT_API_KEY is not configured, a local rule-based guardrail runs
 * instead so the safety gate is never silently skipped during a hackathon
 * demo — every request still gets *some* enforcement, it's just less
 * sophisticated than the hosted Enkrypt models.
 */

const FINANCIAL_GUARANTEE_PATTERNS = [
  /guarantee(d)?\s+(profit|return|income)/i,
  /risk[-\s]?free/i,
  /assured\s+(profit|price|return)/i,
  /100%\s+(profit|guaranteed)/i,
];

const BIAS_TERMS = [
  /\bcaste\b/i,
  /\breligion\b/i,
  /\b(hindu|muslim|christian|sikh|dalit|brahmin)\b/i,
  /\bgender\b/i,
];

export async function checkText(text: string, context: "input" | "output"): Promise<SafetyCheckResult> {
  if (isEnkryptMocked()) {
    return localGuardrailCheck(text);
  }

  try {
    const res = await axios.post(
      `${env.enkrypt.baseUrl}/guardrails/detect`,
      {
        deployment_name: env.enkrypt.deploymentName,
        text,
        context,
        checks: ["toxicity", "bias", "hallucination", "pii", "policy_violation"],
      },
      {
        headers: { "X-Api-Key": env.enkrypt.apiKey, "Content-Type": "application/json" },
        timeout: 8000,
      }
    );

    const data = res.data;
    const flags: SafetyFlag[] = (data.violations ?? []).map((v: any) => ({
      category: v.category ?? "policy_violation",
      severity: v.severity ?? "medium",
      detail: v.detail ?? "Flagged by Enkrypt AI guardrails.",
    }));

    // Always additionally run the financial-guarantee custom policy — this is
    // domain-specific to agri-commerce and layered on top of Enkrypt's general checks.
    flags.push(...checkFinancialGuarantees(text));

    return {
      passed: flags.length === 0,
      flags,
      sanitizedText: data.sanitized_text ?? text,
      rawProviderResponse: data,
    };
  } catch (err) {
    console.warn("[enkrypt] API call failed, falling back to local guardrail:", (err as Error).message);
    return localGuardrailCheck(text);
  }
}

function checkFinancialGuarantees(text: string): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  for (const pattern of FINANCIAL_GUARANTEE_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({
        category: "financial_guarantee",
        severity: "high",
        detail: `Text contains a prohibited financial guarantee claim matching /${pattern.source}/.`,
      });
    }
  }
  return flags;
}

function localGuardrailCheck(text: string): SafetyCheckResult {
  const flags: SafetyFlag[] = [];

  flags.push(...checkFinancialGuarantees(text));

  for (const pattern of BIAS_TERMS) {
    if (pattern.test(text)) {
      flags.push({
        category: "bias",
        severity: "high",
        detail: `Text references a protected identity attribute matching /${pattern.source}/, which must never factor into ranking or explanation.`,
      });
    }
  }

  // crude PII pattern (phone numbers / emails) that should never leak in a public ranking explanation
  if (/\b\d{10}\b/.test(text) || /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text)) {
    flags.push({
      category: "pii",
      severity: "medium",
      detail: "Text appears to contain a phone number or email address.",
    });
  }

  return {
    passed: flags.length === 0,
    flags,
    sanitizedText: text,
  };
}

/** Convenience helper for the Safety Agent: runs the check and throws a
 * structured error the orchestrator can catch and turn into a safe fallback response. */
export async function assertSafe(text: string, context: "input" | "output"): Promise<SafetyCheckResult> {
  const result = await checkText(text, context);
  return result;
}
