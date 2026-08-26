// ==============================================================================
// GESCOMP — CONFIGURAÇÃO CENTRALIZADA SUPABASE (AUTO-SYNC MULTI-DISPOSITIVO)
// ==============================================================================
(function() {
  const DEFAULT_URL = 'https://qdakxhuonxsnukgkybym.supabase.co';
  const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYWt4aHVvbnhzbnVrZ2t5YnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1MjMyNjQsImV4cCI6MjEwMzA5OTI2NH0.qO_91gcFjsCd-BfZ2mvbThIqBxmbu2tKCwq3W4WWbjg';

  if (typeof window !== 'undefined') {
    window.VITE_SUPABASE_URL = window.VITE_SUPABASE_URL || localStorage.getItem('VITE_SUPABASE_URL') || DEFAULT_URL;
    window.VITE_SUPABASE_ANON_KEY = window.VITE_SUPABASE_ANON_KEY || localStorage.getItem('VITE_SUPABASE_ANON_KEY') || DEFAULT_KEY;

    try {
      if (!localStorage.getItem('VITE_SUPABASE_URL')) {
        localStorage.setItem('VITE_SUPABASE_URL', window.VITE_SUPABASE_URL);
      }
      if (!localStorage.getItem('VITE_SUPABASE_ANON_KEY')) {
        localStorage.setItem('VITE_SUPABASE_ANON_KEY', window.VITE_SUPABASE_ANON_KEY);
      }
    } catch (_) {}
  }
})();
