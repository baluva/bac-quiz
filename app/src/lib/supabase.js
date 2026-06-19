import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// La clé anon est publique (sécurisée par les Row Level Security policies).
// Si les variables ne sont pas définies, l'app fonctionne en mode 100 % local.
export const supabase = url && anon ? createClient(url, anon) : null;
export const cloudEnabled = !!supabase;
