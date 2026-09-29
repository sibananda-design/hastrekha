import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { readingSchema } from "@/lib/reading-schema";
import { ReadingView } from "./ReadingView";

export const metadata: Metadata = { title: "Your reading" };

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase } = await getUser();
  const { data: reading } = await supabase
    .from("readings")
    .select("id, name, dob, gender, hand, image_path, result_json, is_free, questions_total, questions_remaining, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!reading) notFound();

  const [{ data: signed }, { data: messages }] = await Promise.all([
    supabase.storage.from("palms").createSignedUrl(reading.image_path, 60 * 60),
    supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("reading_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const result = readingSchema.parse(reading.result_json);

  return (
    <ReadingView
      reading={{
        id: reading.id,
        name: reading.name,
        dob: reading.dob,
        gender: reading.gender,
        hand: reading.hand,
        isFree: reading.is_free,
        questionsTotal: reading.questions_total,
        questionsRemaining: reading.questions_remaining,
        createdAt: reading.created_at,
      }}
      result={result}
      imageUrl={signed?.signedUrl ?? null}
      messages={(messages ?? []).map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))}
    />
  );
}
