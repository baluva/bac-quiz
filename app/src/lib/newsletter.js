// Inscription à la newsletter hebdo : stocke l'e-mail dans Supabase via une
// fonction sécurisée (subscribe_newsletter) qui contourne proprement la RLS.
// Repli localStorage si le cloud n'est pas configuré (mode 100 % local).
import { supabase } from './supabase.js';

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function subscribeNewsletter(email, userId = null) {
  const clean = (email || '').trim().toLowerCase();
  if (!isEmail(clean)) throw new Error('Adresse e-mail invalide.');
  if (!supabase) {
    localStorage.setItem('bacquiz:newsletter', clean);
    return { local: true };
  }
  const { error } = await supabase.rpc('subscribe_newsletter', { p_email: clean, p_user_id: userId });
  if (error) throw error;
  return {};
}
