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

const CONSO_PAR_PERS = {
  1: 1800, 2: 2800, 3: 3500, 4: 4200, 5: 5000, 6: 5800, 7: 6500, 8: 7200
};

// --- HELPERS ---
const fmt = (n, dec = 0) => n.toLocaleString('fr-BE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtE = (n) => fmt(Math.round(n)) + ' €';

let chartInstance = null;
let consoIsManual = false;
const questions = {1: null, 2: null, 3: null, 4: null, 5: null};

// --- SUPABASE CONFIG ---
const SUPABASE_URL = 'https://adebczvhvxajiyeeyerx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWJjenZodnhhaml5ZWV5ZXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzE2MDIsImV4cCI6MjA4NzQ0NzYwMn0._wGnpo7sHJeGYHLLdATgWxss8ySVnCZ0UQU5VB6nhhY';
const ADMIN_EMAILS = ['bmf.amk@gmail.com', 'fabrice.kyams@gmail.com'];
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- AUTH LOGIC ---
async function checkAuth() {
  console.log("Checking authentication...");
  const { data: { session } } = await _supabase.auth.getSession();
  if (session && session.user && ADMIN_EMAILS.includes(session.user.email)) {
    console.log("Authenticated as:", session.user.email);
    showApp();
  } else {
    console.log("Not authenticated or not admin.");
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
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
  updateEligibility();
  
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
  if (id === 'amortissement') renderAmortizationTables();
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

  const total25S1 = Math.abs(dS1[24].cum);
  const total25S2 = Math.abs(dS2[24].cum);
  const total25S3 = Math.abs(dS3[24].cum);
  const total25S4 = Math.abs(dS4[24].cum);

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
    's2-inv': '~' + Math.round(parseFloat(document.getElementById('sl-inst')?.value || 6000)/1000) + 'K€',
    's3-inv': '~' + Math.round((parseFloat(document.getElementById('sl-inst')?.value || 6000) + 4000)/1000) + 'K€',
    's2-maint': fmtE(dS2.reduce((acc, d) => acc + d.maint, 0)),
    's3-maint': fmtE(dS3.reduce((acc, d) => acc + d.maint, 0)),
    's1-25': fmtE(total25S1),
    's2-25': fmtE(total25S2),
    's3-25': fmtE(total25S3),
    's4-25': fmtE(total25S4),
    'avantage-s1': fmtE(eco25),
    'g-s1': fmtE(total25S1),
    'g-s4': fmtE(total25S4)
  };

  Object.entries(mapping).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  updateEligibility();
  updatePitch(conso, factActuelle, factGaele, ecoAn, ecoMois, eco25);
  renderAmortizationTables();
  renderMobileCards(conso, tarif, total25S1, total25S2, total25S3, total25S4);
}

function renderMobileCards(conso, tarif, s1_25, s2_25, s3_25, s4_25) {
  const container = document.getElementById('mobile-scenario-cards');
  if (!container) return;

  const inst = parseFloat(document.getElementById('sl-inst')?.value || 6000);
  const factGaele = conso * GAELE_KWH;

  const scenarios = [
    { name: 'S1 (Rien)', inv: '0 €', fac: fmtE(conso * tarif), 25: fmtE(s1_25), class: '' },
    { name: 'S2 (Panneaux)', inv: '~' + Math.round(inst/1000) + 'K€', fac: fmtE(conso * tarif * S2_DEP), 25: fmtE(s2_25), class: '' },
    { name: 'S3 (+Batterie)', inv: '~' + Math.round((inst+4000)/1000) + 'K€', fac: fmtE(conso * tarif * S3_DEP), 25: fmtE(s3_25), class: '' },
    { name: 'Gaele XL ✨', inv: '0 € ✓', fac: fmtE(factGaele), 25: fmtE(s4_25), class: 'highlight' }
  ];

  container.innerHTML = scenarios.map(s => `
    <div class="scenario-card-mobile ${s.class}">
      <div class="card-header-mobile">
        <span class="card-title-mobile">${s.name}</span>
      </div>
      <div class="card-row-mobile"><span>Investissement</span><span>${s.inv}</span></div>
      <div class="card-row-mobile"><span>Facture / an</span><span>${s.fac}</span></div>
      <div class="card-row-mobile total"><span>Total 25 ans</span><span>${s['25']}</span></div>
    </div>
  `).join('');
}

// Helper specific for the detailed residual value table (pro style)
function calculateResidualValue(baseAmount) {
  const years = 25;
  const yearlyDep = baseAmount / years;
  let results = [];
  let startYear = 2027;

  for (let y = 0; y < years; y++) {
    const totalDep = yearlyDep * (y + 1);
    const residualHT = baseAmount - totalDep;
    results.push({
      year: startYear + y,
      base: baseAmount,
      depAn: yearlyDep,
      depTotal: totalDep,
      residualHT: Math.max(0, residualHT),
      residual6: Math.max(0, residualHT * 1.06),
      residual21: Math.max(0, residualHT * 1.21)
    });
  }
  return results;
}

function calculateScenarioYearly(scenario, conso, baseTarif) {
  const mIdx = parseFloat(document.getElementById('sl-idx-marche')?.value || 3.5) / 100;
  const gIdx = parseFloat(document.getElementById('sl-idx-gaele')?.value || 2.0) / 100;
  const s2Dep = parseFloat(document.getElementById('sl-dep-s2')?.value || 60) / 100;
  const s3Dep = parseFloat(document.getElementById('sl-dep-s3')?.value || 40) / 100;
  const inst = parseFloat(document.getElementById('sl-inst')?.value || 6000);
  const ond = parseInt(document.getElementById('sl-ond')?.value || 0);

  let results = [];
  let cumulated = 0;
  let currentTarif = baseTarif;
  let currentGaeleTarif = GAELE_KWH;
  
  // Initial investment
  if (scenario === 's2') cumulated = -inst;
  if (scenario === 's3') cumulated = -(inst + 4000); // 4k extra for battery
  
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

    cumulated -= (elecCost + maintCost);
    results.push({ year: y, elec: elecCost, maint: maintCost, cum: cumulated });
    
    currentTarif *= (1 + mIdx);
    currentGaeleTarif *= (1 + gIdx);
  }
  return results;
}

function renderAmortizationTables() {
  const root = document.getElementById('amort-tables-root');
  if (!root) return;
  
  const conso = parseFloat(document.getElementById('sl-conso')?.value || 3500);
  const tarif = parseFloat(document.getElementById('sl-tarif')?.value || 0.435);
  const inst = parseFloat(document.getElementById('sl-inst')?.value || 6000);
  
  // Part 1: Residual Value (Inspired by image)
  const resData = calculateResidualValue(inst);
  let resRows = '';
  resData.forEach((d, idx) => {
    resRows += `
      <tr>
        <td class="idx-col">${idx + 1}</td>
        <td>${d.year}</td>
        <td>${fmtE(d.base)}</td>
        <td>${fmtE(d.depAn)}</td>
        <td>${fmtE(d.depTotal)}</td>
        <td class="res-col res-ht">${fmtE(d.residualHT)}</td>
        <td class="res-col res-6" style="color:#27AE60">${fmtE(d.residual6)}</td>
        <td class="res-col res-21" style="color:#2980b9">${fmtE(d.residual21)}</td>
      </tr>
    `;
  });

  const resHtml = `
    <div class="pro-amort-wrapper" style="margin-bottom: 30px; border-top-color: var(--green);">
      <div class="pro-header">
        <div class="pro-title">VALEUR RÉSIDUELLE INSTALLATION (TABLEAU DÉGRESSIF)</div>
        <div class="pro-disclaimer">Indicateur d'amortissement comptable de l'actif (durée 25 ans)</div>
      </div>
      <table class="pro-amort-table">
        <thead>
          <tr class="sub-header">
            <th>#</th>
            <th>Année</th>
            <th>Base HT</th>
            <th>Amort. An</th>
            <th>Cumul Amort.</th>
            <th>Résiduel HT</th>
            <th>TVA 6% Incl.</th>
            <th>TVA 21% Incl.</th>
          </tr>
        </thead>
        <tbody>${resRows}</tbody>
      </table>
    </div>
  `;

  // Part 2: Comparative Situations (Requested by user)
  const scenarios = [
    { id: 's1', label: 'S1 : Situation Marché', color: 'var(--red)' },
    { id: 's2', label: 'S2 : Panneaux Seuls', color: 'var(--blue)' },
    { id: 's3', label: 'S3 : Panneaux + Batterie', color: '#e67e22' },
    { id: 's4', label: 'S4 : Solution Gaele XL ✨', color: 'var(--or)' }
  ];

  const dataS1 = calculateScenarioYearly('s1', conso, tarif);
  let situationsHtml = '';

  scenarios.forEach(sc => {
    const data = calculateScenarioYearly(sc.id, conso, tarif);
    let rows = '';
    let foundBreakEven = false;
    
    data.forEach((d, idx) => {
      const s1Cumul = dataS1[idx].cum;
      const isBetter = d.cum > s1Cumul;
      let breakEvenClass = '';
      
      if (!foundBreakEven && sc.id !== 's1' && isBetter) {
        foundBreakEven = true;
        breakEvenClass = 'pro-break-even';
      }
      
      const cumulVal = Math.round(d.cum);
      const cumulClass = cumulVal < 0 ? 'neg' : 'pos';

      rows += `
        <tr class="${breakEvenClass}">
          <td class="idx-col">${d.year}</td>
          <td>${fmtE(d.elec)}</td>
          <td>${d.maint > 0 ? fmtE(d.maint) : '—'}</td>
          <td class="res-col ${cumulClass}">${fmtE(d.cum)}</td>
        </tr>
      `;
    });

    situationsHtml += `
      <div class="pro-amort-wrapper scenario-card">
        <div class="pro-header" style="border-bottom-color: ${sc.color}">
          <div class="pro-title" style="color: ${sc.color}">${sc.label}</div>
          <div class="pro-disclaimer">Évolution financière (Cumul économies vs investissement)</div>
        </div>
        <table class="pro-amort-table">
          <thead>
            <tr>
              <th>An</th>
              <th>Élec.</th>
              <th>Maint.</th>
              <th style="text-align:right">Cumulé</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  });
  
  root.innerHTML = `
    ${resHtml}
    <h2 class="section-divider">📈 Évolution Comparative des Situations</h2>
    <div class="multi-amort-grid">${situationsHtml}</div>
  `;
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
  updateAdvancedLabels();
};

window.toggleVal = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = (el.value == 0) ? 1 : 0;
  updateAdvancedLabels();
};

window.updateAdvancedLabels = function() {
  const mIdx = parseFloat(document.getElementById('sl-idx-marche')?.value || 3.5);
  const gIdx = parseFloat(document.getElementById('sl-idx-gaele')?.value || 2.0);
  const s2Dep = parseFloat(document.getElementById('sl-dep-s2')?.value || 60);
  const s3Dep = parseFloat(document.getElementById('sl-dep-s3')?.value || 40);
  const inst = parseFloat(document.getElementById('sl-inst')?.value || 6000);
  const ond = parseInt(document.getElementById('sl-ond')?.value || 0);

  if(document.getElementById('val-idx-marche')) document.getElementById('val-idx-marche').textContent = mIdx.toFixed(1).replace('.', ',') + '%';
  if(document.getElementById('val-idx-gaele')) document.getElementById('val-idx-gaele').textContent = gIdx.toFixed(1).replace('.', ',') + '%';
  if(document.getElementById('val-dep-s2')) document.getElementById('val-dep-s2').textContent = Math.round(s2Dep) + '%';
  if(document.getElementById('val-dep-s3')) document.getElementById('val-dep-s3').textContent = Math.round(s3Dep) + '%';
  if(document.getElementById('val-inst')) document.getElementById('val-inst').textContent = inst.toLocaleString() + '€';
  if(document.getElementById('val-ond')) document.getElementById('val-ond').textContent = (ond === 0) ? 'Central' : 'Micro';
  
  // Sync with Entretien Tab if it exists
  const eInst = document.getElementById('e-inst');
  if(eInst) eInst.value = inst;
  const eInstVal = document.getElementById('e-inst-val');
  if(eInstVal) eInstVal.textContent = inst.toLocaleString() + ' €';
  
  const eOnd = document.getElementById('e-ond');
  if(eOnd) eOnd.value = ond;
  const eOndVal = document.getElementById('e-ond-val');
  if(eOndVal) eOndVal.textContent = (ond === 0) ? 'Central' : 'Micro';

  updateEntretien();
};

// --- PERSON & CONSO LOGIC ---
function onPersonChange() {
  const pers = parseInt(document.getElementById('sl-pers').value);
  if (!consoIsManual) {
    const autoConso = CONSO_PAR_PERS[pers] || 3500;
    document.getElementById('sl-conso').value = autoConso;
  }
  update();
}

function onConsoManual() {
  const conso = parseFloat(document.getElementById('sl-conso').value);
  const pers = parseInt(document.getElementById('sl-pers').value);
  const autoConso = CONSO_PAR_PERS[pers] || 3500;
  consoIsManual = Math.abs(conso - autoConso) > 50;
  update();
}

// --- ELIGIBILITY ---
const weights = { 1: {oui: 35, non: 0}, 2: {non: 25, oui: 0}, 3: {oui: 20, non: 5}, 4: {oui: 12, non: 0}, 5: {oui: 8, non: 4} };
const qLabels = { 1: {oui:'✅ Oui', non:'❌ Non'}, 2: {non:'✅ Libre', oui:'❌ Équipé'}, 3: {oui:'✅ OK', non:'⚠️ BXL'}, 4: {oui:'✅ OK', non:'❌ Non'}, 5: {oui:'✅ Oui', non:'⚠️ Non'} };

function setQ(n, val) {
  questions[n] = val;
  document.getElementById(`q${n}-oui`)?.classList.toggle('active-oui', val==='oui');
  document.getElementById(`q${n}-non`)?.classList.toggle('active-non', val==='non');
  if(n===2 || n===4) {
    document.getElementById(`q${n}-non`)?.classList.toggle('active-oui', val==='non');
    document.getElementById(`q${n}-non`)?.classList.remove('active-non');
  }
  updateEligibility();
}

function updateEligibility() {
  let score = 0;
  for(let n=1; n<=5; n++) {
    if(questions[n] !== null) score += weights[n][questions[n]] || 0;
    
    const bar = document.getElementById('bar-q' + n);
    const txt = document.getElementById('txt-q' + n);
    if(bar && txt) {
      if(questions[n] === null) { bar.style.width = '0%'; txt.textContent = '—'; }
      else {
        const pts = weights[n][questions[n]] || 0;
        const maxPts = Math.max(...Object.values(weights[n]));
        bar.style.width = (maxPts > 0 ? (pts/maxPts*100) : 0) + '%';
        bar.style.background = pts > 0 ? 'var(--green)' : 'var(--red)';
        txt.textContent = qLabels[n][questions[n]];
      }
    }
  }

  const conso = parseFloat(document.getElementById('sl-conso')?.value || 0);
  const barC = document.getElementById('bar-conso');
  const txtC = document.getElementById('txt-conso');
  if(barC && txtC) {
    const consoPct = Math.min(100, (conso / 8000) * 100);
    barC.style.width = consoPct + '%';
    barC.style.background = conso < 2000 ? 'var(--red)' : conso < 3500 ? 'var(--or)' : 'var(--green)';
    txtC.textContent = (conso/1000).toFixed(1) + 'k';
  }

  const needle = document.getElementById('score-needle');
  const center = document.getElementById('score-center');
  if(needle) needle.style.transform = `translateX(-50%) rotate(${-90 + (score * 1.8)}deg)`;
  if(center) center.textContent = score + '%';

  const verdict = document.getElementById('score-verdict');
  if(verdict) {
    if(questions[1] === 'non') verdict.textContent = '❌ Non éligible (Locataire)';
    else if(questions[2] === 'oui') verdict.textContent = '⚠️ Déjà équipé';
    else if(score >= 80) verdict.textContent = '⭐ EXCELLENT';
    else if(score >= 60) verdict.textContent = '✅ BON';
    else verdict.textContent = 'Calcul du score...';
  }
}

// --- ENTRETIEN ---
function updateEntretien() {
  const inst = parseFloat(document.getElementById('e-inst')?.value || 6000);
  const hasBatt = parseInt(document.getElementById('e-batt')?.value || 0) === 1;
  const isMicro = parseInt(document.getElementById('e-ond')?.value || 0) === 1;

  if(document.getElementById('e-inst-val')) document.getElementById('e-inst-val').textContent = fmtE(inst);
  if(document.getElementById('e-batt-val')) document.getElementById('e-batt-val').textContent = hasBatt ? 'Oui' : 'Non';
  if(document.getElementById('e-ond-val')) document.getElementById('e-ond-val').textContent = isMicro ? 'Micro' : 'Central';

  let totalEntretien = 25 * 125; // Nettoyage
  if(!isMicro) totalEntretien += 2400; // Onduleurs
  totalEntretien += 1000; // Contrôles
  if(hasBatt) totalEntretien += 9000; // Batteries

  if(document.getElementById('e-total-invest')) document.getElementById('e-total-invest').textContent = fmtE(inst + (hasBatt?4000:0));
  if(document.getElementById('e-total-entretien')) document.getElementById('e-total-entretien').textContent = fmtE(totalEntretien);
}

// --- PITCH ---
function updatePitch(conso, actual, gaele, an, mois, total25) {
  const p1 = document.getElementById('pitch-1');
  const p2 = document.getElementById('pitch-2');
  const p4 = document.getElementById('pitch-4');
  if(p1) p1.textContent = `Facture actuelle : ${fmtE(actual)}/an. Avec Gaele XL : ${fmtE(gaele)}.`;
  if(p2) p2.textContent = `Gain : ${fmtE(mois)}/mois (${fmtE(an)}/an). Total 25 ans : ${fmtE(total25)}.`;
  if(p4) p4.textContent = `Chaque mois d'hésitation vous coûte ${fmtE(mois)}.`;
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

function copyPitch() {
  const p1 = document.getElementById('pitch-1')?.textContent || "";
  const p2 = document.getElementById('pitch-2')?.textContent || "";
  const p3 = document.getElementById('pitch-3')?.textContent || "";
  const full = `GAELE XL\n\n${p1}\n\n${p2}\n\n${p3}`;
  navigator.clipboard.writeText(full).then(() => alert('Copié !'));
}
