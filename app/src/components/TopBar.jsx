import { useEffect, useState } from 'react';
import { useStore, levelInfo } from '../lib/store.js';
import { countdownParts } from '../lib/helpers.js';
import { useAuth, signOut, cloudEnabled } from '../lib/auth.js';
import AuthModal from './AuthModal.jsx';

export default function TopBar() {
  const s = useStore();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const lvl = levelInfo(s.xp);
  const [cd, setCd] = useState(countdownParts());
  useEffect(() => {
    const t = setInterval(() => setCd(countdownParts()), 60000);
    return () => clearInterval(t);
  }, []);
  const acc = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
  const pseudo = user?.user_metadata?.pseudo || user?.email?.split('@')[0];

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="brand">
            🎓 Bac Quiz <span className="tn">🇹🇳</span>
            <small>réviser le bac tunisien</small>
          </div>
          <div className="acct">
            {user ? (
              <>
                <span className="who">👤 {pseudo}</span>
                <button className="btn ghost" style={{ flex: 'none', padding: '7px 12px' }} onClick={signOut}>Déconnexion</button>
              </>
            ) : cloudEnabled ? (
              <button className="btn primary" style={{ flex: 'none', padding: '8px 16px' }} onClick={() => setShowAuth(true)}>Se connecter</button>
            ) : (
              <span className="who" title="Ajoute tes clés Supabase pour activer les comptes">💾 Progression locale</span>
            )}
          </div>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        <div className="stats">
          <div className="stat" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="lbl">Niveau {lvl.level}</span>
              <span className="lbl">{s.xp} XP</span>
            </div>
            <div className="xpbar"><i style={{ width: `${lvl.pct}%` }} /></div>
            <span className="lbl" style={{ marginTop: 2 }}>{lvl.into}/{lvl.need} vers niv. {lvl.level + 1}</span>
          </div>
          <div className="stat">
            <span className="big">🔥 {s.streak}</span>
            <span className="lbl">jours<br />de série</span>
          </div>
          <div className="stat">
            <span className="big">{acc}%</span>
            <span className="lbl">réussite<br />({s.correct}/{s.answered})</span>
          </div>
          <div className="stat" title="Prochaine session principale du bac">
            <span className="big">⏳ {cd.days}j</span>
            <span className="lbl">avant le<br />bac 2027</span>
          </div>
        </div>
      </div>
    </div>
  );
}
