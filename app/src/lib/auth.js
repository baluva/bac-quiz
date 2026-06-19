// État d'authentification Supabase, exposé en hook React.
import { useSyncExternalStore } from 'react';
import { supabase, cloudEnabled } from './supabase.js';
import { attachCloud, detachCloud } from './store.js';

let authState = { user: null, ready: !cloudEnabled }; // si pas de cloud : prêt, anonyme
const listeners = new Set();
function set(next) { authState = next; listeners.forEach((l) => l()); }

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user ?? null;
    set({ user, ready: true });
    if (user) attachCloud(user.id);
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    const user = session?.user ?? null;
    set({ user, ready: true });
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

export async function signUp(email, password, pseudo) {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.signUp({
    email, password, options: { data: { pseudo } },
  });
  if (error) throw error;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase non configuré');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}
