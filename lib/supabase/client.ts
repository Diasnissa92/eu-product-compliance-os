import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/phase3-database.types";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  browserClient ??= createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}
