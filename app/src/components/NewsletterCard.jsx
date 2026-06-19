import { useState } from 'react';
import { subscribeNewsletter } from '../lib/newsletter.js';
import { useAuth } from '../lib/auth.js';
import { isEmail } from '../lib/validate.js';

export default function NewsletterCard() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!isEmail(email)) { setErr('Adresse e-mail invalide.'); return; }
    setBusy(true);
    try { await subscribeNewsletter(email.trim(), user?.id || null); setDone(true); }
    catch (e2) { setErr(e2.message || String(e2)); }
    finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 22, gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 16 }}>✉️ Newsletter hebdo</div>
      <div className="muted" style={{ fontSize: 13 }}>
        Reçois chaque semaine une question défi, un conseil de révision et le compte à rebours du bac.
      </div>
      {done ? (
        <div style={{ color: 'var(--green)', fontSize: 14 }}>✓ Inscrit ! À très vite dans ta boîte mail.</div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="email" required placeholder="ton e-mail" value={email}
            onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          <button className="btn primary" style={{ flex: 'none' }} disabled={busy}>{busy ? '…' : "Je m'abonne"}</button>
        </form>
      )}
      {err && <div style={{ color: 'var(--red)', fontSize: 13 }}>⚠ {err}</div>}
    </div>
  );
}
