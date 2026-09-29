import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { openai, isReasoningModel } from "@/lib/openai";
import { env, LIMITS } from "@/lib/env";
import { jsonError, unauthorized } from "@/lib/http";
import { CHAT_SYSTEM_PROMPT, chatContext } from "@/lib/prompts";
import type { Reading } from "@/lib/reading-schema";
import { STREAM_ERROR_MARK } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  readingId: z.string().uuid(),
  message: z.string().trim().min(2, "Please type a question.").max(500, "Please keep your question under 500 characters."),
});

export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return unauthorized();

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "BAD_REQUEST", body.error.issues[0]?.message ?? "Invalid question.");
  const { readingId, message } = body.data;

  const admin = createAdminClient();

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", since);
  if ((count ?? 0) >= LIMITS.chatPerHour) {
    return jsonError(429, "RATE_LIMITED", "You've asked many questions this hour. Please take a short break and come back.");
  }

  const { data: reading } = await admin
    .from("readings")
    .select("id, user_id, name, dob, gender, hand, result_json, questions_remaining")
    .eq("id", readingId)
    .eq("user_id", user.id)
    .single();
  if (!reading) return jsonError(404, "NOT_FOUND", "We couldn't find that reading.");

  // Previous conversation (last 10 messages), fetched before storing the new question.
  const { data: history } = await admin
    .from("chat_messages")
    .select("role, content")
    .eq("reading_id", readingId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Decrement + store the question atomically.
  const { data: messageId, error: useErr } = await admin.rpc("use_question", {
    p_reading_id: readingId,
    p_user_id: user.id,
    p_content: message,
  });
  if (useErr || !messageId) {
    if (useErr?.message?.includes("NO_QUESTIONS")) {
      return jsonError(402, "NO_QUESTIONS", "You've used all the questions for this reading.");
    }
    console.error("chat: use_question failed", useErr);
    return jsonError(500, "DB_ERROR", "Something went wrong. Please try again.");
  }
  const remaining = reading.questions_remaining - 1;
  const refund = () =>
    admin.rpc("refund_question", { p_reading_id: readingId, p_user_id: user.id, p_message_id: messageId });

  const model = env.chatModel();
  const reasoning = isReasoningModel(model);
  let stream;
  try {
    stream = await openai().chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: reasoning ? 2000 : 400,
      ...(reasoning ? { reasoning_effort: "low" as const } : { temperature: 0.8 }),
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        {
          role: "system",
          content: chatContext(reading.result_json as Reading, {
            name: reading.name,
            dob: reading.dob,
            gender: reading.gender,
            hand: reading.hand,
          }),
        },
        ...(history ?? [])
          .reverse()
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: message },
      ],
    });
  } catch (e) {
    console.error("chat: AI call failed", e);
    await refund();
    return jsonError(502, "AI_ERROR", "The astrologer couldn't answer just now. Your question was not used — please try again.");
  }

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      let inputTokens = 0;
      let outputTokens = 0;
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            answer += delta;
            controller.enqueue(encoder.encode(delta));
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens;
            outputTokens = chunk.usage.completion_tokens;
          }
        }
        if (!answer.trim()) throw new Error("empty answer");
        await admin.from("chat_messages").insert({
          reading_id: readingId,
          user_id: user.id,
          role: "assistant",
          content: answer.trim(),
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        });
      } catch (e) {
        console.error("chat: stream failed", e);
        await refund();
        controller.enqueue(encoder.encode(STREAM_ERROR_MARK));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Questions-Remaining": String(remaining),
    },
  });
}
