// Planning du bac : la prochaine épreuve vient de Supabase (table bac_schedule),
// avec repli sur la date en dur si le cloud est absent / la table vide.
import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { NEXT_BAC, NEXT_BAC_LABEL } from './helpers.js';

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
  const [exam, setExam] = useState({ target: NEXT_BAC, label: NEXT_BAC_LABEL });
  useEffect(() => {
    let on = true;
    fetchNextExam().then((e) => {
      if (!on || !e?.starts_at) return;
      // On affiche l'échéance la PLUS PROCHE entre la base (modifiable au dashboard)
      // et le repli local tenu à jour — évite qu'une vieille date en base (ex. 2027)
      // masque la prochaine session imminente (ex. contrôle 2026).
      const dbDate = new Date(e.starts_at);
      if (dbDate.getTime() < NEXT_BAC.getTime()) {
        setExam({ target: dbDate, label: e.label });
      }
    }).catch(() => {});
    return () => { on = false; };
  }, []);
  return exam;
}
