// Re-export from the canonical client utility
// All 'use client' pages should use: import { createClient } from "@/utils/supabase/client"
export { createClient } from "@/utils/supabase/client";

// Legacy singleton helper — kept for backward compatibility with existing pages
import { createClient as _createClient } from "@/utils/supabase/client";
export function getSupabase() {
  return _createClient();
}
