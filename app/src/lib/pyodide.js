// Charge Pyodide (CPython compilé en WebAssembly) à la demande, depuis le CDN
// jsDelivr. Aucun backend : le code Python de l'élève s'exécute dans le navigateur,
// dans le bac à sable WASM (pas d'accès réseau/disque). La CSP (netlify.toml)
// autorise cdn.jsdelivr.net + 'wasm-unsafe-eval'.
const VERSION = 'v0.26.4';
const CDN = `https://cdn.jsdelivr.net/pyodide/${VERSION}/full/`;

let _promise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Impossible de charger Python (vérifie ta connexion).'));
    document.head.appendChild(s);
  });
}

// Singleton : on ne charge Pyodide qu'une seule fois (≈ quelques secondes la 1ʳᵉ fois).
export function getPyodide() {
  if (!_promise) {
    _promise = (async () => {
      await loadScript(CDN + 'pyodide.js');
      return window.loadPyodide({ indexURL: CDN });
    })().catch((e) => { _promise = null; throw e; });
  }
  return _promise;
}

// Harnais Python : exécute le code de l'élève dans un namespace isolé, puis évalue
// chaque appel de test et compare le repr() au résultat attendu. Renvoie un JSON.
const HARNESS = `
import json, traceback
TESTS = json.loads(TESTS_JSON)
ns = {}
try:
    exec(USER_CODE, ns)
    code_ok, code_err = True, ''
except Exception:
    code_ok, code_err = False, traceback.format_exc(limit=2)
results = []
if code_ok:
    for t in TESTS:
        try:
            got = repr(eval(t['call'], ns))
            results.append({'call': t['call'], 'expect': t['expect'], 'got': got, 'ok': got == t['expect'], 'err': ''})
        except Exception as e:
            results.append({'call': t['call'], 'expect': t['expect'], 'got': '', 'ok': False, 'err': type(e).__name__ + ': ' + str(e)})
json.dumps({'code_ok': code_ok, 'code_err': code_err, 'results': results})
`;

// Exécute le code de l'élève contre la liste de tests d'un exercice.
export async function runTests(userCode, tests) {
  const py = await getPyodide();
  py.globals.set('USER_CODE', userCode);
  py.globals.set('TESTS_JSON', JSON.stringify(tests));
  const out = await py.runPythonAsync(HARNESS);
  return JSON.parse(out);
}
