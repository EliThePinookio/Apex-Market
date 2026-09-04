import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** Publishable (anon) credentials — public by design, access is enforced by RLS. */
const FALLBACK_URL = "https://clxqkzthmbbgqatlufzb.supabase.co";
const FALLBACK_ANON = "sb_publishable_v8MnXRPrJAbSJEFJUTZhGQ_pFe6mq4a";

function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  }
}

export const supabaseUrl = sanitizeUrl(envUrl || FALLBACK_URL);
export const supabaseAnonKey = envKey || FALLBACK_ANON;

export const isSupabaseConfigured = Boolean(
  supabaseUrl.includes("supabase.co") && supabaseAnonKey.length > 10,
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window === "undefined" ? undefined : window.localStorage,
  },
});
