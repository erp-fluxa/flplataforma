import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { safeLocalStorage } from './safeStorage';

export const DEFAULT_SUPABASE_URL = 'https://qdakxhuonxsnukgkybym.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWt4aHVvbnhzbnVrZ2t5YnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjMyNjQsImV4cCI6MjEwMzA5OTI2NH0.qO_91gcFjsCd-BfZ2mvbThIqBxmbu2tKCwq3W4WWbjg';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url =
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_URL) ||
    safeLocalStorage.getItem('VITE_SUPABASE_URL') ||
    DEFAULT_SUPABASE_URL;

  const key =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' && (window as any).VITE_SUPABASE_ANON_KEY) ||
    safeLocalStorage.getItem('VITE_SUPABASE_ANON_KEY') ||
    DEFAULT_SUPABASE_ANON_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      client = createClient(url, key, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      return client;
    } catch (e) {
      console.warn('[Supabase Client Init Error]', e);
    }
  }
  return null;
}

export function setSupabaseCredentials(url: string, key: string) {
  if (url && key) {
    safeLocalStorage.setItem('VITE_SUPABASE_URL', url);
    safeLocalStorage.setItem('VITE_SUPABASE_ANON_KEY', key);
    client = createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } }
    });
  }
}

