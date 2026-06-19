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
    base: './',
    plugins: [react(), servePdfs(), cloudflareAnalytics(env.VITE_CF_BEACON_TOKEN)].filter(Boolean),
    server: { port: 5173, open: true },
  };
});
