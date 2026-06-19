// Progression (XP, niveau, série, scores).
// Toujours en localStorage ; synchronisée avec Supabase quand l'utilisateur est connecté.
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase.js';

const KEY = 'bacquiz:v1';
const DEFAULT = { xp: 0, answered: 0, correct: 0, streak: 0, lastDay: null, best: {} };

function read() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULT }; }
}

let state = read();
let userId = null;
const listeners = new Set();

function commit(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
  if (userId) schedulePush();
}

export function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
export function getState() { return state; }
export function useStore() { return useSyncExternalStore(subscribe, getState); }

// ---- Cloud sync ----
let pushTimer = null;
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 1200);
}
async function pushNow() {
  if (!userId || !supabase) return;
  await supabase.from('progress').upsert({
    user_id: userId, xp: state.xp, answered: state.answered, correct: state.correct,
    streak: state.streak, last_day: state.lastDay, best: state.best, updated_at: new Date().toISOString(),
  });
}

// À la connexion : récupère la progression cloud ; sinon pousse la locale (migration).
export async function attachCloud(id) {
  userId = id;
  if (!supabase) return;
  const { data } = await supabase.from('progress').select('*').eq('user_id', id).maybeSingle();
  if (data) {
    commitNoCloud({
      xp: data.xp ?? 0, answered: data.answered ?? 0, correct: data.correct ?? 0,
      streak: data.streak ?? 0, lastDay: data.last_day ?? null, best: data.best ?? {},
    });
  } else {
    await pushNow(); // première synchro : envoie la progression locale
  }
}
export function detachCloud() { userId = null; clearTimeout(pushTimer); }
function commitNoCloud(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

// Niveaux : paliers croissants (×1.4).
export function levelInfo(xp) {
  let level = 1, need = 100, floor = 0;
  while (xp >= floor + need) { floor += need; level++; need = Math.round(need * 1.4); }
  return { level, into: xp - floor, need, pct: Math.round(((xp - floor) / need) * 100) };
}

const today = () => new Date().toISOString().slice(0, 10);

export function recordAnswer(correct) {
  const s = { ...state, answered: state.answered + 1 };
  if (correct) { s.correct += 1; s.xp += 10; }
  const d = today();
  if (s.lastDay !== d) {
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    s.streak = s.lastDay === yest ? s.streak + 1 : 1;
    s.lastDay = d;
  }
  commit(s);
}

export function recordQuiz(id, score, total) {
  const best = { ...state.best };
  const prev = best[id];
  let bonusXp = 0;
  if (prev === undefined) bonusXp = 50;
  if (prev === undefined || score > prev.score) best[id] = { score, total };
  commit({ ...state, best, xp: state.xp + bonusXp });
}

export function resetProgress() { commit({ ...DEFAULT }); }
