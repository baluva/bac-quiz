import { useEffect, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import EpreuvesView from './components/EpreuvesView.jsx';
import QcmView from './components/QcmView.jsx';
import TpView from './components/TpView.jsx';
import ProfilView from './components/ProfilView.jsx';
import LeaderboardView from './components/LeaderboardView.jsx';
import Toast from './components/Toast.jsx';
import Ticker from './components/Ticker.jsx';
import RecoveryModal from './components/RecoveryModal.jsx';
import { useAuth } from './lib/auth.js';

const TABS = ['qcm', 'epreuves', 'tp', 'classement', 'profil'];
// Chaque onglet est une VRAIE URL indexable (plus de #ancre).
const TAB_PATH = { qcm: '/', epreuves: '/epreuves', tp: '/tp', classement: '/classement', profil: '/profil' };
const PATH_TAB = { '/': 'qcm', '/qcm': 'qcm', '/epreuves': 'epreuves', '/tp': 'tp', '/classement': 'classement', '/profil': 'profil' };
const SITE = (import.meta.env.VITE_SITE_URL || 'https://bacquiz-tn.netlify.app').replace(/\/+$/, '');
const BASE = import.meta.env.BASE_URL || '/'; // préfixe des assets (data, etc.)

// Onglet correspondant à l'URL courante (+ migration des anciens liens #ancre).
function tabFromLocation() {
  const h = location.hash.replace('#', '');
  if (TABS.includes(h)) return h;
  const p = location.pathname.replace(/\/+$/, '') || '/';
  return PATH_TAB[p] || 'qcm';
}

// --- SEO par page : un titre + une description + un canonical propres à chaque URL.
function setMetaTag(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); }
  el.setAttribute('href', url);
}
function seoFor(tab, epreuves, qcm) {
  const nbE = epreuves?.subjects?.length;
  const nbQ = qcm?.totalQuestions;
  const yMax = epreuves?.years?.[0];
  const yMin = epreuves?.years?.at(-1);
  const annees = (yMin && yMax) ? ` (${yMin}–${yMax})` : '';
  switch (tab) {
    case 'epreuves':
      return {
        title: `Épreuves du bac tunisien à télécharger en PDF${annees} — Bac Quiz 🇹🇳`,
        desc: `Télécharge ${nbE ? nbE + ' ' : 'les '}épreuves officielles du baccalauréat tunisien${annees}, toutes spécialités : maths, sciences expérimentales, informatique, technique, économie & gestion, sport et lettres. Sessions principale et de contrôle.`,
      };
    case 'tp':
      return {
        title: 'TP — Entraînement algo en Python & bacs pratiques — Bac Quiz 🇹🇳',
        desc: "Entraîne-toi à programmer en Python directement dans ton navigateur (épreuve pratique du bac tunisien) avec correction automatique, et télécharge les sujets des bacs pratiques (TIC & informatique).",
      };
    case 'classement':
      return {
        title: 'Classement en direct des élèves — Bac Quiz 🇹🇳',
        desc: "Affronte les autres élèves du bac tunisien : gagne de l'XP en répondant aux QCM corrigés et grimpe dans le classement en temps réel.",
      };
    case 'profil':
      return {
        title: 'Mon profil & ma progression — Bac Quiz 🇹🇳',
        desc: 'Suis ta progression de révision du bac tunisien : XP, séries, statistiques par matière et historique de tes QCM.',
      };
    default: // qcm (accueil)
      return {
        title: `Bac Quiz 🇹🇳 — ${nbE ? nbE + ' annales' : 'Annales'} & ${nbQ ? nbQ + ' QCM' : 'QCM'} du bac tunisien gratuits`,
        desc: `Réviser le bac tunisien gratuitement : ${nbE ? nbE + ' épreuves' : 'les épreuves'} officielles${annees} à télécharger en PDF et ${nbQ ? nbQ + ' questions' : 'des QCM'} de QCM corrigées pour s'entraîner. Toutes spécialités.`,
      };
  }
}
function applyHead(tab, epreuves, qcm) {
  const { title, desc } = seoFor(tab, epreuves, qcm);
  const url = SITE + TAB_PATH[tab];
  document.title = title;
  setMetaTag('name', 'description', desc);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', desc);
  setMetaTag('property', 'og:url', url);
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', desc);
  setCanonical(url);
}

export default function App() {
  const [tab, setTabState] = useState(tabFromLocation);
  const setTab = (t) => {
    setTabState(t);
    const path = TAB_PATH[t];
    if (location.pathname !== path || location.hash) history.pushState({ tab: t }, '', path);
  };
  const [epreuves, setEpreuves] = useState(null);
  const [qcm, setQcm] = useState(null);
  const [pratique, setPratique] = useState(null);
  const [err, setErr] = useState(null);
  const { recovery } = useAuth();

  useEffect(() => {
    // Migration : un ancien lien en #onglet devient une URL propre (/onglet).
    if (location.hash) {
      const h = location.hash.replace('#', '');
      history.replaceState(null, '', TABS.includes(h) ? TAB_PATH[h] : location.pathname);
    }
    const onPop = () => setTabState(tabFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Met à jour le titre/description/canonical à chaque changement de page.
  useEffect(() => { applyHead(tab, epreuves, qcm); }, [tab, epreuves, qcm]);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}data/epreuves.json`).then((r) => r.json()),
      fetch(`${BASE}data/qcm.json`).then((r) => r.json()),
    ])
      .then(([e, q]) => { setEpreuves(e); setQcm(q); })
      .catch((e) => setErr(String(e)));
  }, []);

  // Données des épreuves pratiques (onglet TP) — non bloquant : le trainer marche
  // même si ce fichier manque.
  useEffect(() => {
    fetch(`${BASE}data/pratique.json`).then((r) => r.json()).then(setPratique).catch(() => {});
  }, []);

  return (
    <>
      <Ticker />
      <TopBar />
      <div className="wrap">
        {tab === 'qcm' && (
          <section className="card hero">
            <h1>Réviser le bac tunisien, gratuitement 🇹🇳</h1>
            <p>Télécharge toutes les épreuves officielles, entraîne-toi sur des QCM corrigés et grimpe au classement en direct.</p>
            <div className="hero-points">
              {epreuves && <span>📚 {epreuves.subjects.length} épreuves (2010–2025) à télécharger</span>}
              {qcm && <span>🎯 {qcm.totalQuestions} questions de QCM corrigées</span>}
              <span>🏆 Classement & XP en direct</span>
            </div>
          </section>
        )}
        <div className="tabs">
          <button className={`tab ${tab === 'qcm' ? 'active' : ''}`} aria-current={tab === 'qcm' ? 'page' : undefined} onClick={() => setTab('qcm')}>
            🎯 Entraînement QCM{qcm ? ` · ${qcm.totalQuestions}` : ''}
          </button>
          <button className={`tab ${tab === 'epreuves' ? 'active' : ''}`} aria-current={tab === 'epreuves' ? 'page' : undefined} onClick={() => setTab('epreuves')}>
            📚 Épreuves{epreuves ? ` · ${epreuves.subjects.length}` : ''}
          </button>
          <button className={`tab ${tab === 'tp' ? 'active' : ''}`} aria-current={tab === 'tp' ? 'page' : undefined} onClick={() => setTab('tp')}>
            💻 TP{pratique ? ` · ${pratique.subjects.length}` : ''}
          </button>
          <button className={`tab ${tab === 'classement' ? 'active' : ''}`} aria-current={tab === 'classement' ? 'page' : undefined} onClick={() => setTab('classement')}>
            🏆 Classement
          </button>
          <button className={`tab ${tab === 'profil' ? 'active' : ''}`} aria-current={tab === 'profil' ? 'page' : undefined} onClick={() => setTab('profil')}>
            👤 Profil
          </button>
        </div>

        {err && <div className="empty">Erreur de chargement des données : {err}</div>}
        {!err && (!epreuves || !qcm) && tab !== 'tp' && <div className="empty"><span className="spinner" aria-hidden="true" />Chargement…</div>}

        {tab === 'classement' && <LeaderboardView />}

        {tab === 'tp' && <TpView pratique={pratique} />}

        {!err && epreuves && qcm && tab !== 'classement' && tab !== 'tp' && (
          tab === 'qcm' ? <QcmView data={qcm} />
            : tab === 'epreuves' ? <EpreuvesView data={epreuves} />
              : <ProfilView qcm={qcm} />
        )}

        <div className="footer">
          {epreuves && qcm && (
            <>Bac Quiz 🇹🇳 — {epreuves.subjects.length} épreuves ({epreuves.years.at(-1)}–{epreuves.years[0]}, {epreuves.sections.length} spécialités) · {qcm.totalQuestions} questions QCM · ta progression est sauvegardée sur cet appareil.</>
          )}
        </div>
      </div>
      <Toast />
      {recovery && <RecoveryModal />}
    </>
  );
}
