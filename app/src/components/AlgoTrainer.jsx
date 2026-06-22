import { useState } from 'react';
import { ALGO_EXERCISES } from '../data/algoExercises.js';
import { runTests } from '../lib/pyodide.js';
import { recordExercise } from '../lib/store.js';
import { DIFF_COLOR } from '../lib/helpers.js';

export default function AlgoTrainer() {
  const [idx, setIdx] = useState(0);
  const ex = ALGO_EXERCISES[idx];
  const [codes, setCodes] = useState(() => Object.fromEntries(ALGO_EXERCISES.map((e) => [e.id, e.starter])));
  const [busy, setBusy] = useState(false);
  const [loadingPy, setLoadingPy] = useState(false);
  const [res, setRes] = useState(null); // { code_ok, code_err, results }
  const [err, setErr] = useState(null);

  const code = codes[ex.id];
  const setCode = (v) => setCodes((c) => ({ ...c, [ex.id]: v }));

  const pickExercise = (i) => { setIdx(i); setRes(null); setErr(null); };

  // Tabulation = 4 espaces (sinon le navigateur change de champ).
  const onKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.target;
      const s = el.selectionStart, en = el.selectionEnd;
      const next = code.slice(0, s) + '    ' + code.slice(en);
      setCode(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4; });
    }
  };

  async function run() {
    setBusy(true); setErr(null); setRes(null);
    try {
      // Premier lancement : Pyodide se télécharge (≈ quelques secondes).
      if (!window.__pyReady) setLoadingPy(true);
      const out = await runTests(code, ex.tests);
      window.__pyReady = true;
      setLoadingPy(false);
      setRes(out);
      if (out.code_ok && out.results.every((r) => r.ok)) {
        recordExercise(ex.id); // +XP une seule fois par exercice résolu
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false); setLoadingPy(false);
    }
  }

  const allPass = res && res.code_ok && res.results.every((r) => r.ok);

  return (
    <div className="trainer">
      <div className="filters">
        {ALGO_EXERCISES.map((e, i) => (
          <button key={e.id} className={`chip ${i === idx ? 'active' : ''}`} onClick={() => pickExercise(i)}>
            {e.titre}
          </button>
        ))}
      </div>

      <div className="card trainer-card">
        <div className="trainer-head">
          <h3>{ex.titre}</h3>
          <span className="tag" style={{ color: DIFF_COLOR[ex.niveau] }}>{ex.niveau}</span>
        </div>
        <p className="trainer-enonce">{ex.enonce}</p>

        <textarea
          className="code-editor"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKey}
          rows={Math.max(8, code.split('\n').length + 1)}
        />

        <div className="btnrow">
          <button className="btn primary" onClick={run} disabled={busy}>
            {busy ? (loadingPy ? '⏳ Chargement de Python…' : '⏳ Exécution…') : '▶ Exécuter & tester'}
          </button>
          <button className="btn ghost" onClick={() => { setCode(ex.starter); setRes(null); setErr(null); }} disabled={busy}>
            ↺ Réinitialiser
          </button>
        </div>

        {loadingPy && <div className="muted small">Première exécution : l'environnement Python se télécharge dans ton navigateur (~5 s). Ensuite c'est instantané.</div>}
        {err && <div className="empty">⚠️ {err}</div>}

        {res && !res.code_ok && (
          <pre className="code-err">{res.code_err}</pre>
        )}

        {res && res.code_ok && (
          <div className="tests">
            {allPass && <div className="tests-ok">🎉 Bravo, tous les tests passent ! Exercice résolu.</div>}
            {res.results.map((r, i) => (
              <div key={i} className={`test-row ${r.ok ? 'pass' : 'fail'}`}>
                <span className="test-ico">{r.ok ? '✅' : '❌'}</span>
                <code>{r.call}</code>
                <span className="test-arrow">→</span>
                {r.err
                  ? <span className="test-got">erreur : {r.err}</span>
                  : <span className="test-got">{r.got}{!r.ok && <span className="test-exp"> (attendu : {r.expect})</span>}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
