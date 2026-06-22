// État d'authentification Supabase, exposé en hook React.
import { useSyncExternalStore } from 'react';
import { supabase, cloudEnabled } from './supabase.js';
import { attachCloud, detachCloud } from './store.js';

// recovery = true quand on revient via le lien « mot de passe oublié ».
let authState = { user: null, ready: !cloudEnabled, recovery: false };
const listeners = new Set();
function set(next) { authState = next; listeners.forEach((l) => l()); }

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user ?? null;
    set({ ...authState, user, ready: true });
    if (user) attachCloud(user.id);
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    set({ ...authState, user, ready: true, recovery: event === 'PASSWORD_RECOVERY' || authState.recovery });
    if (user) attachCloud(user.id); else detachCloud();
  });
}

export function useAuth() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => authState
  );
}

export { cloudEnabled };

const SITE = import.meta.env.VITE_SITE_URL
  || (typeof window !== 'undefined' ? window.location.origin : '');

export async function signUp(email, password, profile = {}) {
  if (!supabase) throw new Error('Supabase non configuré');
  const { pseudo, firstName, lastName, region } = profile;
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { pseudo, first_name: firstName, last_name: lastName, region } },
  });
  if (error) throw error;
  return data; // data.session ≠ null si la confirmation e-mail est désactivée
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Connexion via Google (OAuth). Redirige le navigateur vers Google puis revient
// sur SITE ; supabase-js récupère la session au retour (onAuthStateChange).
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: SITE,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

// Envoie l'e-mail de réinitialisation de mot de passe.
export async function resetPassword(email) {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE });
  if (error) throw error;
}

// Définit le nouveau mot de passe (après clic sur le lien reçu par e-mail).
export async function updatePassword(password) {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export function clearRecovery() { set({ ...authState, recovery: false }); }
