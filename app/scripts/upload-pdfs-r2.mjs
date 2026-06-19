// Upload des 528 sujets PDF (pipeline/data/raw_pdfs) vers un bucket Cloudflare R2.
// R2 est compatible S3. Prérequis : créer un bucket R2 + un token API (Object Read & Write).
//
// Variables d'environnement (mets-les dans app/.env ou exporte-les avant) :
//   R2_ACCOUNT_ID=...            (Cloudflare → R2 → "Account ID")
//   R2_ACCESS_KEY_ID=...         (R2 → Manage API Tokens)
//   R2_SECRET_ACCESS_KEY=...
//   R2_BUCKET=bac-quiz-epreuves
//
// Lancer :  node scripts/upload-pdfs-r2.mjs
// Puis rendre le bucket public (R2 → Settings → Public access / r2.dev) et mettre
// l'URL publique dans VITE_EPREUVES_BASE (Netlify env), ex :
//   https://pub-xxxx.r2.dev
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_DIR = path.resolve(__dirname, '../../pipeline/data/raw_pdfs');

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('❌ Variables R2 manquantes. Renseigne R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const files = fs.readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
console.log(`${files.length} PDF à téléverser vers le bucket "${R2_BUCKET}"…`);

const CONCURRENCY = 6;
let done = 0, skipped = 0, failed = 0;

async function exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; }
  catch { return false; }
}

async function worker(queue) {
  while (queue.length) {
    const name = queue.pop();
    try {
      if (await exists(name)) { skipped++; }
      else {
        await new Upload({
          client: s3,
          params: {
            Bucket: R2_BUCKET, Key: name,
            Body: fs.createReadStream(path.join(PDF_DIR, name)),
            ContentType: 'application/pdf',
          },
        }).done();
        done++;
      }
    } catch (e) {
      failed++; console.error('  ✗', name, e.message);
    }
    if ((done + skipped + failed) % 25 === 0) console.log(`  … ${done + skipped + failed}/${files.length}`);
  }
}

const queue = [...files];
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
console.log(`✅ Terminé : ${done} envoyés, ${skipped} déjà présents, ${failed} échecs.`);
