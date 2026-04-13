/**
 * GAELEBOT UI COMPONENTS
 * Specialized rendering for different app parts
 */


// --- UTILS ---
function showToast(msg, type = 'green') {
  let t = document.getElementById('toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(10px);background:var(--green);color:#000;padding:10px 20px;border-radius:30px;font-size:0.8rem;font-weight:800;z-index:9999;transition:all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67);opacity:0;white-space:nowrap;pointer-events:none;max-width:90vw;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5)';
    document.body.appendChild(t);
  }
  t.style.background = `var(--${type})`;
  t.textContent = msg;
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2500);
}

// --- PROSPECT ROW ---
function renderProspectCard(p, context = 'scan') {
  const isHot = p.score >= 7;
  const isWarm = p.score >= 4 && p.score < 7;
  const scoreClass = isHot ? 'badge-green' : isWarm ? 'badge-blue' : 'badge-gray';
  
  const actions = `
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn btn-g btn-sm" data-action="calc" data-id="${p.id}">🧮 Calculer</button>
      <button class="btn btn-out btn-sm" data-action="visited" data-id="${p.id}">✅ Visité</button>
    </div>
  `;

  return `
    <div class="card" data-id="${p.id}" style="${p.statut === 'visited' ? 'opacity:0.5' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="badge ${scoreClass}">${p.score}/10</span>
            <span class="badge badge-gray">${p.type === 'pro' ? '🏢 PRO' : '🏠 RES'}</span>
          </div>
          <div style="font-weight:800;font-size:1rem;margin-bottom:4px">${p.adresse}</div>
          <div style="font-size:0.7rem;color:var(--txt-muted)">
            ${p.commune} · ${p.orient || '—'} · ${p.surf || 0}m²
          </div>
        </div>
        <div class="badge badge-gray">${p.lang?.toUpperCase() || 'FR'}</div>
      </div>
      ${context === 'all' || p.statut !== 'visited' ? actions : ''}
    </div>
  `;
}

// --- DASHBOARD RENDERER ---
function updateDashboardUI(data) {
  const { prospects, session } = data;
  
  // Real stats
  const total = prospects.length;
  const hot = prospects.filter(p => (p.score >= 7 && p.statut !== 'visited')).length;
  const signs = prospects.filter(p => p.statut === 'signe').length;
  
  // Update numbers
  const set = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
  };

  set('d-total', total);
  set('d-hot', hot);
  set('d-signs', signs);
  
  // Progress bars
  const visitGoal = 210;
  const signGoal = 4;
  const visitPct = Math.min(100, (total / visitGoal) * 100);
  const signPct = Math.min(100, (signs / signGoal) * 100);
  
  const vBar = document.getElementById('visit-bar');
  const sBar = document.getElementById('sign-bar');
  if(vBar) vBar.style.width = `${visitPct}%`;
  if(sBar) sBar.style.width = `${signPct}%`;
  
  set('visit-label', `${total} / ${visitGoal}`);
  set('sign-label', `${signs} / ${signGoal}`);
  
  // Recent list
  const recent = prospects.slice(0, 4);
  const list = document.getElementById('recent-list');
  if(list) {
    if(recent.length === 0) {
      list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--txt-low)">Aucun prospect récent</div>';
    } else {
      list.innerHTML = recent.map(p => renderProspectCard(p, 'recent')).join('');
    }
  }
}

// --- CRM RENDERER ---
function renderCRM(prospects, filter = 'all') {
  const list = document.getElementById('crm-list');
  if(!list) return;
  
  let filtered = prospects;
  if(filter === 'chaud') filtered = prospects.filter(p => p.score >= 7);
  else if(filter !== 'all') filtered = prospects.filter(p => p.statut === filter);
  
  if(filtered.length === 0) {
    list.innerHTML = `
      <div style="padding:60px 20px;text-align:center;color:var(--txt-low)">
        <div style="font-size:3rem;margin-bottom:20px">📭</div>
        Aucun prospect correspondant
      </div>
    `;
    return;
  }
  
  list.innerHTML = filtered.map(p => renderProspectCard(p, 'crm')).join('');
}

// --- CALC RENDERER ---
function updateCalcResultsUI(res) {
  // Main blocks
  const set = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
  };
  
  set('r-gain-25', formatEuro(res.gain25));
  set('r-eco-an', formatEuro(res.econAn));
  set('r-eco-pct', res.ecoPercent + '%');
  set('r-total-sans', formatEuro(res.totalSans));
  set('r-total-avec', formatEuro(res.totalAvec));
  
  // Detail list
  set('d-facture-market', formatEuro(res.factureMarket / 12) + '/mois');
  set('d-facture-gaele', formatEuro(res.factureGaele / 12) + '/mois');
  set('d-panels', res.panels + ' panneaux');
  set('d-kwc', res.kWc.toFixed(1) + ' kWc');
  
  // Eligibility
  const elig = document.getElementById('calc-elig');
  if(elig) {
    if(res.panels >= 8) {
      elig.innerHTML = `<span class="badge badge-green">✅ Éligible Gaele XL</span>`;
    } else {
      elig.innerHTML = `<span class="badge badge-blue">⚠️ Toit à vérifier (surface réduite)</span>`;
    }
  }
}
