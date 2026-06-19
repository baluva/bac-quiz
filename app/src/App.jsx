import { useEffect, useMemo, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import EpreuvesView from './components/EpreuvesView.jsx';
import QcmView from './components/QcmView.jsx';
import ProfilView from './components/ProfilView.jsx';

const TABS = ['qcm', 'epreuves', 'profil'];
const hashTab = () => { const h = location.hash.replace('#', ''); return TABS.includes(h) ? h : 'qcm'; };

export default function App() {
  const [tab, setTabState] = useState(hashTab);
  const setTab = (t) => { setTabState(t); history.replaceState(null, '', `#${t}`); };
  const [epreuves, setEpreuves] = useState(null);
  const [qcm, setQcm] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const onHash = () => setTabState(hashTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('./data/epreuves.json').then((r) => r.json()),
      fetch('./data/qcm.json').then((r) => r.json()),
    ])
      .then(([e, q]) => { setEpreuves(e); setQcm(q); })
      .catch((e) => setErr(String(e)));
  }, []);

  const qcmIds = useMemo(() => new Set((qcm?.quizzes || []).map((q) => q.id)), [qcm]);

  return (
    <>
      <TopBar />
      <div className="wrap">
        <div className="tabs">
          <button className={`tab ${tab === 'qcm' ? 'active' : ''}`} onClick={() => setTab('qcm')}>
            🎯 Entraînement QCM{qcm ? ` · ${qcm.totalQuestions}` : ''}
          </button>
          <button className={`tab ${tab === 'epreuves' ? 'active' : ''}`} onClick={() => setTab('epreuves')}>
            📚 Épreuves{epreuves ? ` · ${epreuves.subjects.length}` : ''}
          </button>
          <button className={`tab ${tab === 'profil' ? 'active' : ''}`} onClick={() => setTab('profil')}>
            👤 Profil
          </button>
        </div>

        {err && <div className="empty">Erreur de chargement des données : {err}</div>}
        {!err && (!epreuves || !qcm) && <div className="empty">Chargement…</div>}

        {!err && epreuves && qcm && (
          tab === 'qcm' ? <QcmView data={qcm} />
            : tab === 'epreuves' ? <EpreuvesView data={epreuves} qcmIds={qcmIds} />
              : <ProfilView qcm={qcm} />
        )}

        <div className="footer">
          {epreuves && qcm && (
            <>Bac Quiz 🇹🇳 — {epreuves.subjects.length} épreuves ({epreuves.years.at(-1)}–{epreuves.years[0]}, {epreuves.sections.length} spécialités) · {qcm.totalQuestions} questions QCM · ta progression est sauvegardée sur cet appareil.</>
          )}
        </div>
      </div>
    </>
  );
}
