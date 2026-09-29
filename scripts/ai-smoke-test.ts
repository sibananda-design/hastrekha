/**
 * Smoke test for the AI pipeline (no auth / DB). Run with:
 *   npx tsx --env-file=.env.local scripts/ai-smoke-test.ts <palm.jpg> [not-a-palm.jpg]
 */
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { READING_SYSTEM_PROMPT, readingUserPrompt, CHAT_SYSTEM_PROMPT, chatContext } from "../src/lib/prompts";
import { readingSchema, validitySchema, zodiacFromDob, ageFromDob } from "../src/lib/reading-schema";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const readingModel = process.env.OPENAI_READING_MODEL || "gpt-4.1";
const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";

async function read(path: string) {
  const d = { name: "Priya Sharma", dob: "1996-04-12", gender: "female" as const, hand: "right" as const };
  const url = `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`;
  const t0 = Date.now();
  const res = await client.chat.completions.create({
    model: readingModel,
    response_format: { type: "json_object" },
    max_completion_tokens: 2200,
    temperature: 0.7,
    messages: [
      { role: "system", content: READING_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: readingUserPrompt(d, zodiacFromDob(d.dob), ageFromDob(d.dob)) },
          { type: "image_url", image_url: { url, detail: "high" } },
        ],
      },
    ],
  });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const json = JSON.parse(res.choices[0].message.content ?? "{}");
  const validity = validitySchema.parse(json);
  console.log(`\n== ${path}\n  ${secs}s, tokens in/out ${res.usage?.prompt_tokens}/${res.usage?.completion_tokens}`);
  if (!validity.is_valid_palm) {
    console.log("  REJECTED:", validity.quality_issue);
    return null;
  }
  const reading = readingSchema.parse(json);
  console.log("  summary:", reading.summary);
  console.log("  heart:", reading.lines.heart);
  console.log("  mounts:", reading.mounts.map((m) => `${m.name}=${m.strength}`).join(", "));
  console.log("  traits:", reading.traits.join(", "));
  console.log("  remedies:", JSON.stringify(reading.remedies));
  return { reading, d };
}

async function main() {
  const [palm, notPalm] = process.argv.slice(2);
  const ok = await read(palm);
  if (notPalm) await read(notPalm);
  if (!ok) return;

  const t0 = Date.now();
  let first = 0;
  let answer = "";
  const stream = await client.chat.completions.create({
    model: chatModel,
    stream: true,
    max_completion_tokens: 400,
    temperature: 0.8,
    messages: [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      { role: "system", content: chatContext(ok.reading, ok.d) },
      { role: "user", content: "When will I get married?" },
    ],
  });
  for await (const c of stream) {
    const delta = c.choices[0]?.delta?.content;
    if (delta) {
      if (!first) first = Date.now() - t0;
      answer += delta;
    }
  }
  console.log(`\n== chat: first token ${first}ms, ${answer.split(/\s+/).length} words\n  ${answer}`);
}

main().catch((e) => {
  console.error("FAILED:", e?.status ?? "", e?.message ?? e);
  process.exit(1);
});
