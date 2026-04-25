import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Lazy-init: Supabase SDK throws at createClient() if the URL is not a valid HTTP URL.
// Since Supabase is no longer on the demo critical path, we defer creation until first call
// and return a no-op proxy if env vars are missing.
let _client: SupabaseClient<Database> | null = null;
let _initialized = false;

function getClient(): SupabaseClient<Database> {
  if (!_initialized) {
    _initialized = true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      _client = createClient<Database>(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }
  if (!_client) {
    // Return a proxy that silently no-ops all Supabase calls
    return new Proxy({} as SupabaseClient<Database>, {
      get: () => () => new Proxy({} as any, {
        get: () => () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      }),
    });
  }
  return _client;
}

export const supabaseServer = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop) => {
    return (getClient() as any)[prop];
  },
});
