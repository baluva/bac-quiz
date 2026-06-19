import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../lib/leaderboard.js';
import { useNextExam } from '../lib/schedule.js';
import { countdownParts } from '../lib/helpers.js';

const MEDAL = ['🥇', '🥈', '🥉'];

// Bandeau défilant « en direct » en haut de page (style chat Twitch).
export default function Ticker() {
  const exam = useNextExam();
  const [top, setTop] = useState([]);

  useEffect(() => {
    let on = true;
    const load = () => fetchLeaderboard(null, 6).then((r) => { if (on) setTop(r); }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { on = false; clearInterval(t); };
  }, []);

  const cd = countdownParts(exam.target);
  const items = [
    '📥 Télécharge GRATUITEMENT toutes les épreuves du bac — sessions principale ET contrôle (2010 à 2025)',
    '📝 Des centaines de QCM corrigés, classés par spécialité — entraîne-toi en ligne',
    `⏳ J-${cd.days} avant ${exam.label}`,
  ];
  top.forEach((r, i) => {
    const loc = r.region ? ` · ${r.region}` : '';
    items.push(`${MEDAL[i] || `#${i + 1}`} ${r.display_name}${loc} · ${r.xp} XP`);
  });
  if (top.length) items.push(`🎓 ${top.length} élève${top.length > 1 ? 's' : ''} au classement`);
  items.push('🎯 Une bonne réponse = +10 XP — grimpe au classement');
  items.push('🔥 Reviens chaque jour pour garder ta série');

  // dupliqué pour un défilement en boucle sans couture
  const loop = items.concat(items);

  return (
    <div className="ticker" aria-label="Actualités en direct">
      <span className="ticker-live"><i className="dot" /> EN DIRECT</span>
      <div className="ticker-win">
        <div className="ticker-track">
          {loop.map((txt, i) => <span className="ticker-item" key={i}>{txt}</span>)}
        </div>
      </div>
    </div>
  );
}
