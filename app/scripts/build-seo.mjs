// Génère public/robots.txt et public/sitemap.xml.
// L'URL du site vient de VITE_SITE_URL (env Netlify), sinon du fichier .env
// local, sinon d'un défaut. NB : l'app étant une SPA en hash routing
// (#qcm/#epreuves/#profil), les ancres ne sont PAS des URL indexables → le
// sitemap ne contient que la page d'accueil.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.resolve(ROOT, 'public');

function readSiteUrl() {
  if (process.env.VITE_SITE_URL) return process.env.VITE_SITE_URL;
  // Repli : parse le .env local
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8');
    const m = env.match(/^\s*VITE_SITE_URL\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* pas de .env (build CI) */ }
  return 'https://bac-quiz.netlify.app';
}

const SITE = readSiteUrl().replace(/\/+$/, ''); // sans / final
const today = new Date().toISOString().slice(0, 10);

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// ---- robots.txt ----
const robots = `# Bac Quiz — robots.txt
User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robots);

// ---- sitemap.xml ----
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);

console.log(`✅ SEO       : robots.txt + sitemap.xml générés pour ${SITE}`);
