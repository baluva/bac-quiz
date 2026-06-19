import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.js';
import { fetchMyProfile, updatePublicProfile, REGIONS } from '../lib/leaderboard.js';
import { showToast } from '../lib/toast.js';
import { nameError, MAX_NAME } from '../lib/validate.js';

export default function PublicProfileCard() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchMyProfile(user.id).then((p) => {
      if (!p) return;
      setFirstName(p.first_name || '');
      setLastName(p.last_name || '');
      setRegion(p.region || '');
    });
  }, [user]);

  if (!user) {
    return (
      <div className="card" style={{ marginBottom: 22, gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>🏆 Mon profil de classement</div>
        <div className="muted" style={{ fontSize: 13 }}>Connecte-toi pour renseigner ton prénom, nom et région et apparaître dans le classement.</div>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    const ne = nameError(firstName, 'Prénom') || nameError(lastName, 'Nom');
    if (ne) { setErr(ne); return; }
    setBusy(true);
    try {
      await updatePublicProfile(user.id, { firstName, lastName, region });
      showToast('✓ Profil de classement enregistré.');
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 22, gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>🏆 Mon profil de classement</div>
      <div className="muted" style={{ fontSize: 13 }}>Ces infos sont visibles publiquement dans le classement.</div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Prénom" value={firstName} maxLength={MAX_NAME} onChange={(e) => setFirstName(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <input type="text" placeholder="Nom" value={lastName} maxLength={MAX_NAME} onChange={(e) => setLastName(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
        </div>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Ma région (gouvernorat)…</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {err && <div style={{ color: 'var(--red)', fontSize: 13 }}>⚠ {err}</div>}
        <button className="btn primary" style={{ flex: 'none', alignSelf: 'flex-start' }} disabled={busy}>{busy ? '…' : 'Enregistrer'}</button>
      </form>
    </div>
  );
}
