import { useToast, dismissToast } from '../lib/toast.js';

export default function Toast() {
  const t = useToast();
  if (!t) return null;
  return (
    <div className="toast" key={t.id} onClick={dismissToast} role="status">
      {t.msg}
    </div>
  );
}
