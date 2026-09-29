import "server-only";
import OpenAI from "openai";
import { env } from "@/lib/env";

let client: OpenAI | null = null;
export function openai() {
  if (!client) client = new OpenAI({ apiKey: env.openaiKey(), maxRetries: 1, timeout: 45_000 });
  return client;
}

/** Reasoning-style models reject temperature; keep params compatible with both families. */
export function isReasoningModel(model: string) {
  return /^(o\d|gpt-5|gpt-6)/.test(model);
}
