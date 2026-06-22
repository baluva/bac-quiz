import { useState } from 'react';
import { signUp, signIn, resetPassword, signInWithGoogle } from '../lib/auth.js';
import { REGIONS } from '../lib/leaderboard.js';
import { isEmail, nameError, passwordError, MAX_NAME } from '../lib/validate.js';

// Logo Google officiel (SVG inline → pas d'asset externe, OK avec la CSP).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

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

  async function google() {
    clear();
    setBusy(true);
    try {
      await signInWithGoogle(); // redirige vers Google ; le retour rouvre l'app connecté
    } catch (e2) {
      setErr(e2.message || String(e2));
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    clear();
    // --- Contrôles de saisie ---
    const mail = email.trim();
    if (!isEmail(mail)) { setErr('Adresse e-mail invalide.'); return; }
    if (mode !== 'reset') {
      const pe = passwordError(pwd);
      if (pe) { setErr(pe); return; }
    }
    if (mode === 'signup') {
      const ne = nameError(firstName, 'Prénom') || nameError(lastName, 'Nom');
      if (ne) { setErr(ne); return; }
      if (!region) { setErr('Choisis ta région (gouvernorat).'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const data = await signUp(mail, pwd, {
          pseudo: firstName.trim() || mail.split('@')[0],
          firstName: firstName.trim(), lastName: lastName.trim(), region,
        });
        if (data?.session) { onClose(); return; } // confirmation désactivée → connecté direct
        setInfo('Compte créé ! Vérifie tes e-mails pour confirmer, puis connecte-toi.');
        setMode('signin');
      } else if (mode === 'reset') {
        await resetPassword(mail);
        setInfo('Si un compte existe, un e-mail de réinitialisation vient de partir. Vérifie ta boîte (et les spams).');
      } else {
        await signIn(mail, pwd);
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
        {mode !== 'reset' && (
          <>
            <button type="button" className="btn google full" onClick={google} disabled={busy}>
              <GoogleIcon />
              <span>Continuer avec Google</span>
            </button>
            <div className="modal-sep">ou avec un e-mail</div>
          </>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Prénom" value={firstName} maxLength={MAX_NAME} autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <input type="text" placeholder="Nom" value={lastName} maxLength={MAX_NAME} autoComplete="family-name" onChange={(e) => setLastName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
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
