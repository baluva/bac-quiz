import { useState } from 'react';
import { signUp, signIn } from '../lib/auth.js';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email, pwd, pseudo || email.split('@')[0]);
        setInfo('Compte créé ! Vérifie tes e-mails pour confirmer, puis connecte-toi.');
        setMode('signin');
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

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>×</button>
        <h2 style={{ margin: '0 0 4px' }}>{mode === 'signup' ? 'Créer un compte' : 'Se connecter'}</h2>
        <p className="muted" style={{ margin: '0 0 18px', fontSize: 13 }}>
          Ta progression sera sauvegardée et synchronisée sur tous tes appareils.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input type="text" placeholder="Pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
          )}
          <input type="email" required placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required minLength={6} placeholder="Mot de passe (6+ caractères)" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          {err && <div style={{ color: 'var(--red)', fontSize: 13 }}>⚠ {err}</div>}
          {info && <div style={{ color: 'var(--green)', fontSize: 13 }}>✓ {info}</div>}
          <button className="btn primary full" disabled={busy}>
            {busy ? '…' : mode === 'signup' ? "S'inscrire" : 'Connexion'}
          </button>
        </form>
        <div className="muted" style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
          {mode === 'signup' ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => { setErr(null); setInfo(null); setMode(mode === 'signup' ? 'signin' : 'signup'); }}>
            {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}
          </a>
        </div>
      </div>
    </div>
  );
}
