/**
 * GAELEBOT CORE ORCHESTRATION
 * Main entry point, navigation and high-level logic
 */


// --- NAVIGATION ---
function navigate(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  
  // Show target page
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.add('active');
    // Save current page state? (Optional)
    state.currentPage = pageId;
  }
  
  // Update nav button
  const btn = document.querySelector(`.bnav-btn[data-page="${pageId}"]`);
  if (btn) btn.classList.add('active');
  
  // Scroll to top
  const content = document.querySelector('.content');
  if (content) content.scrollTop = 0;
  
  // Page specific hooks
  if (pageId === 'dash') updateDashboardUI(state);
  if (pageId === 'crm') renderCRM(state.prospects);
}

// --- SCANNING ---
async function runRoofScan(params) {
  const { city, limit = 50, minScore = 7 } = params;
  const apiKey = state.config.googleKey;
  
  if (!apiKey) {
    showToast('⚠️ Entre ta clé API dans Config !', 'blue');
    navigate('config');
    return;
  }
  
  showToast(`🔍 Scan réel de ${city}...`, 'green');
  
  const cd = COMMUNES[city];
  const rues = ROUTES[city] || ROUTES.default;
  const prospects = [];
  
  // Simulate BeST Address generation (Simplified for this version)
  const addrs = [];
  rues.forEach(rue => {
    for (let i = 1; i <= 30 && addrs.length < limit; i += Math.floor(Math.random() * 3) + 1) {
      addrs.push(`${rue} ${i}`);
    }
  });
  
  // Actual API Loop
  let processed = 0;
  for (const addr of addrs) {
    try {
      processed++;
      // Update UI Progress? (To be implemented in ui.js if needed)
      
      const loc = await geocodeAddress(addr, cd.n, cd.cp, apiKey);
      if (!loc) continue;
      
      const solar = await analyzeSolarRoof(loc.lat, loc.lng, apiKey);
      if (!solar || hasSolarPanels(solar)) continue;
      
      const score = calculateScore(solar);
      if (score < minScore) continue;
      
      const p = {
        adresse: addr,
        commune: cd.n,
        cp: cd.cp,
        lang: cd.lang,
        grd: cd.grd,
        score,
        orient: getOrientation(solar),
        surf: Math.round(solar.solarPotential?.wholeRoofStats?.areaMeters2 || 0),
        fiab: getImageFiability(solar),
        lat: loc.lat,
        lng: loc.lng,
        type: 'residential',
        statut: 'new'
      };
      
      state.addProspect(p);
      prospects.push(p);
      
      // Stop if limit reached
      if (prospects.length >= limit) break;
      
      // Little delay to respect rate limits
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.error(e);
    }
  }
  
  showToast(`✅ ${prospects.length} prospects détectés !`, 'green');
  navigate('crm');
}

// --- SIMULATION ---
function runSimulation(prospectId = null) {
  const p = prospectId ? state.prospects.find(p => String(p.id) === String(prospectId)) : null;
  
  const params = {
    isPro: p?.type === 'pro',
    proType: p?.proType || 'all',
    grdKey: p?.grd || 'ORES',
    surf: p?.surf || 40,
    sun: 1100,
    maxPanelsLimit: p?.maxPanels
  };

  // If we have a prospect, we can be more specific
  const results = calculateEnergySimulation(params);
  updateCalcResultsUI(results);
  
  // Store results for SMS export
  state.lastCalcResults = results;
  state.lastCalcProspect = p;
}

// --- SESSION MANAGEMENT ---
let sessionTimer = null;

function toggleSession() {
  if (!state.session.active) {
    state.startSession();
    sessionTimer = setInterval(updateSessionTimer, 1000);
    showToast('▶ Session démarrée', 'green');
  } else {
    state.pauseSession();
    clearInterval(sessionTimer);
    showToast('⏸ Session en pause', 'orange');
  }
}

function updateSessionTimer() {
  const elapsed = Date.now() - state.session.start;
  const h = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
  const timerStr = `${h}:${m}:${s}`;
  
  const display = document.getElementById('dash-timer');
  if (display) display.textContent = timerStr;
}

// --- APP INITIALIZATION ---
function initApp() {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Static UI Bindings
    document.querySelectorAll('.bnav-btn').forEach(btn => {
      btn.onclick = () => navigate(btn.dataset.page);
    });
    
    // Session button in dashboard
    const sessionBtn = document.getElementById('btn-session-top');
    if (sessionBtn) sessionBtn.onclick = () => toggleSession();

    // 2. State Listeners
    state.subscribe(s => {
      // Re-render current page if needed
      if(state.currentPage === 'dash') updateDashboardUI(s);
      if(state.currentPage === 'crm') renderCRM(s.prospects);
    });
    
    // 3. Initial Load
    navigate('dash');
    
    // Restore session if active
    if (state.session.active) {
      sessionTimer = setInterval(updateSessionTimer, 1000);
    }

    // 4. Expose core functions for global use if needed (Legacy bridge)
    window.app = {
      navigate,
      runRoofScan,
      runSimulation,
      toggleSession,
      state
    };
  });
}
