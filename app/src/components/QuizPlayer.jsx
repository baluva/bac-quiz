import { useState } from 'react';
import { recordAnswer, recordQuiz } from '../lib/store.js';
import { DIFF_COLOR, sessionLabel } from '../lib/helpers.js';

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPlayer({ quiz, onExit }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const questions = quiz.questions;
  const total = questions.length;
  const cur = questions[i];

  function choose(idx) {
    if (picked !== null) return;
    setPicked(idx);
    const ok = idx === cur.index_correct;
    if (ok) setScore((s) => s + 1);
    recordAnswer(ok);
  }
  function next() {
    if (i + 1 >= total) {
      recordQuiz(quiz.id, score, total);
      setDone(true);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  }

  if (done) {
    const pct = Math.round((score / total) * 100);
    const ring = pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪';
    return (
      <div className="player">
        <div className="result">
          <div className="ring">{ring}</div>
          <div className="score">{score}/{total}</div>
          <p className="muted">{pct}% de bonnes réponses · +{score * 10} XP</p>
          <div className="btnrow" style={{ maxWidth: 360, margin: '24px auto 0' }}>
            <button className="btn primary" onClick={() => { setI(0); setPicked(null); setScore(0); setDone(false); }}>↻ Recommencer</button>
            <button className="btn ghost" onClick={onExit}>← Autres QCM</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player">
      <div className="qhead">
        <button className="btn ghost" style={{ flex: 'none' }} onClick={onExit}>←</button>
        <div className="sub" style={{ textAlign: 'center', flex: 1 }}>
          <b>{quiz.matiere}</b> · {quiz.section} · Bac {quiz.annee}{quiz.session ? ` (${sessionLabel(quiz.session)})` : ''}
        </div>
        <span className="muted" style={{ flex: 'none' }}>{i + 1}/{total}</span>
      </div>
      <div className="progress"><i style={{ width: `${(i / total) * 100}%` }} /></div>

      {cur.contexte && (
        <div className="explain" style={{ borderLeftColor: 'var(--accent2)', marginTop: 0, marginBottom: 18 }}>
          <b>📄 Document</b>
          <div style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{cur.contexte}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="tag">{cur.theme}</span>
        {cur.difficulte && (
          <span className="diff" style={{ color: DIFF_COLOR[cur.difficulte], border: `1px solid ${DIFF_COLOR[cur.difficulte]}` }}>
            {cur.difficulte}
          </span>
        )}
      </div>

      <div className="enonce">{cur.enonce}</div>

      <div className="choices">
        {cur.choix.map((c, idx) => {
          let cls = 'choice';
          if (picked !== null) {
            if (idx === cur.index_correct) cls += ' correct';
            else if (idx === picked) cls += ' wrong';
          }
          return (
            <button key={idx} className={cls} disabled={picked !== null} onClick={() => choose(idx)}>
              <span className="key">{KEYS[idx]}</span>
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <>
          <div className="explain"><b>{picked === cur.index_correct ? '✅ Correct !' : '❌ Mauvaise réponse.'}</b><br />{cur.explication}</div>
          <button className="btn primary full" style={{ marginTop: 16 }} onClick={next}>
            {i + 1 >= total ? 'Voir le résultat' : 'Question suivante →'}
          </button>
        </>
      )}
    </div>
  );
}
