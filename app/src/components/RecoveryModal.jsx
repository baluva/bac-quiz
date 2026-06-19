import { useState } from 'react';
import { updatePassword, clearRecovery } from '../lib/auth.js';

// Affichée quand on revient sur l'app via le lien « mot de passe oublié »
// (Supabase déclenche l'évènement PASSWORD_RECOVERY).
export default function RecoveryModal() {
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await updatePassword(pwd);
      setDone(true);
      setTimeout(clearRecovery, 1600);
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 4px' }}>Nouveau mot de passe</h2>
        <p className="muted" style={{ margin: '0 0 18px', fontSize: 13 }}>
          Choisis un nouveau mot de passe pour ton compte.
        </p>
        {done ? (
          <div style={{ color: 'var(--green)', fontSize: 14 }}>✓ Mot de passe mis à jour ! Tu es connecté.</div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="password" required minLength={6} autoFocus
              placeholder="Nouveau mot de passe (6+ caractères)"
              value={pwd} onChange={(e) => setPwd(e.target.value)} />
            {err && <div style={{ color: 'var(--red)', fontSize: 13 }}>⚠ {err}</div>}
            <button className="btn primary full" disabled={busy}>{busy ? '…' : 'Valider'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
