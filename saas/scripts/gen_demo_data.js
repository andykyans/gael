#!/usr/bin/env node
// Génère un fichier bce_wallonie.json de démonstration
// avec des données réalistes pour tester l'app Gaele Pro

const fs   = require('fs');
const path = require('path');

const communes = [
  { nom: 'Tubize',          cp: '1480', province: 'Brabant wallon' },
  { nom: 'Nivelles',        cp: '1400', province: 'Brabant wallon' },
  { nom: 'Braine-le-Comte', cp: '7090', province: 'Hainaut'        },
  { nom: 'Rebecq',          cp: '1430', province: 'Brabant wallon' },
  { nom: 'Manage',          cp: '7170', province: 'Hainaut'        },
  { nom: 'La Louvière',     cp: '7100', province: 'Hainaut'        },
  { nom: 'Mons',            cp: '7000', province: 'Hainaut'        },
  { nom: 'Charleroi',       cp: '6000', province: 'Hainaut'        },
  { nom: 'Namur',           cp: '5000', province: 'Namur'          },
  { nom: 'Liège',           cp: '4000', province: 'Liège'          },
  { nom: 'Wavre',           cp: '1300', province: 'Brabant wallon' },
  { nom: 'Ottignies',       cp: '1340', province: 'Brabant wallon' },
  { nom: 'Soignies',        cp: '7060', province: 'Hainaut'        },
  { nom: 'Binche',          cp: '7130', province: 'Hainaut'        },
  { nom: 'Thuin',           cp: '6530', province: 'Hainaut'        },
  { nom: 'Philippeville',   cp: '5600', province: 'Namur'          },
  { nom: 'Dinant',          cp: '5500', province: 'Namur'          },
  { nom: 'Marche-en-Famenne', cp: '6900', province: 'Luxembourg'   },
  { nom: 'Arlon',           cp: '6700', province: 'Luxembourg'     },
  { nom: 'Verviers',        cp: '4800', province: 'Liège'          },
  { nom: 'Huy',             cp: '4500', province: 'Liège'          },
  { nom: 'Seraing',         cp: '4100', province: 'Liège'          },
  { nom: 'Gembloux',        cp: '5030', province: 'Namur'          },
  { nom: 'Andenne',         cp: '5300', province: 'Namur'          },
  { nom: 'Tournai',         cp: '7500', province: 'Hainaut'        },
  { nom: 'Mouscron',        cp: '7700', province: 'Hainaut'        },
  { nom: 'Lessines',        cp: '7860', province: 'Hainaut'        },
  { nom: 'Enghien',         cp: '7850', province: 'Hainaut'        },
  { nom: 'Braine-l\'Alleud', cp: '1420', province: 'Brabant wallon'},
  { nom: 'Court-Saint-Étienne', cp: '1490', province: 'Brabant wallon'},
];

const secteurs = [
  { nace: '4321', label: 'Installation électrique'      },
  { nace: '4391', label: 'Travaux couverture'            },
  { nace: '4120', label: 'Construction résidentielle'    },
  { nace: '4322', label: 'Plomberie / chauffage'         },
  { nace: '6831', label: 'Agences immobilières'          },
  { nace: '6820', label: 'Location immobilier'           },
  { nace: '4399', label: 'Autres construction'           },
  { nace: '0141', label: 'Élevage bovins'                },
  { nace: '0147', label: 'Élevage volailles'             },
  { nace: '4711', label: 'Supermarchés'                  },
  { nace: '5610', label: 'Restaurants'                   },
  { nace: '4122', label: 'Construction bâtiments'        },
];

const formes = ['SRL', 'SA', 'SNC', 'SPRL', 'ASBL', 'SCS', 'Indépendant'];

const rues = [
  'Rue du Centre', 'Rue de la Station', 'Avenue du Roi', 'Rue de Mons',
  'Chaussée de Bruxelles', 'Rue du Commerce', 'Rue des Artisans',
  'Rue de Namur', 'Avenue de la Gare', 'Rue du Moulin',
  'Rue des Entrepreneurs', 'Route de Nivelles', 'Chemin du Moulin',
  'Rue de la Forêt', 'Avenue du Parc', 'Rue des Champs',
];

const prefixes = [
  'Toiture', 'Construction', 'Rénovation', 'Installation', 'Électricité',
  'Plomberie', 'Bâtiment', 'Immo', 'Chauffage', 'Couverture',
  'Isolation', 'Entreprise', 'Travaux', 'Services', 'Solutions',
];

const suffixes = [
  'Wallonie', 'Sud', 'Ardennes', 'Meuse', 'Hainaut', 'Pro', 'Express',
  'Plus', 'Service', 'Concept', 'Group', 'Partners', 'Horizon',
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function padNum(n, len) { return String(n).padStart(len, '0'); }

// Générer un numéro BCE fictif réaliste
function bceNum(i) {
  return `${padNum(randInt(400, 999), 4)}.${padNum(i % 1000, 3)}.${padNum(randInt(100, 999), 3)}`;
}

function genNom(i) {
  const mode = i % 4;
  if (mode === 0) return `${rand(prefixes)} ${rand(suffixes)}`;
  if (mode === 1) return `${rand(prefixes)} & ${rand(suffixes)}`;
  if (mode === 2) {
    const initiales = String.fromCharCode(65 + i % 26) + String.fromCharCode(65 + (i*3) % 26);
    return `${initiales} ${rand(secteurs).label.split(' ')[0]}`;
  }
  return `${rand(prefixes)} ${rand(communes).nom}`;
}

// Générer les leads
const leads = [];
const TARGET = 800;

for (let i = 0; i < TARGET; i++) {
  const commune = rand(communes);
  const secteur = rand(secteurs);
  const forme   = rand(formes);
  const rue     = rand(rues);
  const numRue  = randInt(1, 120);
  const nom     = genNom(i);

  // Tel fictif (optionnel, certains n'en ont pas)
  const hasTel = Math.random() > 0.65;
  const tel    = hasTel ? `0${rand(['2', '4', '7'])}${randInt(100, 999)} ${randInt(10, 99)} ${randInt(10, 99)}` : '';

  leads.push({
    num:       bceNum(i),
    nom,
    forme,
    cp:        commune.cp,
    commune:   commune.nom,
    rue:       `${rue} ${numRue}`,
    province:  commune.province,
    nace:      secteur.label,
    nace_code: secteur.nace,
    tel,
    demo: true, // Marqueur: données de démonstration uniquement
  });
}

// Mélanger pour distribution réaliste
leads.sort(() => Math.random() - 0.5);

const outputPath = path.join(__dirname, 'bce_wallonie.json');
fs.writeFileSync(outputPath, JSON.stringify(leads, null, 2), 'utf-8');

// Stats
const byCommune = {};
const bySecteur = {};
leads.forEach(l => {
  byCommune[l.commune] = (byCommune[l.commune] || 0) + 1;
  bySecteur[l.nace]    = (bySecteur[l.nace]    || 0) + 1;
});

console.log('✅ bce_wallonie.json généré !');
console.log(`   → ${leads.length} entreprises B2B wallonnes (données démo)\n`);
console.log('📊 Top communes:');
Object.entries(byCommune).sort((a,b)=>b[1]-a[1]).slice(0,8)
  .forEach(([c,n]) => console.log(`   ${c.padEnd(25)} ${n}`));
console.log('\n📊 Top secteurs:');
Object.entries(bySecteur).sort((a,b)=>b[1]-a[1]).slice(0,6)
  .forEach(([s,n]) => console.log(`   ${s.padEnd(35)} ${n}`));
console.log('\n🚀 Lance Gaele Pro → CRM → onglet B2B Wallonie');
console.log('⚠️  Ces données sont FICTIVES (demo). Lance node bce_scraper_node.js pour les vraies données BCE.\n');
