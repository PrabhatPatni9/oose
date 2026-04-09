import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureProviderProfile(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from("service_providers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as number;
  }

  const { data: created } = await supabase
    .from("service_providers")
    .insert({
      user_id: userId,
      skills: "General Home Services",
      rating: 0,
    })
    .select("id")
    .maybeSingle();

  return created?.id as number | undefined;
}
