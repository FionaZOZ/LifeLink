import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let _client: SupabaseClient<Database> | null = null;
let _initialized = false;

function getClient(): SupabaseClient<Database> {
  if (!_initialized) {
    _initialized = true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      _client = createClient<Database>(url, key);
    }
  }
  if (!_client) {
    return new Proxy({} as SupabaseClient<Database>, {
      get: () => () => new Proxy({} as any, {
        get: () => () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      }),
    });
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop) => {
    return (getClient() as any)[prop];
  },
});
