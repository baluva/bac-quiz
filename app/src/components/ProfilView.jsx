import { useMemo } from 'react';
import { useStore, levelInfo, resetProgress } from '../lib/store.js';
import { countdownParts, NEXT_BAC } from '../lib/helpers.js';

const SECTION_ICON = {
  'Mathématiques': '📐', 'Sciences expérimentales': '🧪', "Sciences de l'informatique": '💻',
  'Économie et Gestion': '💼', 'Sciences techniques': '⚙️', 'Sport': '🏅', 'Lettres': '📖',
};

const BADGES = [
  { id: 'first', icon: '🎯', label: 'Première réponse', test: (s) => s.answered >= 1 },
  { id: 'ten', icon: '🔟', label: '10 bonnes réponses', test: (s) => s.correct >= 10 },
  { id: 'fifty', icon: '⭐', label: '50 bonnes réponses', test: (s) => s.correct >= 50 },
  { id: 'quiz1', icon: '✅', label: '1ᵉʳ QCM terminé', test: (s) => Object.keys(s.best).length >= 1 },
  { id: 'quiz5', icon: '📚', label: '5 QCM terminés', test: (s) => Object.keys(s.best).length >= 5 },
  { id: 'perfect', icon: '💯', label: 'Un sans-faute', test: (s) => Object.values(s.best).some((b) => b.score === b.total) },
  { id: 'streak3', icon: '🔥', label: 'Série de 3 jours', test: (s) => s.streak >= 3 },
  { id: 'streak7', icon: '🗓️', label: 'Série de 7 jours', test: (s) => s.streak >= 7 },
  { id: 'lvl5', icon: '🏆', label: 'Niveau 5', test: (s) => levelInfo(s.xp).level >= 5 },
];

export default function ProfilView({ qcm }) {
  const s = useStore();
  const lvl = levelInfo(s.xp);
  const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
  const cd = countdownParts();

  // Progression par spécialité (à partir des QCM disponibles + meilleurs scores).
  const bySpec = useMemo(() => {
    const m = new Map();
    for (const q of qcm.quizzes) {
      if (!m.has(q.section)) m.set(q.section, { total: 0, done: 0, score: 0, max: 0 });
      const e = m.get(q.section);
      e.total++;
      const b = s.best[q.id];
      if (b) { e.done++; e.score += b.score; e.max += b.total; }
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [qcm, s.best]);

  const doneCount = Object.keys(s.best).length;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Carte profil */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 46 }}>🎓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Niveau {lvl.level}</div>
            <div className="xpbar" style={{ marginTop: 8 }}><i style={{ width: `${lvl.pct}%` }} /></div>
            <div className="lbl" style={{ marginTop: 4 }}>{s.xp} XP · {lvl.into}/{lvl.need} vers le niveau {lvl.level + 1}</div>
          </div>
        </div>
      </div>

      {/* Stats clés */}
      <div className="stats" style={{ marginBottom: 22 }}>
        <div className="stat"><span className="big">🔥 {s.streak}</span><span className="lbl">jours<br />de série</span></div>
        <div className="stat"><span className="big">{acc}%</span><span className="lbl">réussite<br />globale</span></div>
        <div className="stat"><span className="big">{s.correct}</span><span className="lbl">bonnes<br />réponses</span></div>
        <div className="stat"><span className="big">{doneCount}</span><span className="lbl">QCM<br />terminés</span></div>
      </div>

      {/* Badges */}
      <h3 style={{ margin: '0 0 12px' }}>🏅 Badges</h3>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', marginBottom: 26 }}>
        {BADGES.map((b) => {
          const ok = b.test(s);
          return (
            <div className="card" key={b.id} style={{ alignItems: 'center', textAlign: 'center', gap: 6, opacity: ok ? 1 : 0.4, padding: 14 }}>
              <div style={{ fontSize: 30, filter: ok ? 'none' : 'grayscale(1)' }}>{b.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</div>
              <div className="lbl">{ok ? '✓ obtenu' : '🔒 à débloquer'}</div>
            </div>
          );
        })}
      </div>

      {/* Progression par spécialité */}
      <h3 style={{ margin: '0 0 12px' }}>📊 Progression par spécialité</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
        {bySpec.map(([sec, e]) => {
          const pctDone = Math.round((e.done / e.total) * 100);
          const avg = e.max ? Math.round((e.score / e.max) * 100) : 0;
          return (
            <div className="card" key={sec} style={{ gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>{SECTION_ICON[sec] || '📚'} {sec}</span>
                <span className="muted">{e.done}/{e.total} QCM{e.done ? ` · moy. ${avg}%` : ''}</span>
              </div>
              <div className="xpbar"><i style={{ width: `${pctDone}%` }} /></div>
            </div>
          );
        })}
      </div>

      {/* Objectif bac */}
      <div className="card" style={{ marginBottom: 22, textAlign: 'center' }}>
        <div style={{ fontSize: 15 }}>⏳ Objectif : <b>bac {NEXT_BAC.getFullYear()}</b></div>
        <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{cd.days} jours · {cd.hours} h</div>
        <div className="lbl" style={{ marginTop: 2 }}>continue ta série chaque jour pour ne rien lâcher</div>
      </div>

      <button className="btn ghost full" onClick={() => { if (confirm('Réinitialiser toute ta progression (XP, badges, scores) ?')) resetProgress(); }}>
        ↺ Réinitialiser ma progression
      </button>
    </div>
  );
}
