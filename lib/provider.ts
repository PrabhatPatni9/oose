export async function ensureProviderProfile(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from("service_providers")
    .select("id")
    .eq("user_id", userId)
    .single();

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
    .single();

  return created?.id as number | undefined;
}
