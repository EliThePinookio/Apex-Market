import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project configuration (can be overridden by environment variables)
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

const SUPABASE_URL =
  envUrl?.trim() ||
  'https://clxqkzthmbbgqatlufzb.supabase.co';

const SUPABASE_ANON_KEY =
  envKey?.trim() ||
  'sb_publishable_v8MnXRPrJAbSJEFJUTZhGQ_pFe6mq4a';

// Sanitize URL to ensure it has valid origin format (strip /rest/v1 if present)
function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return 'https://clxqkzthmbbgqatlufzb.supabase.co';
  try {
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  }
}

export const supabaseUrl = sanitizeSupabaseUrl(SUPABASE_URL);
export const supabaseAnonKey = SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.includes('supabase.co') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 10
);

/**
 * Authoritative Supabase client for authentication and PostgreSQL data operations.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});
