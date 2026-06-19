import { useEffect, useState } from 'react';
import { fetchLeaderboard, REGIONS } from '../lib/leaderboard.js';
import { useAuth, cloudEnabled } from '../lib/auth.js';
import { useStore, levelInfo, syncNow } from '../lib/store.js';

const ordinal = (n) => (n === 1 ? '1er' : `${n}e`);

export default function LeaderboardView() {
  const { user } = useAuth();
  const s = useStore();
  const [region, setRegion] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chargement + rafraîchissement « live » : intervalle 15 s + retour sur l'onglet.
  useEffect(() => {
    let on = true;
    const load = () => {
      fetchLeaderboard(region === 'all' ? null : region, 100)
        .then((r) => { if (on) { setRows(r); setLoading(false); } })
        .catch(() => { if (on) setLoading(false); });
    };
    load();
    const t = setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { on = false; clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [region]);

  // Quand mon propre score change, réactualise (après la synchro cloud).
  useEffect(() => {
    const t = setTimeout(() => {
      fetchLeaderboard(region === 'all' ? null : region, 100).then(setRows).catch(() => {});
    }, 1800);
    return () => clearTimeout(t);
  }, [s.xp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filet de sécurité : à l'ouverture, force la synchro de mon XP local vers le
  // cloud (au cas où un push précédent aurait échoué) puis recharge le classement.
  useEffect(() => {
    if (!user) return;
    Promise.resolve(syncNow()).finally(() => {
      setTimeout(() => fetchLeaderboard(region === 'all' ? null : region, 100).then(setRows).catch(() => {}), 1300);
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          🏆 Classement <span className="live-pill"><i className="dot" /> en direct</span>
        </h3>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">Tout le pays</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {!cloudEnabled && <div className="empty">Le classement nécessite les comptes (Supabase).</div>}

      {cloudEnabled && !user && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Connecte-toi pour apparaître au classement</div>
          <div className="muted" style={{ fontSize: 13 }}>C'est automatique : dès que tu gagnes de l'XP (QCM réussi ou épreuve téléchargée), tu es classé — sous ton pseudo. Renseigner prénom/nom/région (onglet Profil) est facultatif.</div>
        </div>
      )}

      {cloudEnabled && loading && rows.length === 0 && <div className="empty">Chargement du classement…</div>}

      {cloudEnabled && !loading && rows.length === 0 && (
        <div className="empty">Aucun élève classé {region === 'all' ? '' : `à ${region} `}pour l'instant — sois le premier ! 🚀</div>
      )}

      {rows.length > 0 && (
        <div className="lb">
          {rows.map((r) => {
            const me = user && r.user_id === user.id;
            const lvl = levelInfo(r.xp);
            return (
              <div className={`lb-row${me ? ' me' : ''}`} key={r.user_id}>
                <span className={`lb-rank r${r.rank <= 3 ? r.rank : 0}`}>{ordinal(r.rank)}</span>
                <span className="lb-name">
                  {r.display_name}{me && <span className="lb-you"> toi</span>}
                  <small className="muted">niv. {lvl.level}</small>
                </span>
                <span className="lb-region">📍 {r.region || '—'}</span>
                <span className="lb-xp">{r.xp} XP</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 14 }}>
        Actualisé automatiquement toutes les 15 secondes.
      </div>
    </div>
  );
}
