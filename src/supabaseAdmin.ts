import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("Missing Supabase Service Role configuration");
}

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

// Lazy load the admin client and ensure a singleton pattern
export function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    if (!serviceRoleKey) throw new Error("Service Role Key tidak ditemukan.");

    supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseAdminInstance;
}
