import { useMemo, useState } from 'react';
import { pdfUrl } from '../lib/helpers.js';
import AlgoTrainer from './AlgoTrainer.jsx';

// Onglet TP : entraînement algo en Python (Pyodide) + sujets des épreuves
// pratiques (bac pratique / TIC) à consulter et télécharger.
export default function TpView({ pratique }) {
  const [mode, setMode] = useState('algo'); // 'algo' | 'sujets'

  return (
    <div>
      <section className="card hero">
        <h1>TP — Travaux pratiques 💻</h1>
        <p>Entraîne-toi à coder en Python directement dans ton navigateur (comme à l'épreuve pratique), et révise les sujets des bacs pratiques.</p>
      </section>

      <div className="tp-toggle">
        <button className={`tab ${mode === 'algo' ? 'active' : ''}`} onClick={() => setMode('algo')}>🏋️ Entraînement algo (Python)</button>
        <button className={`tab ${mode === 'sujets' ? 'active' : ''}`} onClick={() => setMode('sujets')}>
          📂 Sujets pratiques{pratique ? ` · ${pratique.subjects.length}` : ''}
        </button>
      </div>

      {mode === 'algo' ? <AlgoTrainer /> : <PracticeSujets data={pratique} />}
    </div>
  );
}

function PracticeSujets({ data }) {
  const [spec, setSpec] = useState('all');
  const [year, setYear] = useState('all');
  if (!data) return <div className="empty">Chargement des sujets…</div>;
  const { sections, years, subjects } = data;

  const filtered = useMemo(() => subjects.filter((s) =>
    (spec === 'all' || s.sectionKey === spec) && (year === 'all' || s.year === Number(year))
  ), [subjects, spec, year]);

  return (
    <div>
      <div className="filters">
        <button className={`chip ${spec === 'all' ? 'active' : ''}`} onClick={() => setSpec('all')}>Toutes spécialités</button>
        {sections.map((sec) => (
          <button key={sec.key} className={`chip ${spec === sec.key ? 'active' : ''}`} onClick={() => setSpec(sec.key)}>
            {sec.icon} {sec.label}
          </button>
        ))}
      </div>
      <div className="filters">
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">Toutes les années</option>
          {years.map((y) => <option key={y} value={y}>Bac {y}</option>)}
        </select>
      </div>

      <div className="count-line">{filtered.length} épreuve{filtered.length > 1 ? 's' : ''} pratique{filtered.length > 1 ? 's' : ''}</div>

      {filtered.length === 0 ? (
        <div className="empty">Aucun sujet pour ce filtre.</div>
      ) : (
        <div className="grid">
          {filtered.map((s) => {
            const sujets = s.docs.filter((d) => d.kind === 'enonce');
            const corriges = s.docs.filter((d) => d.kind === 'corrige');
            return (
              <div className="card" key={s.id}>
                <div className="ico">{s.sectionIcon}</div>
                <div>
                  <div className="matiere">{s.matiereLabel}</div>
                  <div className="sub">Bac {s.year} · Pratique</div>
                </div>
                <div className="tagrow">
                  <span className="tag spec">{s.sectionLabel}</span>
                </div>
                <div className="doc-list">
                  {sujets.map((d) => (
                    <a key={d.file} className="doc-link" href={pdfUrl(d.file)} target="_blank" rel="noreferrer">📄 {d.label}</a>
                  ))}
                </div>
                {corriges.length > 0 && (
                  <div className="complement muted">
                    Corrigés : {corriges.map((d, i) => (
                      <span key={d.file}>
                        <a href={pdfUrl(d.file)} target="_blank" rel="noreferrer">{d.label}</a>
                        {i < corriges.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
