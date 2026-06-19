// Progression (XP, niveau, série, scores) + préférences (spécialité focus).
// Toujours en localStorage ; synchronisée avec Supabase quand l'utilisateur est connecté.
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase.js';
import { showToast } from './toast.js';

const KEY = 'bacquiz:v1';
const WELCOME_BONUS = 250; // XP offerts à la 1ʳᵉ connexion avec un compte
const DEFAULT = {
  xp: 0, answered: 0, correct: 0, streak: 0, lastDay: null, best: {},
  section: null,        // spécialité choisie (label) → l'app se concentre dessus
  welcomeBonus: false,  // bonus de bienvenue déjà accordé ?
};

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

// Choix de la spécialité « focus » (null = toutes).
export function setSection(section) { commit({ ...state, section: section || null }); }

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
    streak: state.streak, last_day: state.lastDay, best: state.best,
    section: state.section, welcome_bonus: state.welcomeBonus,
    updated_at: new Date().toISOString(),
  });
}

// Fusion locale ↔ cloud : on garde le meilleur des deux (l'utilisateur ne perd
// jamais la progression faite en invité quand il se connecte).
const maxDay = (a, b) => (!a ? b : !b ? a : a > b ? a : b);
function mergeBest(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, v] of Object.entries(b)) {
    if (!out[id] || (v?.score ?? 0) > (out[id].score ?? 0)) out[id] = v;
  }
  return out;
}

// À la connexion : fusionne la progression locale et cloud, accorde le bonus
// de bienvenue une seule fois, puis renvoie le tout vers le cloud.
export async function attachCloud(id) {
  userId = id;
  if (!supabase) return;
  const { data } = await supabase.from('progress').select('*').eq('user_id', id).maybeSingle();
  const cloud = data || {};
  const merged = {
    xp: Math.max(state.xp, cloud.xp ?? 0),
    answered: Math.max(state.answered, cloud.answered ?? 0),
    correct: Math.max(state.correct, cloud.correct ?? 0),
    streak: Math.max(state.streak, cloud.streak ?? 0),
    lastDay: maxDay(state.lastDay, cloud.last_day),
    best: mergeBest(state.best, cloud.best || {}),
    section: cloud.section ?? state.section ?? null,
    welcomeBonus: !!cloud.welcome_bonus || state.welcomeBonus,
  };
  let granted = false;
  if (!cloud.welcome_bonus && !state.welcomeBonus) {
    merged.xp += WELCOME_BONUS;
    merged.welcomeBonus = true;
    granted = true;
  }
  commitNoCloud(merged);
  await pushNow();
  if (granted) showToast(`🎁 +${WELCOME_BONUS} XP de bienvenue ! Tu es désormais membre, ta progression est synchronisée.`);
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

// Réinitialise la progression mais garde le statut membre + la spécialité.
export function resetProgress() {
  commit({ ...DEFAULT, welcomeBonus: state.welcomeBonus, section: state.section });
}
