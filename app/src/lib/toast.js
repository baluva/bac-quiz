// Mini-système de notifications éphémères (toasts), exposé en hook React.
import { useSyncExternalStore } from 'react';

let current = null;
const listeners = new Set();
let timer = null;

export function showToast(msg, ms = 4500) {
  current = { msg, id: Date.now() };
  listeners.forEach((l) => l());
  clearTimeout(timer);
  timer = setTimeout(() => { current = null; listeners.forEach((l) => l()); }, ms);
}

export function dismissToast() {
  clearTimeout(timer);
  current = null;
  listeners.forEach((l) => l());
}

export function useToast() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current
  );
}
