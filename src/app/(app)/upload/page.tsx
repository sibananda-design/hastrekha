import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { UploadForm, type Prefill } from "./UploadForm";

export const metadata: Metadata = { title: "Read my palm" };

export default async function UploadPage() {
  const { supabase, user } = await getUser();

  // Prefill from the last reading (or the profile name from Google).
  const [{ data: last }, { data: profile }] = await Promise.all([
    supabase
      .from("readings")
      .select("name, dob, gender, hand")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("full_name, dob, gender").eq("id", user!.id).single(),
  ]);

  const prefill: Prefill = {
    name: last?.name ?? profile?.full_name ?? "",
    dob: last?.dob ?? profile?.dob ?? "",
    gender: (last?.gender ?? profile?.gender ?? "") as Prefill["gender"],
    hand: (last?.hand ?? "right") as Prefill["hand"],
  };

  return <UploadForm prefill={prefill} />;
}
