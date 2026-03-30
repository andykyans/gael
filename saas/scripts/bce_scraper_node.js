#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
//  GAELE PRO — Scraper BCE Open Data (Node.js)
//  Génère bce_wallonie.json à partir des données publiques BCE
//  Usage: node bce_scraper_node.js
// ══════════════════════════════════════════════════════════════

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const zlib  = require('zlib');

// ── CONFIGURATION ────────────────────────────────────────────
// Note: Le lien direct change souvent. Téléchargez manuellement le ZIP "Complet" sur:
// https://kbopub.economie.fgov.be/kbo-open-data/login
const OUTPUT_PATH  = path.join(__dirname, 'bce_wallonie.json');
const DATA_DIR     = path.join(__dirname, 'bce_data');
const MAX_LEADS    = 3000;

// Codes postaux Wallonie
const WALLONIE_CP = new Set();
for (let i = 1300; i < 1500; i++) WALLONIE_CP.add(String(i)); // Brabant wallon
for (let i = 4000; i < 5000; i++) WALLONIE_CP.add(String(i)); // Liège
for (let i = 5000; i < 6000; i++) WALLONIE_CP.add(String(i)); // Namur
for (let i = 6000; i < 8000; i++) WALLONIE_CP.add(String(i)); // Hainaut + Luxembourg

// Codes NACE cibles
const NACE_CIBLES = {
  '4120': 'Construction résidentielle',
  '4121': 'Construction maisons',
  '4122': 'Construction bâtiments',
  '4321': 'Installation électrique',
  '4322': 'Plomberie / chauffage',
  '4329': 'Travaux installation',
  '4391': 'Travaux couverture',
  '4399': 'Autres construction',
  '6810': 'Achat/vente immobilier',
  '6820': 'Location immobilier',
  '6831': 'Agences immobilières',
  '0111': 'Agriculture céréales',
  '0141': 'Élevage bovins',
  '0147': 'Élevage volailles',
  '4711': 'Supermarchés',
  '5610': 'Restaurants',
};

// ── PARSER CSV SIMPLE ─────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i+1] === '"') { curr += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(curr.trim()); curr = '';
    } else {
      curr += c;
    }
  }
  result.push(curr.trim());
  return result;
}

function parseCSV(filePath) {
  console.log(`  → Lecture: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < 2) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }
  console.log(`     ${rows.length.toLocaleString()} lignes`);
  return rows;
}

// ── TÉLÉCHARGEMENT ────────────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n⬇️  Téléchargement BCE Open Data...`);
    console.log(`   URL: ${url}`);
    console.log(`   (Fichier 50-200 MB, patience...)\n`);

    const file = fs.createWriteStream(destPath);
    const proto = url.startsWith('https') ? https : http;

    const req = proto.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      const total = parseInt(res.headers['content-length'] || '0');
      let downloaded = 0;
      let lastPct = -1;

      res.on('data', chunk => {
        file.write(chunk);
        downloaded += chunk.length;
        if (total) {
          const pct = Math.floor(downloaded / total * 100);
          if (pct !== lastPct && pct % 5 === 0) {
            process.stdout.write(`\r   ${pct}% (${Math.round(downloaded/1024/1024)} MB)`);
            lastPct = pct;
          }
        }
      });

      res.on('end', () => {
        file.end();
        console.log(`\n✅ Téléchargement terminé (${Math.round(downloaded/1024/1024)} MB)\n`);
        resolve(destPath);
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(180000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── EXTRACTION ZIP ────────────────────────────────────────────
async function extractZip(zipPath, destDir) {
  console.log(`📦 Extraction du ZIP...`);

  // Utilise le module child_process pour lancer unzip (ou PowerShell sur Windows)
  const { execSync } = require('child_process');

  try {
    // Windows: PowerShell Expand-Archive
    execSync(
      `powershell -Command "Expand-Archive -Force -Path '${zipPath}' -DestinationPath '${destDir}'"`,
      { stdio: 'inherit', timeout: 120000 }
    );
    console.log(`✅ Extraction terminée dans ${destDir}\n`);
  } catch (e) {
    throw new Error(`Extraction échouée: ${e.message}`);
  }
}

// ── TRAITEMENT DONNÉES ────────────────────────────────────────
function processData(dataDir) {
  console.log('🔍 Traitement des données BCE...\n');

  const enterpriseFile = path.join(dataDir, 'enterprise.csv');
  const addressFile    = path.join(dataDir, 'address.csv');
  const activityFile   = path.join(dataDir, 'activity.csv');

  if (!fs.existsSync(enterpriseFile)) {
    // Chercher dans les sous-dossiers
    const files = fs.readdirSync(dataDir, { recursive: true });
    const found = files.find(f => f.endsWith('enterprise.csv'));
    if (found) return processData(path.join(dataDir, path.dirname(found)));
    throw new Error(`enterprise.csv non trouvé dans ${dataDir}`);
  }

  // 1. Charger les adresses wallonnes
  console.log('📍 Étape 1/3 — Adresses wallonnes');
  const addresses = {};
  if (fs.existsSync(addressFile)) {
    const rows = parseCSV(addressFile);
    for (const row of rows) {
      const cp = (row['Zipcode'] || row['ZipCode'] || '').trim();
      if (WALLONIE_CP.has(cp)) {
        const num = (row['EntityNumber'] || '').trim();
        if (num) {
          addresses[num] = {
            cp,
            commune: (row['MunicipalityFR'] || row['Municipality'] || '').trim(),
            rue:     (row['StreetFR'] || row['Street'] || '').trim(),
            num_rue: (row['HouseNumber'] || '').trim(),
          };
        }
      }
    }
  }
  console.log(`   ✅ ${Object.keys(addresses).length.toLocaleString()} adresses wallonnes\n`);

  // 2. Charger les activités NACE cibles
  console.log('🏭 Étape 2/3 — Activités NACE cibles');
  const activities = {};
  if (fs.existsSync(activityFile)) {
    const rows = parseCSV(activityFile);
    for (const row of rows) {
      const num  = (row['EntityNumber'] || '').trim();
      const nace = (row['NaceCode'] || '').trim().substring(0, 4);
      if (NACE_CIBLES[nace] && !activities[num]) {
        activities[num] = nace;
      }
    }
  }
  console.log(`   ✅ ${Object.keys(activities).length.toLocaleString()} activités NACE\n`);

  // 3. Parser les entreprises
  console.log('🏢 Étape 3/3 — Filtrage entreprises');
  const rows = parseCSV(enterpriseFile);
  const leads = [];
  let skipped = 0;

  for (const row of rows) {
    if (leads.length >= MAX_LEADS) break;

    const num    = (row['EnterpriseNumber'] || '').trim();
    const status = (row['Status'] || '').trim();

    if (status !== 'Active') { skipped++; continue; }
    if (!addresses[num])     { skipped++; continue; }

    const addr = addresses[num];
    const nace = activities[num] || '';
    const nom  = (row['Name'] || row['Denomination'] || `Entreprise ${num}`).trim();

    leads.push({
      num,
      nom:      nom || `Entreprise ${num}`,
      forme:    (row['JuridicalForm'] || '').trim(),
      cp:       addr.cp,
      commune:  addr.commune,
      rue:      `${addr.rue} ${addr.num_rue}`.trim(),
      nace:     NACE_CIBLES[nace] || nace || 'Autre',
      nace_code: nace,
      tel:      '',
    });
  }

  console.log(`   ✅ ${leads.length.toLocaleString()} leads retenus (${skipped.toLocaleString()} ignorés)\n`);
  return leads;
}

// ── STATS ─────────────────────────────────────────────────────
function printStats(leads) {
  console.log('📊 Top 10 communes:');
  const communes = {};
  for (const l of leads) {
    communes[l.commune] = (communes[l.commune] || 0) + 1;
  }
  Object.entries(communes)
    .sort((a,b) => b[1]-a[1])
    .slice(0,10)
    .forEach(([c,n]) => console.log(`   ${c.padEnd(25)} ${n} entreprises`));

  console.log('\n📊 Top secteurs NACE:');
  const naces = {};
  for (const l of leads) {
    naces[l.nace] = (naces[l.nace] || 0) + 1;
  }
  Object.entries(naces)
    .sort((a,b) => b[1]-a[1])
    .slice(0,8)
    .forEach(([n,c]) => console.log(`   ${n.padEnd(35)} ${c}`));
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(60));
  console.log('  GAELE PRO — Scraper BCE Open Data (Node.js)');
  console.log(`  ${new Date().toLocaleDateString('fr-BE', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}`);
  console.log('═'.repeat(60) + '\n');

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const zipPath         = path.join(DATA_DIR, 'bce_data.zip');
  const enterpriseFile  = path.join(DATA_DIR, 'enterprise.csv');

  // Vérifier si données déjà présentes
  const enterpriseFile  = path.join(DATA_DIR, 'enterprise.csv');
  if (fs.existsSync(enterpriseFile)) {
    console.log(`📂 Données BCE trouvées dans '${DATA_DIR}'`);
  } else {
    console.error(`\n❌ Erreur : Fichiers BCE non trouvés dans ${DATA_DIR}`);
    console.log('\n💡 Procédure manuelle INDISPENSABLE :');
    console.log('   1. Allez sur: https://kbopub.economie.fgov.be/kbo-open-data/login');
    console.log('   2. Créez un compte gratuit et téléchargez le fichier "Complet" (ZIP).');
    console.log('   3. Extrayez les fichiers .csv dans: scripts/bce_data/');
    console.log('   4. Relancez ce script sur votre ordinateur.\n');
    process.exit(1);
  }

  // Traiter
  const leads = processData(DATA_DIR);

  if (leads.length === 0) {
    console.error('⚠️  Aucun lead trouvé. Vérifiez les fichiers CSV.');
    process.exit(1);
  }

  // Stats
  printStats(leads);

  // Export JSON
  console.log(`\n💾 Export JSON...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(leads, null, 2), 'utf-8');
  console.log(`✅ Fichier généré: ${OUTPUT_PATH}`);
  console.log(`   → ${leads.length} entreprises B2B wallonnes`);
  console.log(`\n🚀 Terminé ! Ouvre Gaele Pro → CRM → onglet 'B2B Wallonie'\n`);
}

main().catch(e => { console.error('❌ Erreur fatale:', e); process.exit(1); });
