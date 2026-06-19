import { useState } from 'react';
import { signUp, signIn, resetPassword } from '../lib/auth.js';
import { REGIONS } from '../lib/leaderboard.js';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin'); // signin | signup | reset
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [region, setRegion] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  const clear = () => { setErr(null); setInfo(null); };

  async function submit(e) {
    e.preventDefault();
    clear(); setBusy(true);
    try {
      if (mode === 'signup') {
        const data = await signUp(email, pwd, {
          pseudo: firstName.trim() || email.split('@')[0],
          firstName, lastName, region,
        });
        if (data?.session) { onClose(); return; } // confirmation désactivée → connecté direct
        setInfo('Compte créé ! Vérifie tes e-mails pour confirmer, puis connecte-toi.');
        setMode('signin');
      } else if (mode === 'reset') {
        await resetPassword(email);
        setInfo('Si un compte existe, un e-mail de réinitialisation vient de partir. Vérifie ta boîte (et les spams).');
      } else {
        await signIn(email, pwd);
        onClose();
      }
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'signup' ? 'Créer un compte' : mode === 'reset' ? 'Mot de passe oublié' : 'Se connecter';

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>×</button>
        <h2 style={{ margin: '0 0 4px' }}>{title}</h2>
        <p className="muted" style={{ margin: '0 0 18px', fontSize: 13 }}>
          {mode === 'reset'
            ? 'Entre ton e-mail : on t’envoie un lien pour choisir un nouveau mot de passe.'
            : '🎁 En créant un compte tu gagnes +250 XP de bienvenue et ta progression est synchronisée sur tous tes appareils.'}
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <input type="text" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              </div>
              <select required value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">Ta région (gouvernorat)…</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </>
          )}
          <input type="email" required placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== 'reset' && (
            <input type="password" required minLength={6} placeholder="Mot de passe (6+ caractères)" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          )}
          {mode === 'signin' && (
            <a style={{ color: 'var(--accent)', cursor: 'pointer', fontSize: 13, alignSelf: 'flex-end' }}
              onClick={() => { clear(); setMode('reset'); }}>
              Mot de passe oublié ?
            </a>
          )}
          {err && <div style={{ color: 'var(--red)', fontSize: 13 }}>⚠ {err}</div>}
          {info && <div style={{ color: 'var(--green)', fontSize: 13 }}>✓ {info}</div>}
          <button className="btn primary full" disabled={busy}>
            {busy ? '…' : mode === 'signup' ? "S'inscrire" : mode === 'reset' ? 'Envoyer le lien' : 'Connexion'}
          </button>
        </form>

        <div className="muted" style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
          {mode === 'reset' ? (
            <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => { clear(); setMode('signin'); }}>← Retour à la connexion</a>
          ) : (
            <>
              {mode === 'signup' ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
              <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => { clear(); setMode(mode === 'signup' ? 'signin' : 'signup'); }}>
                {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
              </a>
            </>
          )}
        </div>

        <div className="modal-sep">ou</div>
        <button className="btn ghost full" onClick={onClose}>👤 Continuer sans compte</button>
        <p className="muted" style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>
          Ta progression reste enregistrée sur cet appareil.
        </p>
      </div>
    </div>
  );
}
