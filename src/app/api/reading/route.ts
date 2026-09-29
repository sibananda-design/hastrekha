import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { openai, isReasoningModel } from "@/lib/openai";
import { env, LIMITS } from "@/lib/env";
import { jsonError, unauthorized } from "@/lib/http";
import { READING_SYSTEM_PROMPT, readingUserPrompt } from "@/lib/prompts";
import {
  ageFromDob,
  detailsSchema,
  readingSchema,
  validitySchema,
  zodiacFromDob,
  type Reading,
} from "@/lib/reading-schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type AiResult =
  | { ok: true; reading: Reading; inputTokens: number; outputTokens: number }
  | { ok: false; invalid: true; issue: string }
  | { ok: false; invalid: false };

async function askForReading(dataUrl: string, userPrompt: string): Promise<AiResult> {
  const model = env.readingModel();
  const reasoning = isReasoningModel(model);
  let inputTokens = 0;
  let outputTokens = 0;

  // One call, plus one retry if the JSON is malformed.
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await openai().chat.completions.create({
      model,
      response_format: { type: "json_object" },
      max_completion_tokens: reasoning ? 6000 : 2200,
      ...(reasoning ? { reasoning_effort: "low" as const } : { temperature: 0.7 }),
      messages: [
        { role: "system", content: READING_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    });
    inputTokens += completion.usage?.prompt_tokens ?? 0;
    outputTokens += completion.usage?.completion_tokens ?? 0;

    let json: unknown;
    try {
      json = JSON.parse(completion.choices[0]?.message?.content ?? "");
    } catch {
      continue;
    }
    const validity = validitySchema.safeParse(json);
    if (validity.success && validity.data.is_valid_palm === false) {
      return { ok: false, invalid: true, issue: validity.data.quality_issue || "Please upload a clearer palm photo." };
    }
    const parsed = readingSchema.safeParse(json);
    if (parsed.success && parsed.data.summary && parsed.data.lines.heart) {
      return { ok: true, reading: parsed.data, inputTokens, outputTokens };
    }
  }
  return { ok: false, invalid: false };
}

export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "BAD_REQUEST", "We couldn't read that upload. Please try again.");
  }

  const details = detailsSchema.safeParse({
    name: form.get("name"),
    dob: form.get("dob"),
    gender: form.get("gender"),
    hand: form.get("hand"),
  });
  if (!details.success) {
    return jsonError(400, "INVALID_DETAILS", details.error.issues[0]?.message ?? "Please check your details.");
  }
  const d = details.data;
  const age = ageFromDob(d.dob);
  if (age < 18) return jsonError(400, "UNDER_18", "Readings are available only for adults (18+).");
  if (age > 120) return jsonError(400, "INVALID_DETAILS", "Please enter a valid date of birth.");

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return jsonError(400, "NO_IMAGE", "Please add a photo of your palm.");
  }
  if (!ALLOWED.includes(image.type)) {
    return jsonError(400, "BAD_IMAGE", "Please upload a JPG or PNG photo.");
  }
  if (image.size > MAX_UPLOAD_BYTES) {
    return jsonError(400, "BAD_IMAGE", "That photo is larger than 10 MB. Please choose a smaller one.");
  }

  const admin = createAdminClient();

  // Rate limit: 5 reading attempts per user per hour.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("reading_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= LIMITS.readingsPerHour) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "You've made several readings in the last hour. Please try again a little later.",
    );
  }

  const { data: profile } = await admin.from("profiles").select("reading_credits").eq("id", user.id).single();
  if (!profile || profile.reading_credits <= 0) {
    return jsonError(402, "NO_CREDITS", "You have no reading credits left. Unlock a new reading for ₹99.");
  }

  const { data: attempt } = await admin.from("reading_attempts").insert({ user_id: user.id }).select("id").single();
  const markAttempt = async (outcome: string) => {
    if (attempt) await admin.from("reading_attempts").update({ outcome }).eq("id", attempt.id);
  };

  const bytes = Buffer.from(await image.arrayBuffer());
  const dataUrl = `data:${image.type};base64,${bytes.toString("base64")}`;
  const zodiac = zodiacFromDob(d.dob);

  let ai: AiResult;
  try {
    ai = await askForReading(dataUrl, readingUserPrompt(d, zodiac, age));
  } catch (e) {
    console.error("reading: AI call failed", e);
    await markAttempt("ai_error");
    return jsonError(
      502,
      "AI_ERROR",
      "Our palm reader is busy right now. No credit was used — please try again in a moment.",
    );
  }

  if (!ai.ok && ai.invalid) {
    await markAttempt("invalid_palm");
    return jsonError(422, "INVALID_PALM", "Please upload a clearer palm photo.", { detail: ai.issue });
  }
  if (!ai.ok) {
    await markAttempt("malformed");
    return jsonError(502, "AI_ERROR", "We couldn't finish your reading. No credit was used — please try again.");
  }

  const reading = { ...ai.reading, zodiac_sign: ai.reading.zodiac_sign || zodiac };
  const readingId = crypto.randomUUID();
  const imagePath = `${user.id}/${readingId}.jpg`;

  const upload = await admin.storage.from("palms").upload(imagePath, bytes, {
    contentType: image.type,
    upsert: false,
  });
  if (upload.error) {
    console.error("reading: upload failed", upload.error);
    await markAttempt("storage_error");
    return jsonError(500, "STORAGE_ERROR", "We couldn't save your photo. No credit was used — please try again.");
  }

  const { data: row, error } = await admin.rpc("create_reading_with_credit", {
    p_reading_id: readingId,
    p_user_id: user.id,
    p_image_path: imagePath,
    p_name: d.name,
    p_dob: d.dob,
    p_gender: d.gender,
    p_hand: d.hand,
    p_result: reading,
    p_input_tokens: ai.inputTokens,
    p_output_tokens: ai.outputTokens,
    p_model: env.readingModel(),
  });

  if (error || !row) {
    await admin.storage.from("palms").remove([imagePath]);
    await markAttempt("db_error");
    if (error?.message?.includes("NO_CREDITS")) {
      return jsonError(402, "NO_CREDITS", "You have no reading credits left. Unlock a new reading for ₹99.");
    }
    console.error("reading: db error", error);
    return jsonError(500, "DB_ERROR", "Something went wrong saving your reading. No credit was used.");
  }

  await markAttempt("success");
  return NextResponse.json({ id: readingId });
}
