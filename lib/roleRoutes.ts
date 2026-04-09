import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "provider" | "user";

function normalizeRoleToken(r: string | null | undefined): string {
  const x = String(r ?? "")
    .toLowerCase()
    .trim();
  if (x === "admin" || x === "provider" || x === "user") return x;
  return "";
}

/**
 * Prefer public.users.role; provider can be upgraded from user_metadata (sync RPC).
 * app_metadata.role is only writable with the service role / dashboard, so "admin" there is safe for routing when the DB read fails.
 */
export function effectiveRole(
  dbRole: string | null | undefined,
  metadataRole: string | null | undefined,
  appMetadataRole?: string | null | undefined,
): AppRole {
  const d = normalizeRoleToken(dbRole);
  const m = normalizeRoleToken(metadataRole);
  const a = normalizeRoleToken(appMetadataRole);
  if (d === "admin") return "admin";
  if (a === "admin") return "admin";
  if (d === "provider") return "provider";
  if (m === "provider") return "provider";
  return "user";
}

export function homePathForRole(role: AppRole): "/dashboard" | "/provider" | "/admin" {
  if (role === "admin") return "/admin";
  if (role === "provider") return "/provider";
  return "/dashboard";
}

/** Calls sync_provider_role_from_auth RPC when present, then merges DB role with user_metadata for routing. */
export async function resolveSessionRole(supabase: SupabaseClient, user: User): Promise<AppRole> {
  const meta = user.user_metadata?.role as string | undefined;
  const appMeta = (user.app_metadata as { role?: string } | undefined)?.role;
  await supabase.rpc("sync_provider_role_from_auth");
  const { data: row, error } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (error && process.env.NODE_ENV === "development") {
    console.warn("[resolveSessionRole] users.role:", error.message);
  }
  return effectiveRole(row?.role as string | undefined, meta, appMeta);
}

/** Use on all /provider/* shells */
export async function guardProviderShell(
  router: { replace: (path: string) => void },
  supabase: SupabaseClient,
  user: User,
): Promise<boolean> {
  const role = await resolveSessionRole(supabase, user);
  if (role === "admin") {
    router.replace("/admin");
    return false;
  }
  if (role !== "provider") {
    router.replace("/dashboard");
    return false;
  }
  return true;
}
