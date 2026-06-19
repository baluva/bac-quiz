// Planning du bac : la prochaine épreuve vient de Supabase (table bac_schedule),
// avec repli sur la date en dur si le cloud est absent / la table vide.
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { NEXT_BAC } from './helpers.js';

export async function fetchNextExam() {
  if (!supabase) return null;
  const { data } = await supabase
    .from('bac_schedule')
    .select('label, session, starts_at')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1).maybeSingle();
  return data || null;
}

export async function fetchSchedule(limit = 12) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('bac_schedule')
    .select('label, session, starts_at')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);
  return data || [];
}

// Hook : prochaine épreuve (cible du countdown) + libellé, avec repli.
export function useNextExam() {
  const [exam, setExam] = useState({ target: NEXT_BAC, label: 'la prochaine épreuve' });
  useEffect(() => {
    let on = true;
    fetchNextExam().then((e) => {
      if (!on) return;
      if (e?.starts_at) setExam({ target: new Date(e.starts_at), label: e.label });
    }).catch(() => {});
    return () => { on = false; };
  }, []);
  return exam;
}
