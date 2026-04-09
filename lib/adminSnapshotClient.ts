import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminSnapshotPayload = {
  ok?: boolean;
  tickets: unknown[];
  users: unknown[];
  providers: unknown[];
  bookings: unknown[];
  referrals: unknown[];
  errors?: Record<string, string | null>;
  error?: string;
};

/**
 * Loads admin dashboard data via Edge Function (service role), so RLS on the client
 * cannot block admins whose JWT metadata is out of sync with public.users.role.
 * Deploy: npx supabase functions deploy admin-snapshot --project-ref <ref>
 */
export async function fetchAdminSnapshot(supabase: SupabaseClient): Promise<
  | { ok: true; data: AdminSnapshotPayload }
  | { ok: false; error: string }
> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "Not signed in" };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !apikey) {
    return { ok: false, error: "Missing Supabase URL or anon/publishable key" };
  }

  const res = await fetch(`${base.replace(/\/$/, "")}/functions/v1/admin-snapshot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const text = await res.text();
  let json: AdminSnapshotPayload = { tickets: [], users: [], providers: [], bookings: [], referrals: [] };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    return { ok: false, error: json.error || text || res.statusText };
  }

  return { ok: true, data: json };
}
