// Génère public/robots.txt et public/sitemap.xml.
// L'URL du site vient de VITE_SITE_URL (env Netlify), sinon du fichier .env
// local, sinon d'un défaut. L'app utilise désormais un routage par CHEMIN
// (/, /epreuves, /classement, /profil) : chaque onglet est une vraie URL
// indexable, toutes listées dans le sitemap.
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
// Une entrée par page indexable (routage par chemin). Priorité décroissante :
// accueil (QCM) et épreuves portent le contenu à fort potentiel de recherche ;
// classement et profil sont listés mais secondaires.
const PAGES = [
  { path: '/',            changefreq: 'weekly',  priority: '1.0' },
  { path: '/epreuves',    changefreq: 'weekly',  priority: '0.9' },
  { path: '/tp',          changefreq: 'weekly',  priority: '0.8' },
  { path: '/classement',  changefreq: 'daily',   priority: '0.5' },
  { path: '/profil',      changefreq: 'monthly', priority: '0.3' },
];
const urls = PAGES.map((p) => `  <url>
    <loc>${SITE}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);

console.log(`✅ SEO       : robots.txt + sitemap.xml générés pour ${SITE}`);
