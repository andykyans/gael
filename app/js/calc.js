/**
 * GAELEBOT CALCULATION LOGIC
 * Reusable, side-effect free math for energy simulations
 */


function calculateEnergySimulation(params) {
  const {
    isPro = false,
    proType = 'all',
    consoKwhInput = null,
    factureInput = null,
    grdKey = 'ORES',
    surf = 40,
    sun = 1100,
    maxPanelsLimit = null
  } = params;

  const config = TARIFS;
  const grd = config.GRD[grdKey] || config.GRD['ORES'];
  
  let consoKwh, factureMarket;

  // 1. Determine Consumption
  if (isPro) {
    consoKwh = consoKwhInput || CONSO_PRO_MOY[proType] || CONSO_PRO_MOY.all;
    factureMarket = consoKwh * config.PRO_MARCHE_HTVA + grd.dist;
  } else if (factureInput) {
    factureMarket = factureInput;
    consoKwh = Math.round((factureMarket - grd.dist) / config.MARCHE_KWH);
    consoKwh = Math.max(500, consoKwh);
  } else if (consoKwhInput) {
    consoKwh = consoKwhInput;
    factureMarket = consoKwh * config.MARCHE_KWH + grd.dist;
  } else {
    // Default fallback
    consoKwh = 3500;
    factureMarket = consoKwh * config.MARCHE_KWH + grd.dist;
  }

  // 2. Solar Sizing
  // Standard calculation: panels needed for ~70% coverage
  const panelsNeeded = Math.ceil(consoKwh * 0.70 / (sun * 0.40 * 0.85));
  const panelsMax = maxPanelsLimit || Math.floor(surf / 2); // heuristic
  const panels = Math.max(8, Math.min(panelsMax || 50, panelsNeeded));
  const kWc = panels * config.PANNEAUX_WC / 1000;
  const prodNette = kWc * sun * 0.85;
  const autoConsoRatio = isPro ? config.PRO_AUTOCONSO : config.AUTOCONSO_RATE;
  const autoConso = prodNette * autoConsoRatio;

  // 3. Gaele XL Economics
  const tarifGaele = isPro ? config.PRO_TARIF_HTVA : config.GAELE_KWH;
  const factureGaele = (consoKwh - autoConso) * tarifGaele + grd.dist;
  const prosumerEvite = kWc * grd.prosumer_kwep;
  const econAn = factureMarket - factureGaele + prosumerEvite;
  const ecoPercent = Math.round((econAn / factureMarket) * 100);

  // 4. 25-Year Projection
  let totalSans = 0;
  let totalAvec = config.FRAIS_DOSSIER;
  const inflMkt = isPro ? config.MARCHE_INFLATION : config.MARCHE_INFLATION;
  const inflGxl = isPro ? config.GAELE_INFLATION : config.GAELE_INFLATION;

  for (let i = 0; i < 25; i++) {
    totalSans += factureMarket * Math.pow(1 + inflMkt, i);
    totalAvec += factureGaele * Math.pow(1 + inflGxl, i);
  }

  return {
    consoKwh,
    factureMarket,
    factureGaele,
    econAn,
    ecoPercent: Math.min(ecoPercent, 99),
    totalSans: Math.round(totalSans),
    totalAvec: Math.round(totalAvec),
    gain25: Math.round(totalSans - totalAvec),
    panels,
    kWc,
    prodNette,
    prosumerEvite,
    grdInfo: { key: grdKey, dist: grd.dist }
  };
}

function formatEuro(value) {
  return Math.round(value).toLocaleString('fr-BE') + '€';
}
