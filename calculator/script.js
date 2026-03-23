/**
 * GAELE XL - Premium Calculator Logic 2026
 * Comprehensive Business Logic Fix
 */

console.log("GAELE_XL_PREMIUM_V1_2026_FULL_FIX");

// --- CONSTANTS ---
let GAELE_KWH = 0.2703;
let GAELE_IDX = 0.02; 
let MARCHE_IDX = 0.035; 
let S2_DEP = 0.60;
let S3_DEP = 0.40;
const PRIX_WC = 1.1;
const POWER_PER_PANEL = 430;
const PRIX_BATTERIE = 7000;
const ASSURANCE_AN = 75;

const CONSO_PAR_PERS = {
  1: 1800, 2: 2800, 3: 3500, 4: 4200, 5: 5000, 6: 5800, 7: 6500, 8: 7200
};

// --- HELPERS ---
const fmt = (n, dec = 0) => n.toLocaleString('fr-BE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtE = (n) => fmt(Math.round(n)) + ' €';

let chartInstance = null;
let consoIsManual = false;

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://adebczvhvxajiyeeyerx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWJjenZodnhhaml5ZWV5ZXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzE2MDIsImV4cCI6MjA4NzQ0NzYwMn0._wGnpo7sHJeGYHLLdATgWxss8ySVnCZ0UQU5VB6nhhY';
const ADMIN_EMAILS = ['bmf.amk@gmail.com', 'fabrice.kyams@gmail.com'];
let _supabase = null;
if (typeof supabase !== 'undefined') {
  _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error("Supabase CDN not loaded!");
}

// --- AUTH LOGIC ---
async function checkAuth() {
  console.log("Checking authentication...");
  if (!_supabase) {
    console.warn("Supabase not available, bypass auth (offline mode).");
    showApp();
    return;
  }
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user && ADMIN_EMAILS.includes(session.user.email)) {
      console.log("Authenticated as:", session.user.email);
      showApp();
    } else {
      console.log("Not authenticated or not admin.");
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('app').style.display = 'none';
    }
  } catch (e) {
    console.error("Auth check failed:", e);
    showApp(); // Fallback to let them use the calculator
  }
}

window.login = async function() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.style.display = 'none';

  if (!email || !password) {
    errorEl.textContent = "Email et mot de passe requis.";
    errorEl.style.display = 'block';
    return;
  }

  if (!ADMIN_EMAILS.includes(email)) {
    errorEl.textContent = "Accès réservé aux conseillers Gaele.";
    errorEl.style.display = 'block';
    return;
  }

  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = "Identifiants incorrects.";
    errorEl.style.display = 'block';
  } else {
    showApp();
  }
}

window.logout = async function() {
  await _supabase.auth.signOut();
  window.location.reload();
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  update();
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNavigation();
  setupInputs();
  updateEntretien();
  
  const btn = document.querySelector('.advanced-toggle');
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      toggleAdvanced();
    };
  }

  // NEW: Responsive Chart Redraw
  window.addEventListener('resize', () => {
    if (document.getElementById('tab-graphique').classList.contains('active')) {
      drawChart();
    }
  });
});

window.toggleAdvanced = function() {
  const panel = document.getElementById('advanced-panel');
  const chevron = document.getElementById('adv-chevron');
  if (!panel) return;
  const isHidden = panel.style.display === 'none' || panel.style.display === '';
  panel.style.display = isHidden ? 'block' : 'none';
  if (chevron) chevron.textContent = isHidden ? '▲' : '▼';
};

// --- NAVIGATION ---
function setupNavigation() {
  // Inline onclick in HTML handles this now to avoid double-triggering
}



window.showTab = function(id) {
  console.log("Switching to tab:", id);
  // Hide all contents
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  // Show target content
  const target = document.getElementById('tab-' + id);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }

  // Update nav state
  document.querySelectorAll('.nav-item, .nav-btn').forEach(nav => {
    const navTab = nav.getAttribute('data-tab');
    if (navTab === id) nav.classList.add('active');
    else nav.classList.remove('active');
  });

  if (id === 'graphique') setTimeout(drawChart, 100);
  if (id === 'comparatif') update(); // Force update to render mobile cards
};

// --- INPUTS ---
function setupInputs() {
  const mainInputs = ['sl-conso', 'sl-tarif', 'sl-pers'];
  mainInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
        if (id === 'sl-pers') onPersonChange();
        else if (id === 'sl-conso') onConsoManual();
        else update();
    });
  });
}

// --- CORE UPDATER ---
window.update = function() {
  try {
    console.log("window.update() called");
  const consoEl = document.getElementById('sl-conso');
  const tarifEl = document.getElementById('sl-tarif');
  const persEl = document.getElementById('sl-pers');
  if(!consoEl || !tarifEl || !persEl) return;

  const conso = parseFloat(consoEl.value);
  const tarif = parseFloat(tarifEl.value);
  const pers = parseInt(persEl.value);

  // Labels
  if(document.getElementById('val-conso')) document.getElementById('val-conso').textContent = fmt(conso) + ' kWh';
  if(document.getElementById('val-tarif')) document.getElementById('val-tarif').textContent = tarif.toFixed(3).replace('.', ',') + ' €/kWh';
  if(document.getElementById('val-pers')) document.getElementById('val-pers').textContent = pers + ' pers.';

  // Advanced read
  MARCHE_IDX = parseFloat(document.getElementById('sl-idx-marche')?.value || 3.5) / 100;
  GAELE_IDX = parseFloat(document.getElementById('sl-idx-gaele')?.value || 2.0) / 100;
  S2_DEP = parseFloat(document.getElementById('sl-dep-s2')?.value || 60) / 100;
  S3_DEP = parseFloat(document.getElementById('sl-dep-s3')?.value || 40) / 100;

  if(document.getElementById('val-idx-marche')) document.getElementById('val-idx-marche').textContent = (MARCHE_IDX * 100).toFixed(1).replace('.', ',') + '%';
  if(document.getElementById('val-idx-gaele')) document.getElementById('val-idx-gaele').textContent = (GAELE_IDX * 100).toFixed(1).replace('.', ',') + '%';
  if(document.getElementById('val-dep-s2')) document.getElementById('val-dep-s2').textContent = Math.round(S2_DEP * 100) + '%';
  if(document.getElementById('val-dep-s3')) document.getElementById('val-dep-s3').textContent = Math.round(S3_DEP * 100) + '%';

  const factActuelle = conso * tarif;
  const factGaele = conso * GAELE_KWH;
  const ecoAn = factActuelle - factGaele;
  const ecoMois = ecoAn / 12;

  // We need data for some UI labels (Maintenace, Total 25y)
  const dS1 = calculateScenarioYearly('s1', conso, tarif);
  const dS2 = calculateScenarioYearly('s2', conso, tarif);
  const dS3 = calculateScenarioYearly('s3', conso, tarif);
  const dS4 = calculateScenarioYearly('s4', conso, tarif);

  const total25S1 = (dS1.length > 0) ? Math.abs(dS1[dS1.length - 1].cum) : 0;
  const total25S2 = (dS2.length > 0) ? Math.abs(dS2[dS2.length - 1].cum) : 0;
  const total25S3 = (dS3.length > 0) ? Math.abs(dS3[dS3.length - 1].cum) : 0;
  const total25S4 = (dS4.length > 0) ? Math.abs(dS4[dS4.length - 1].cum) : 0;

  const eco25 = total25S1 - total25S4;

  // UI Results
  const mapping = {
    'eco-an': fmtE(ecoAn),
    'eco-sub': `soit ${fmtE(ecoMois)} par mois`,
    'eco-mois': fmtE(ecoMois),
    'eco-25': fmtE(eco25),
    'fact-actuelle': fmtE(factActuelle),
    'fact-gaele': fmtE(factGaele),
    'd-marche': tarif.toFixed(4).replace('.', ',') + ' €',
    'd-gaele': GAELE_KWH.toFixed(4).replace('.', ',') + ' €',
    'd-diff': '-' + (tarif - GAELE_KWH).toFixed(4).replace('.', ',') + ' €',
    'd-pct': '-' + ((tarif - GAELE_KWH) / tarif * 100).toFixed(1) + '%',
    's1-tarif': tarif.toFixed(3).replace('.',',')+'€',
    's2-tarif': tarif.toFixed(3).replace('.',',')+'€ (' + Math.round(S2_DEP*100) + '% Dep)',
    's3-tarif': tarif.toFixed(3).replace('.',',')+'€ (' + Math.round(S3_DEP*100) + '% Dep)',
    's1-fac': fmtE(factActuelle),
    's2-fac': fmtE(factActuelle * S2_DEP),
    's3-fac': fmtE(factActuelle * S3_DEP),
    's4-fac': fmtE(factGaele),
    's4-tarif': GAELE_KWH.toFixed(4).replace('.', ',') + '€ ✓',
    's2-inv': '~' + Math.round((parseInt(document.getElementById('sl-panels')?.value || 10) * POWER_PER_PANEL * PRIX_WC) / 1000) + 'K€',
    's3-inv': '~' + Math.round((parseInt(document.getElementById('sl-panels')?.value || 10) * POWER_PER_PANEL * PRIX_WC + PRIX_BATTERIE) / 1000) + 'K€',
    's2-maint': fmtE(dS2.reduce((acc, d) => acc + d.maint, 0)),
    's3-maint': fmtE(dS3.reduce((acc, d) => acc + d.maint, 0)),
    's1-25': fmtE(total25S1),
    's2-25': fmtE(total25S2),
    's3-25': fmtE(total25S3),
    's4-25': fmtE(total25S4),
    'avantage-s1': fmtE(total25S1 - total25S4),
    's1-maint': '0 €',
    's4-maint': 'Inclus ✓',
    's1-ass': '0 €',
    's2-ass': fmtE(ASSURANCE_AN * 25),
    's3-ass': fmtE(ASSURANCE_AN * 25),
    's4-ass': 'Inclus ✓',
    'g-s1': fmtE(total25S1),
    'g-s4': fmtE(total25S4)
  };

  Object.entries(mapping).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  // MASTER SYNC: Always update all tabs UI
  updateAdvancedLabels();
  updateEntretien();
  
  try { 
    renderMobileCards(conso, tarif, total25S1, total25S2, total25S3, total25S4, dS2, dS3); 
  } catch(rmE) { 
    console.error("Render mobile failed", rmE); 
  }

  } catch (e) {
    console.error("Update failed:", e);
    const errEl = document.getElementById('eco-an');
    if (errEl) errEl.textContent = "Err: " + e.message;
  }
}

function renderMobileCards(conso, tarif, s1_25, s2_25, s3_25, s4_25, dS2, dS3) {
  console.log("renderMobileCards() called");
  const container = document.getElementById('mobile-scenario-cards');
  if (!container) {
    console.warn("Container #mobile-scenario-cards not found");
    return;
  }

  // Force visibility for mobile
  container.style.display = 'block';

  const panels = parseInt(document.getElementById('sl-panels')?.value || 10);
  const inst = panels * POWER_PER_PANEL * PRIX_WC;
  const factGaele = conso * GAELE_KWH;

  // Simple mapping to avoid any complex property access errors
  const scenarioData = [
    { title: 'S1 (Statut Quo)', invest: '0 €', maintenance: '0 €', insurance: '0 €', annual: (conso * tarif), total: s1_25, css: '' },
    { title: 'S2 (PV Seuls)', invest: '~' + Math.round(inst/1000) + 'K€', maintenance: dS2 ? dS2.reduce((a, b) => a + b.maint, 0) : 0, insurance: (ASSURANCE_AN * 25), annual: (conso * tarif * S2_DEP), total: s2_25, css: '' },
    { title: 'S3 (PV + Batt)', invest: '~' + Math.round((inst+PRIX_BATTERIE)/1000) + 'K€', maintenance: dS3 ? dS3.reduce((a, b) => a + b.maint, 0) : 0, insurance: (ASSURANCE_AN * 25), annual: (conso * tarif * S3_DEP), total: s3_25, css: '' },
    { title: 'S4 (Gaele XL) ✨', invest: '0 € ✓', maintenance: 'Inclus', insurance: 'Inclus', annual: factGaele, total: s4_25, css: 'highlight' }
  ];

  let html = '';
  scenarioData.forEach(s => {
    const maintenanceStr = typeof s.maintenance === 'number' ? fmtE(s.maintenance) : s.maintenance;
    const insuranceStr = typeof s.insurance === 'number' ? fmtE(s.insurance) : s.insurance;
    const annualStr = fmtE(s.annual);
    const totalStr = fmtE(s.total);

    html += `
      <div class="scenario-card-mobile ${s.css}">
        <div class="card-header-mobile">
          <span class="card-title-mobile">${s.title}</span>
        </div>
        <div class="card-row-mobile"><span>Investissement</span><span>${s.invest}</span></div>
        <div class="card-row-mobile"><span>Entretien (25a)</span><span>${maintenanceStr}</span></div>
        <div class="card-row-mobile"><span>Assurance (25a)</span><span>${insuranceStr}</span></div>
        <div class="card-row-mobile"><span>Facture / an</span><span>${annualStr}</span></div>
        <div class="card-row-mobile total"><span>Total 25 ans</span><span>${totalStr}</span></div>
      </div>
    `;
  });

  container.innerHTML = html;
  console.log("renderMobileCards() finished successfully");
}


function calculateScenarioYearly(scenario, conso, baseTarif) {
  const mIdx = parseFloat(document.getElementById('sl-idx-marche')?.value || 3.5) / 100;
  const gIdx = parseFloat(document.getElementById('sl-idx-gaele')?.value || 2.0) / 100;
  const s2Dep = parseFloat(document.getElementById('sl-dep-s2')?.value || 60) / 100;
  const s3Dep = parseFloat(document.getElementById('sl-dep-s3')?.value || 40) / 100;
  const panels = parseInt(document.getElementById('sl-panels')?.value || 10);
  const inst = panels * POWER_PER_PANEL * PRIX_WC;
  const ond = parseInt(document.getElementById('sl-ond')?.value || 0);

  let results = [];
  let cumulated = 0;
  let currentTarif = baseTarif;
  let currentGaeleTarif = GAELE_KWH;
  
  // Initial investment
  if (scenario === 's2') cumulated = -inst;
  if (scenario === 's3') cumulated = -(inst + PRIX_BATTERIE); 
  
  for (let y = 1; y <= 25; y++) {
    let elecCost = 0;
    let maintCost = 0;
    
    if (scenario === 's1') elecCost = conso * currentTarif;
    if (scenario === 's2') {
      elecCost = (conso * currentTarif) * s2Dep;
      maintCost = 125 + (y % 5 === 0 ? 200 : 0);
      if (ond === 0 && (y === 10 || y === 20)) maintCost += 1200;
      if (ond === 1 && (y % 10 === 0)) maintCost += 200; // SAV/Monitoring Micro
    }
    if (scenario === 's3') {
      elecCost = (conso * currentTarif) * s3Dep;
      maintCost = 125 + (y % 5 === 0 ? 200 : 0);
      if (ond === 0 && (y === 10 || y === 20)) maintCost += 1200;
      if (y === 12 || y === 24) maintCost += 4500; // Battery replacement
    }
    if (scenario === 's4') elecCost = conso * currentGaeleTarif;

    // Insurance for traditional solar
    const insuranceCost = (scenario === 's2' || scenario === 's3') ? ASSURANCE_AN : 0;

    cumulated -= (elecCost + maintCost + insuranceCost);
    results.push({ year: y, elec: elecCost, maint: maintCost, insurance: insuranceCost, cum: cumulated });
    
    currentTarif *= (1 + mIdx);
    currentGaeleTarif *= (1 + gIdx);
  }
  return results;
}


// NEW: Helper for +/- buttons and label updates
window.changeVal = function(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  let val = parseFloat(el.value) + delta;
  
  // Clamping
  const min = parseFloat(el.min);
  const max = parseFloat(el.max);
  if (val < min) val = min;
  if (val > max) val = max;
  
  el.value = val;
  
  // Master update
  update();
};

window.toggleVal = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = (el.value == 0) ? 1 : 0;
  update();
};

window.updateAdvancedLabels = function() {
  const mIdx = parseFloat(document.getElementById('sl-idx-marche')?.value || 3.5);
  const gIdx = parseFloat(document.getElementById('sl-idx-gaele')?.value || 2.0);
  const s2Dep = parseFloat(document.getElementById('sl-dep-s2')?.value || 60);
  const s3Dep = parseFloat(document.getElementById('sl-dep-s3')?.value || 40);
  const panels = parseInt(document.getElementById('sl-panels')?.value || 10);
  const inst = panels * POWER_PER_PANEL * PRIX_WC;
  const ond = parseInt(document.getElementById('sl-ond')?.value || 0);

  if(document.getElementById('val-idx-marche')) document.getElementById('val-idx-marche').textContent = mIdx.toFixed(1).replace('.', ',') + '%';
  if(document.getElementById('val-idx-gaele')) document.getElementById('val-idx-gaele').textContent = gIdx.toFixed(1).replace('.', ',') + '%';
  if(document.getElementById('val-dep-s2')) document.getElementById('val-dep-s2').textContent = Math.round(s2Dep) + '%';
  if(document.getElementById('val-dep-s3')) document.getElementById('val-dep-s3').textContent = Math.round(s3Dep) + '%';
  if(document.getElementById('val-panels')) document.getElementById('val-panels').textContent = panels;
  if(document.getElementById('val-inst')) document.getElementById('val-inst').textContent = fmtE(inst);
  if(document.getElementById('val-ond')) document.getElementById('val-ond').textContent = (ond === 0) ? 'Central' : 'Micro';
  
  const eInstVal = document.getElementById('e-inst-val');
  if(eInstVal) eInstVal.textContent = fmtE(inst);
  
  const eOnd = document.getElementById('e-ond');
  if(eOnd) eOnd.value = ond;
  const eOndVal = document.getElementById('e-ond-val');
  if(eOndVal) eOndVal.textContent = (ond === 0) ? 'Central' : 'Micro';

};

// --- PERSON & CONSO LOGIC ---
function onPersonChange() {
  const pers = parseInt(document.getElementById('sl-pers').value);
  // OBLIGATORY INFLUENCE: Reset manual flag when person count changes
  consoIsManual = false; 
  
  const autoConso = CONSO_PAR_PERS[pers] || 3500;
  document.getElementById('sl-conso').value = autoConso;
  
  // Sync UI
  updateConsoUI();
  update();
}

function onConsoManual() {
  const conso = parseFloat(document.getElementById('sl-conso').value);
  const pers = parseInt(document.getElementById('sl-pers').value);
  const autoConso = CONSO_PAR_PERS[pers] || 3500;
  
  // Set manual if difference is significant
  if (Math.abs(conso - autoConso) > 50) {
    consoIsManual = true;
  }
  
  updateConsoUI();
  update();
}

function updateConsoUI() {
  const autoLabel = document.getElementById('conso-auto-label');
  const manualBadge = document.getElementById('conso-manual-badge');
  const resetBtn = document.getElementById('conso-reset-btn');
  
  if (consoIsManual) {
    if (autoLabel) autoLabel.style.display = 'none';
    if (manualBadge) manualBadge.style.display = 'inline-block';
    if (resetBtn) resetBtn.style.display = 'inline-block';
  } else {
    if (autoLabel) autoLabel.style.display = 'inline-block';
    if (manualBadge) manualBadge.style.display = 'none';
    if (resetBtn) resetBtn.style.display = 'none';
  }
}

window.resetConsoAuto = function() {
  consoIsManual = false;
  onPersonChange();
};


// --- ENTRETIEN ---
function updateEntretien() {
  const panels = parseInt(document.getElementById('sl-panels')?.value || 10);
  const inst = panels * POWER_PER_PANEL * PRIX_WC;
  const hasBatt = parseInt(document.getElementById('e-batt')?.value || 0) === 1;
  const isMicro = parseInt(document.getElementById('e-ond')?.value || 0) === 1;

  if(document.getElementById('e-inst-val')) document.getElementById('e-inst-val').textContent = fmtE(inst);
  if(document.getElementById('e-batt-val')) document.getElementById('e-batt-val').textContent = hasBatt ? 'Oui' : 'Non';
  if(document.getElementById('e-ond-val')) document.getElementById('e-ond-val').textContent = isMicro ? 'Micro' : 'Central';

  let totalEntretien = 25 * 125; // Nettoyage
  if(!isMicro) totalEntretien += 2400; // Onduleurs
  totalEntretien += 1000; // Contrôles
  if(hasBatt) totalEntretien += 9000; // Batteries

  if(document.getElementById('e-total-invest')) document.getElementById('e-total-invest').textContent = fmtE(inst + (hasBatt?PRIX_BATTERIE:0));
  if(document.getElementById('e-total-entretien')) document.getElementById('e-total-entretien').textContent = fmtE(totalEntretien);

  const eOnd = document.getElementById('e-ond');
  const ondVal = isMicro ? 1 : 0;
  if(eOnd) eOnd.value = ondVal;
}


// --- CHART ---
function drawChart() {
  const canvas = document.getElementById('myChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const conso = parseFloat(document.getElementById('sl-conso').value);
  const tarif = parseFloat(document.getElementById('sl-tarif').value);

  // Layout calculations
  const W = canvas.offsetWidth || 340;
  const H = 220;
  canvas.width = W;
  canvas.height = H;

  const pad = { top: 20, right: 20, bottom: 35, left: 55 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  // Data generation
  // Data generation - Calculate again locally to avoid scope errors
  const dataS1 = calculateScenarioYearly('s1', conso, tarif);
  const dataS2 = calculateScenarioYearly('s2', conso, tarif);
  const dataS3 = calculateScenarioYearly('s3', conso, tarif);
  const dataS4 = calculateScenarioYearly('s4', conso, tarif);

  const dataM = dataS1.map(d => Math.abs(d.cum));
  const data2 = dataS2.map(d => Math.abs(d.cum));
  const data3 = dataS3.map(d => Math.abs(d.cum));
  const data4 = dataS4.map(d => Math.abs(d.cum));

  const maxVal = dataM[24] * 1.1;

  // Background clean
  ctx.clearRect(0,0,W,H);

  // Axes & Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ch - (i / 4) * ch;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Outfit';
    ctx.textAlign = 'right';
    ctx.fillText(fmtE((maxVal / 4) * i), pad.left - 10, y + 4);
  }

  // Draw X Labels
  ctx.textAlign = 'center';
  [0, 4, 9, 14, 19, 24].forEach(idx => {
    const x = pad.left + (idx / 24) * cw;
    ctx.fillText('An ' + (idx + 1), x, pad.top + ch + 20);
  });

  // DRAW PATHS
  // 1. Market (S1) - Red Dashed
  drawPath(ctx, dataM, pad, cw, ch, maxVal, '#E74C3C', [4,4], false);
  // 2. S2 (Panneaux) - Orange
  drawPath(ctx, data2, pad, cw, ch, maxVal, '#f39c12', [2,2], false);
  // 3. S3 (+Batt) - Blue
  drawPath(ctx, data3, pad, cw, ch, maxVal, '#3498db', [2,2], false);
  // 4. Gaele XL (S4) - Gold Solid
  drawPath(ctx, data4, pad, cw, ch, maxVal, '#C9A84C', [], true);
}

function drawPath(ctx, data, pad, cw, ch, max, color, dash, fill) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.setLineDash(dash);
  ctx.lineWidth = fill ? 4 : 1.5;
  data.forEach((v, i) => {
    const x = pad.left + (i / 24) * cw;
    const y = pad.top + ch - (v / max) * ch;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (fill) {
    ctx.lineTo(pad.left + cw, pad.top + ch);
    ctx.lineTo(pad.left, pad.top + ch);
    ctx.fillStyle = 'rgba(201, 168, 76, 0.12)';
    ctx.fill();
  }
}

function selectPers(n) {
  document.getElementById('sl-pers').value = n;
  onPersonChange();
}

