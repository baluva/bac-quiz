// Classement public + édition de l'identité publique (prénom, nom, région).
import { supabase } from './supabase.js';

// Les 24 gouvernorats tunisiens.
export const REGIONS = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba',
  'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba',
  'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana',
  'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

// Récupère le top du classement (région optionnelle). Renvoie [] si indispo.
export async function fetchLeaderboard(region = null, limit = 100) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('leaderboard', { p_limit: limit, p_region: region || null });
  if (error) { console.warn('leaderboard:', error.message); return []; }
  return data || [];
}

// Lit l'identité publique de l'utilisateur connecté (RLS : select own).
export async function fetchMyProfile(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase.from('profiles').select('first_name, last_name, region, pseudo').eq('id', userId).maybeSingle();
  return data || null;
}

// Met à jour l'identité publique (RLS : update own).
export async function updatePublicProfile(userId, { firstName, lastName, region }) {
  if (!supabase) throw new Error('Supabase non configuré');
  if (!userId) throw new Error('Connecte-toi pour apparaître au classement.');
  const { error } = await supabase.from('profiles').update({
    first_name: firstName?.trim() || null,
    last_name: lastName?.trim() || null,
    region: region || null,
  }).eq('id', userId);
  if (error) throw error;
}
