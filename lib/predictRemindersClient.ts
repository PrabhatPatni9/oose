import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calls the Supabase Edge Function that recomputes predicted reminders server-side (service role).
 * Deploy: `npx supabase functions deploy predict-reminders --project-ref <ref>`
 * Set secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto in hosted Supabase).
 */
export async function invokePredictReminders(supabase: SupabaseClient) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false as const, error: "Not signed in" };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !apikey) {
    return { ok: false as const, error: "Missing Supabase URL or anon/publishable key" };
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/functions/v1/predict-reminders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    return { ok: false as const, error: (json.error as string) || text || res.statusText };
  }

  return { ok: true as const, data: json };
}
