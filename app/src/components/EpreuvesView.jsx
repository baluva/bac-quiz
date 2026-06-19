import { useMemo, useState } from 'react';
import { sessionLabel, pdfUrl } from '../lib/helpers.js';
import { getState } from '../lib/store.js';

export default function EpreuvesView({ data, qcmIds }) {
  const { sections, years, subjects } = data;
  // Si une spécialité est choisie (compte/profil), on s'y concentre par défaut.
  const [spec, setSpec] = useState(() => {
    const pref = getState().section;
    return (pref && sections.find((x) => x.label === pref)?.key) || 'all';
  });
  const [year, setYear] = useState('all');
  const [session, setSession] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    // recherche multi-termes sur matière + année + spécialité + session
    // ex : "math 2024", "informatique controle", "anglais 2023"
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return subjects.filter((s) => {
      if (spec !== 'all' && s.sectionKey !== spec) return false;
      if (year !== 'all' && s.year !== Number(year)) return false;
      if (session !== 'all' && s.session !== session) return false;
      if (!terms.length) return true;
      const hay = `${s.matiereLabel} ${s.year} ${s.sectionLabel} ${sessionLabel(s.session)}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [subjects, spec, year, session, q]);

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
        <select value={session} onChange={(e) => setSession(e.target.value)}>
          <option value="all">Principale + Contrôle</option>
          <option value="principale">Principale</option>
          <option value="controle">Contrôle</option>
        </select>
        <input type="text" placeholder="🔎 Rechercher : « math 2024 », « anglais », « 2023 »…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="count-line">{filtered.length} épreuve{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}</div>

      {filtered.length === 0 ? (
        <div className="empty">Aucune épreuve pour ce filtre.</div>
      ) : (
        <div className="grid">
          {filtered.map((s) => {
            const enonce = s.docs.find((d) => d.kind === 'enonce') || s.docs[0];
            const extra = s.docs.filter((d) => d !== enonce);
            const hasQcm = qcmIds.has(s.id);
            return (
              <div className="card" key={s.id + s.docs[0].file}>
                <div className="ico">{s.sectionIcon}</div>
                <div>
                  <div className="matiere">{s.matiereLabel}</div>
                  <div className="sub">Bac {s.year} · {sessionLabel(s.session)}</div>
                </div>
                <div className="tagrow">
                  <span className="tag spec">{s.sectionLabel}</span>
                  {hasQcm && <span className="tag qcm">🎯 QCM dispo</span>}
                </div>
                <div className="btnrow">
                  <a className="btn ghost" href={pdfUrl(enonce.file)} target="_blank" rel="noreferrer">👁 Voir</a>
                  <a className="btn primary" href={pdfUrl(enonce.file)} download={enonce.file}>⬇ Télécharger</a>
                </div>
                {extra.length > 0 && (
                  <div className="complement muted">
                    + {extra.map((d, i) => (
                      <span key={d.file}>
                        <a href={pdfUrl(d.file)} target="_blank" rel="noreferrer">doc. {i + 1}</a>
                        {i < extra.length - 1 ? ', ' : ''}
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
