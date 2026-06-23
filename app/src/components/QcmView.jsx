import { useMemo, useState } from 'react';
import { useStore, getState } from '../lib/store.js';
import { shuffle, sessionLabel } from '../lib/helpers.js';
import QuizPlayer from './QuizPlayer.jsx';

const SECTION_ICON = {
  'Mathématiques': '📐', 'Sciences expérimentales': '🧪', "Sciences de l'informatique": '💻',
  'Économie & Gestion': '💼', 'Sciences techniques': '⚙️', 'Sport': '🏅', 'Lettres': '📖',
};

export default function QcmView({ data }) {
  const s = useStore();
  const quizzes = data.quizzes;
  // Si une spécialité est choisie (compte/profil), on s'y concentre par défaut.
  const [spec, setSpec] = useState(() => {
    const pref = getState().section;
    const secs = new Set(quizzes.map((q) => q.section));
    return pref && secs.has(pref) ? pref : 'all';
  });
  const [year, setYear] = useState('all');
  const [active, setActive] = useState(null);

  const specs = useMemo(() => [...new Set(quizzes.map((q) => q.section))].sort(), [quizzes]);
  const years = useMemo(
    () => [...new Set(quizzes.map((q) => q.annee))].filter(Boolean).sort((a, b) => Number(b) - Number(a)),
    [quizzes]
  );
  const list = useMemo(
    () => quizzes.filter((q) =>
      (spec === 'all' || q.section === spec) &&
      (year === 'all' || String(q.annee) === String(year))
    ),
    [quizzes, spec, year]
  );

  if (active) return <QuizPlayer quiz={active} onExit={() => setActive(null)} />;

  function startMix() {
    const pool = list.flatMap((q) =>
      q.questions.map((qq) => ({ ...qq, _src: `${q.matiere} ${q.annee}` }))
    );
    const picked = shuffle(pool).slice(0, 10);
    setActive({
      id: `mix_${spec}_${Date.now()}`,
      matiere: 'Mélange', section: spec === 'all' ? 'Toutes spécialités' : spec,
      annee: '🎲', session: null, questions: picked,
    });
  }

  return (
    <div>
      <div className="filters">
        <button className={`chip ${spec === 'all' ? 'active' : ''}`} onClick={() => setSpec('all')}>Toutes spécialités</button>
        {specs.map((sec) => (
          <button key={sec} className={`chip ${spec === sec ? 'active' : ''}`} onClick={() => setSpec(sec)}>
            {SECTION_ICON[sec] || '📚'} {sec}
          </button>
        ))}
      </div>
      <div className="filters">
        <select aria-label="Filtrer les QCM par année" value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">Toutes les années</option>
          {years.map((y) => <option key={y} value={y}>Bac {y}</option>)}
        </select>
      </div>

      <button className="btn primary full" style={{ marginBottom: 18 }} onClick={startMix} disabled={list.length === 0}>
        🎲 Entraînement express — 10 questions au hasard
      </button>

      <div className="count-line">{list.length} QCM disponible{list.length > 1 ? 's' : ''}</div>

      {list.length === 0 ? (
        <div className="empty">Pas encore de QCM pour ce filtre.</div>
      ) : (
        <div className="grid">
          {list.map((q) => {
            const best = s.best[q.id];
            return (
              <div className="card" key={q.id}>
                <div className="ico">{SECTION_ICON[q.section] || '📚'}</div>
                <div>
                  <div className="matiere">{q.matiere}</div>
                  <div className="sub">Bac {q.annee} · {q.id.includes('controle') ? 'Contrôle' : 'Principale'}</div>
                </div>
                <div className="tagrow">
                  <span className="tag spec">{q.section}</span>
                  <span className="tag">{q.nbQuestions} questions</span>
                  {best && <span className="tag best">★ {best.score}/{best.total}</span>}
                </div>
                <button className="btn primary full" onClick={() => setActive(q)}>
                  {best ? '↻ Rejouer' : "S'entraîner"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
