import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Les PDF (918 Mo) ne sont pas copiés dans l'app : on les sert directement
// depuis pipeline/data/raw_pdfs via un middleware, à l'URL /epreuves/<fichier>.
const PDF_DIR = path.resolve(__dirname, '../pipeline/data/raw_pdfs');

function servePdfs() {
  const handler = (req, res, next) => {
    if (!req.url || !req.url.startsWith('/epreuves/')) return next();
    const name = decodeURIComponent(req.url.replace('/epreuves/', '').split('?')[0]);
    // sécurité : pas de remontée de dossier
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      res.statusCode = 400; return res.end('bad request');
    }
    const file = path.join(PDF_DIR, name);
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: 'serve-pdfs',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

// Injecte les VRAIS compteurs de contenu dans index.html (title, description,
// Open Graph, noscript, données structurées) à partir des JSON de données, pour
// que le SEO ne soit jamais périmé après un ajout d'épreuves/QCM.
// Remplace les jetons __NB_EPREUVES__, __NB_QUESTIONS__, __ANNEE_MIN/MAX__ et
// __SECTIONS_LI__ (puces <li> des spécialités pour le <noscript> indexable).
function seoCounts() {
  function read(rel) {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, rel), 'utf-8'));
  }
  function compute() {
    let nbEpreuves = 0, nbQuestions = 0, anneeMin = '', anneeMax = '', sectionsLi = '';
    try {
      const ep = read('public/data/epreuves.json');
      nbEpreuves = ep.subjects.length;
      anneeMax = Math.max(...ep.years);
      anneeMin = Math.min(...ep.years);
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      sectionsLi = (ep.sections || [])
        .map((s) => `<li>${esc(s.label)} — ${s.count} épreuves</li>`)
        .join('');
    } catch { /* données absentes : on laisse les jetons (build dégradé) */ }
    try { nbQuestions = read('public/data/qcm.json').totalQuestions; } catch { /* idem */ }
    return { nbEpreuves, nbQuestions, anneeMin, anneeMax, sectionsLi };
  }
  return {
    name: 'seo-counts',
    transformIndexHtml(html) {
      const c = compute();
      return html
        .replaceAll('__NB_EPREUVES__', String(c.nbEpreuves))
        .replaceAll('__NB_QUESTIONS__', String(c.nbQuestions))
        .replaceAll('__ANNEE_MIN__', String(c.anneeMin))
        .replaceAll('__ANNEE_MAX__', String(c.anneeMax))
        .replaceAll('__SECTIONS_LI__', c.sectionsLi);
    },
  };
}

// Injecte le beacon Cloudflare Web Analytics UNIQUEMENT si un token est défini
// (VITE_CF_BEACON_TOKEN). Pas de cookie, pas de consentement requis.
function cloudflareAnalytics(token) {
  if (!token) return null;
  return {
    name: 'cloudflare-web-analytics',
    transformIndexHtml(html) {
      const tag = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${token}"}'></script>`;
      return html.replace('</head>', `    ${tag}\n  </head>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  return {
    base: '/',
    plugins: [react(), servePdfs(), seoCounts(), cloudflareAnalytics(env.VITE_CF_BEACON_TOKEN)].filter(Boolean),
    server: { port: 5173, open: true },
  };
});
