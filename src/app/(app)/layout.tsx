import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { AppProvider } from "@/components/AppProvider";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import type { Profile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, free_credit_used, reading_credits")
    .eq("id", user.id)
    .single<Profile>();

  return (
    <AppProvider initialProfile={profile ?? null}>
      <AppHeader />
      <main className="relative">{children}</main>
      <SiteFooter />
    </AppProvider>
  );
}
