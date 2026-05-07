import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.')
}

// Custom storage to avoid NavigatorLock issues in development/HMR
const customStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'tradixa-system-auth-v1',
      storage: customStorage,
      lock: (name, acquireTimeout, fn) => fn(),
    }
  }
)
