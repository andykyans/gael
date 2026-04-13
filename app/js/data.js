/**
 * GAELEBOT DATA & CONSTANTS
 * Contains all static data, configuration and translations
 */

const TARIFS = {
  GAELE_KWH: 0.2703,       // €/kWh TVA 6% incluse (Particulier)
  MARCHE_KWH: 0.4382,      // €/kWh TVA 6% incluse (Moyen marché 2026)
  GAELE_INFLATION: 0.02,   // 2%/an max
  MARCHE_INFLATION: 0.035, // 3,5%/an average
  FRAIS_DOSSIER: 150,
  PANNEAUX_WC: 400,        // Watts-crête par panneau
  AUTOCONSO_RATE: 0.60,    // 60% average with battery (Residential)
  
  // Professional specific
  PRO_TARIF_HTVA: 0.25,
  PRO_MARCHE_HTVA: 0.40,
  PRO_AUTOCONSO: 0.78,
  
  // GRD Tariffs 2026
  GRD: {
    'ORES':          { dist: 327, prosumer_kwep: 85.84, region: 'wallonie' },
    'RESA':          { dist: 350, prosumer_kwep: 90.17, region: 'wallonie' },
    'AIEG':          { dist: 340, prosumer_kwep: 88.00, region: 'wallonie' },
    'FLUVIUS-ANT':   { dist: 290, prosumer_kwep: 54.63, region: 'flandre' },
    'FLUVIUS-WST':   { dist: 310, prosumer_kwep: 69.59, region: 'flandre' },
    'FLUVIUS-OTHER': { dist: 300, prosumer_kwep: 62.00, region: 'flandre' }
  }
};

const COMMUNES = {
  tubize: { n: 'Tubize', cp: '1480', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  nivelles: { n: 'Nivelles', cp: '1400', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  rebecq: { n: 'Rebecq', cp: '1430', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  braine: { n: 'Braine-le-Comte', cp: '7090', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  soignies: { n: 'Soignies', cp: '7060', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  manage: { n: 'Manage', cp: '7170', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  waterloo: { n: 'Waterloo', cp: '1410', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  ottignies: { n: 'Ottignies-LLN', cp: '1340', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  wavre: { n: 'Wavre', cp: '1300', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  braine_alleud: { n: "Braine-l'Alleud", cp: '1420', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  genappe: { n: 'Genappe', cp: '1470', lang: 'fr', arr: 'Brabant wallon', grd: 'ORES' },
  charleroi: { n: 'Charleroi', cp: '6000', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  la_louviere: { n: 'La Louvière', cp: '7100', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  mons: { n: 'Mons', cp: '7000', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  tournai: { n: 'Tournai', cp: '7500', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  binche: { n: 'Binche', cp: '7130', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  enghien: { n: 'Enghien', cp: '7850', lang: 'fr', arr: 'Hainaut', grd: 'ORES' },
  namur: { n: 'Namur', cp: '5000', lang: 'fr', arr: 'Namur', grd: 'ORES' },
  gembloux: { n: 'Gembloux', cp: '5030', lang: 'fr', arr: 'Namur', grd: 'ORES' },
  andenne: { n: 'Andenne', cp: '5300', lang: 'fr', arr: 'Namur', grd: 'RESA' },
  liege: { n: 'Liège', cp: '4000', lang: 'fr', arr: 'Liège', grd: 'RESA' },
  seraing: { n: 'Seraing', cp: '4100', lang: 'fr', arr: 'Liège', grd: 'RESA' },
  verviers: { n: 'Verviers', cp: '4800', lang: 'fr', arr: 'Liège', grd: 'RESA' },
  huy: { n: 'Huy', cp: '4500', lang: 'fr', arr: 'Liège', grd: 'RESA' },
  spa: { n: 'Spa', cp: '4900', lang: 'fr', arr: 'Liège', grd: 'RESA' },
  arlon: { n: 'Arlon', cp: '6700', lang: 'fr', arr: 'Luxembourg', grd: 'RESA' },
  gent: { n: 'Gent', cp: '9000', lang: 'nl', arr: 'Oost-Vlaanderen', grd: 'FLUVIUS-OTHER' },
  leuven: { n: 'Leuven', cp: '3000', lang: 'nl', arr: 'Vlaams-Brabant', grd: 'FLUVIUS-OTHER' },
  antwerpen: { n: 'Antwerpen', cp: '2000', lang: 'nl', arr: 'Antwerpen', grd: 'FLUVIUS-ANT' },
  brugge: { n: 'Brugge', cp: '8000', lang: 'nl', arr: 'West-Vlaanderen', grd: 'FLUVIUS-WST' }
};

const ROUTES = {
  tubize: ['Rue du Bailli', 'Rue des Forges', 'Rue de Mons', 'Rue Ferrer', 'Rue Albert 1er'],
  nivelles: ['Rue Emile Bruyant', 'Rue de Mons', 'Avenue des Combattants'],
  waterloo: ['Chaussée de Bruxelles', 'Rue de la Station', 'Avenue de la Forêt'],
  default: ['Rue du Centre', 'Rue de la Station', 'Rue des Érables']
};

const CONSO_PRO_MOY = {
  all: 15000,
  artisan: 20000,
  commerce: 15000,
  bureau: 10000,
  entrepot: 25000
};

const PLANNING = [
  { j: 1, h: '14h–18h', zone: 'Tubize centre', target: 50, tip: 'Rue du Bailli, Rue des Forges' },
  { j: 1, h: 'Admin', zone: 'Rappels + Suivi CRM', target: 0, tip: 'Relancer les prospects' },
  { j: 3, h: '14h–18h', zone: 'Nivelles', target: 50, tip: 'Mercredi profitez des parents' },
  { j: 6, h: '10h–13h', zone: 'Meilleur créneau', target: 60, tip: 'Samedi matin = Top dispo' }
];

const SCRIPTS = {
  fr: {
    intro: "Bonjour ! Je me permets de sonner car on fait un rapide sondage énergie dans le quartier. Juste 3 questions — vous êtes propriétaire ici ?",
    objection_arnaque: "Je comprends totalement. Mais regardez qui est derrière : le SFPIM, le fonds souverain belge — c'est l'État belge lui-même qui a investi 50 millions d'euros. L'État n'investit pas dans des arnaques.",
    objection_0euro: "Exactement 0€ d'investissement. Gaele XL installe, entretient et gère tout. Votre seule dépense est un tarif fixe hyper compétitif garanti 25 ans."
  },
  nl: {
    intro: "Goedemiddag! Ik bel even aan voor een korte enquête over energie in de buurt. Slechts 3 vragen — bent u hier de eigenaar?",
    objection_arnaque: "Ik begrijp uw scepsis. Maar kijk wie erachter zit: SFPIM, het Belgische soevereine fonds. De staat heeft 50 miljoen euro geïnvesteerd. Dat doen ze niet zomaar."
  }
};
