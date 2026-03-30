// ── SUPABASE CONFIG ────────────────────────────────────
const SUPABASE_URL = 'https://adebczvhvxajiyeeyerx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f4cbHwKHxeMiu1SYexARsA_IDVQ-o6V'; 

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ── STATE ──────────────────────────────────────────────
const state = {
  prospects: JSON.parse(localStorage.getItem('gaele_prospects') || '[]'),
  b2bLeads:  [],
  session:   { active: false, start: null, visites: 0, interesses: 0, rdv: 0, signes: 0, elapsed: 0 },
  timer:     null,
  selections:{ q1: null, q2: null, q3: null, statut: null },
  mapInstance: null,
  geocodeCache: JSON.parse(localStorage.getItem('gaele_geocache') || '{}'),
  b2bGeocache: JSON.parse(localStorage.getItem('gaele_b2b_geocache') || '{}'),
  geocodingActive: false
};

// ── OBJECTIFS ──────────────────────────────────────────
function getObjectifs() {
  return JSON.parse(localStorage.getItem('gaele_objectifs') || '{"visites":210,"contrats":4}');
}
function saveObjectifs(obj) {
  localStorage.setItem('gaele_objectifs', JSON.stringify(obj));
}

// ── NAVIGATION ─────────────────────────────────────────
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
  if (id === 'crm')       renderCRM();
  if (id === 'dashboard') renderDashboard();
  if (id === 'planning')  renderPlanning();
  if (id === 'carte')     { if (window.MapModule) MapModule.init(); }
}

// ── SESSION TIMER ──────────────────────────────────────
function toggleSession() {
  const btn   = document.getElementById('btn-session');
  const badge = document.getElementById('session-badge');
  if (!state.session.active) {
    state.session.active = true;
    state.session.start  = Date.now() - (state.session.elapsed || 0);
    state.timer = setInterval(updateTimer, 1000);
    btn.textContent = '⏸ Pause session';
    btn.className   = 'btn btn-rouge';
    badge.textContent       = 'Session ON 🔴';
    badge.style.background  = '#e74c3c';
    badge.style.color       = '#fff';
  } else {
    state.session.active  = false;
    state.session.elapsed = Date.now() - state.session.start;
    clearInterval(state.timer);
    btn.textContent = '▶ Reprendre session';
    btn.className   = 'btn btn-vert';
    badge.textContent      = 'Session PAUSE';
    badge.style.background = '#f39c12';
    badge.style.color      = '#fff';
  }
}

function updateTimer() {
  const elapsed = Date.now() - state.session.start;
  const h = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
  document.getElementById('timer-display').textContent = h + ':' + m + ':' + s;
}

function resetSession() {
  if (state.session.active) clearInterval(state.timer);
  state.session = { active: false, start: null, visites: 0, interesses: 0, rdv: 0, signes: 0, elapsed: 0 };
  document.getElementById('timer-display').textContent = '00:00:00';
  document.getElementById('btn-session').textContent   = '▶ Démarrer session';
  document.getElementById('btn-session').className     = 'btn btn-vert';
  const badge = document.getElementById('session-badge');
  badge.textContent      = 'Session OFF';
  badge.style.background = 'var(--or)';
  badge.style.color      = 'var(--v)';
  updateSessionCounters();
}

function updateSessionCounters() {
  document.getElementById('c-visites').textContent    = state.session.visites;
  document.getElementById('c-interesses').textContent = state.session.interesses;
  document.getElementById('c-rdv').textContent        = state.session.rdv;
  document.getElementById('c-signes').textContent     = state.session.signes;
}

// ── SELECTIONS ─────────────────────────────────────────
function sel(btn, q, val, cls) {
  document.querySelectorAll(`[data-q="${q}"]`).forEach(b => { b.className = 'choix-btn'; });
  btn.className   = 'choix-btn ' + cls;
  state.selections[q] = val;
}

// ── SAVE VISITE ────────────────────────────────────────
function saveVisite() {
  const adresse = document.getElementById('f-adresse').value.trim();
  const nom     = document.getElementById('f-nom').value.trim();
  const tel     = document.getElementById('f-tel').value.trim();
  const notes   = document.getElementById('f-notes').value.trim();
  const rappel  = document.getElementById('f-rappel').value;
  const { q1, q2, q3, statut } = state.selections;

  if (!adresse) { showToast('⚠️ Entrez une adresse', '#e74c3c'); return; }
  if (!statut)  { showToast('⚠️ Sélectionnez un statut', '#e74c3c'); return; }

  const prospect = {
    id: Date.now(),
    adresse, nom: nom || 'Inconnu', tel, notes, rappel,
    q1: q1 || '?', q2: q2 || '?', q3: q3 || '?',
    statut,
    date:  new Date().toLocaleDateString('fr-BE'),
    heure: new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
  };

  state.prospects.unshift(prospect);
  localStorage.setItem('gaele_prospects', JSON.stringify(state.prospects));

  state.session.visites++;
  if (q3 === 'oui')      state.session.interesses++;
  if (statut === 'rdv')  state.session.rdv++;
  if (statut === 'signe')state.session.signes++;
  updateSessionCounters();

  // Invalider le cache geocode pour cette adresse (nouvelle visite)
  // (pas besoin, l'ID est nouveau)

  document.getElementById('f-adresse').value = '';
  document.getElementById('f-nom').value     = '';
  document.getElementById('f-tel').value     = '';
  document.getElementById('f-notes').value   = '';
  document.getElementById('f-rappel').value  = '';
  document.querySelectorAll('.choix-btn').forEach(b => b.className = 'choix-btn');
  state.selections = { q1: null, q2: null, q3: null, statut: null };

  showToast('✅ Visite enregistrée !');

  // Programmer une notification si rappel défini
  if (rappel && Notification.permission === 'granted') {
    scheduleRappelNotif(prospect);
  }
}

// ── CRM ────────────────────────────────────────────────
let currentCrmTab = 'b2c';

function switchCrmTab(tab) {
  currentCrmTab = tab;
  document.getElementById('tab-b2c').classList.toggle('active', tab === 'b2c');
  document.getElementById('tab-b2b').classList.toggle('active', tab === 'b2b');
  document.getElementById('prospects-list').style.display = tab === 'b2c' ? '' : 'none';
  document.getElementById('b2b-list').style.display       = tab === 'b2b' ? '' : 'none';
  document.getElementById('crm-empty').style.display      = 'none';
  document.getElementById('b2b-empty').style.display      = 'none';
  if (tab === 'b2c') renderCRM();
  if (tab === 'b2b') renderB2B();
}

function renderCRM(filter) {
  const list  = document.getElementById('prospects-list');
  const empty = document.getElementById('crm-empty');
  const count = document.getElementById('crm-count');

  let data = state.prospects;
  if (filter && filter !== 'all') {
    if (filter === 'chaud') data = data.filter(p => p.statut === 'rdv' || p.statut === 'signe');
    else                    data = data.filter(p => p.statut === filter);
  }

  count.textContent = data.length + ' prospect' + (data.length > 1 ? 's' : '');

  if (data.length === 0) {
    list.innerHTML = '';
    if (currentCrmTab === 'b2c') empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const statutInfo = {
    signe:  { label: 'Signé',  cls: 's-signe',  bg: '1A5C3A' },
    rdv:    { label: 'RDV',    cls: 's-rdv',    bg: '5C4A1A' },
    rappel: { label: 'Rappel', cls: 's-rappel', bg: '1A3A5C' },
    non:    { label: 'Non',    cls: 's-non',    bg: '5C1A1A' },
    default:{ label: '?',      cls: 's-nouveau',bg: '2a2a2a' }
  };

  list.innerHTML = data.map(p => {
    const si       = statutInfo[p.statut] || statutInfo.default;
    const initials = p.nom.split(' ').map(w => w[0] || '').join('').toUpperCase().substring(0, 2) || '?';
    const hasRappel = p.rappel ? `<div style="font-size:0.62rem;color:var(--bleu);margin-top:2px">⏰ ${new Date(p.rappel).toLocaleString('fr-BE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>` : '';
    return `<div class="prospect-item" onclick="showProspect(${p.id})">
      <div class="prospect-avatar" style="background:#${si.bg}20;color:#fff">${initials}</div>
      <div class="prospect-info">
        <div class="prospect-name">${escHtml(p.nom)}</div>
        <div class="prospect-detail">${escHtml(p.adresse)} · ${p.date} ${p.heure}</div>
        ${hasRappel}
      </div>
      <span class="prospect-badge ${si.cls}">${si.label}</span>
    </div>`;
  }).join('');
}

function filterProspects(f) {
  switchCrmTab('b2c');
  renderCRM(f);
}

// ── B2B STATE ─────────────────────────────────────────
const b2bState = {
  query:    '',
  commune:  '',
  secteur:  '',
  page:     0,
  pageSize: 60,
};

function renderB2B() {
  const list    = document.getElementById('b2b-list');
  const emptyEl = document.getElementById('b2b-empty');
  let   data    = state.b2bLeads;

  if (data.length === 0) {
    list.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  // Mettre à jour les selects de filtre
  populateB2BFilters(data);

  // Appliquer les filtres
  data = filterB2B(data);

  const total   = data.length;
  const endIdx  = (b2bState.page + 1) * b2bState.pageSize;
  const visible = data.slice(0, endIdx);
  const hasMore = endIdx < total;

  document.getElementById('crm-count').textContent =
    total < state.b2bLeads.length
      ? `${total} / ${state.b2bLeads.length} entreprises B2B`
      : `${total} entreprises B2B`;

  // Icônes secteurs
  const sectorIcons = {
    'Installation électrique': '⚡', 'Travaux couverture': '🏠',
    'Construction résidentielle': '🏗️', 'Plomberie / chauffage': '🔧',
    'Agences immobilières': '🏘️', 'Location immobilier': '🔑',
    'Autres construction': '🔨', 'Élevage bovins': '🐄',
    'Élevage volailles': '🐓', 'Supermarchés': '🛒',
    'Restaurants': '🍽️', 'Construction bâtiments': '🏢',
    'Agriculture céréales': '🌾',
  };

  const cards = visible.map((e, i) => {
    const ico  = sectorIcons[e.nace] || '🏢';
    const init = (e.nom || '?').substring(0, 2).toUpperCase();
    const badge = e.demo
      ? `<span class="prospect-badge s-nouveau" style="font-size:0.52rem">DÉMO</span>`
      : `<span class="prospect-badge s-nouveau">BCE</span>`;
    return `<div class="prospect-item b2b-item" onclick="showB2BDetail(${i})">
      <div class="prospect-avatar b2b-avatar">${ico}</div>
      <div class="prospect-info">
        <div class="prospect-name">${escHtml(e.nom)}</div>
        <div class="prospect-detail">
          📍 ${escHtml(e.commune)} ${e.cp}
          ${e.province ? ` · <span style="color:var(--or2);font-size:0.6rem">${escHtml(e.province)}</span>` : ''}
        </div>
        <div style="font-size:0.62rem;color:var(--txt2);margin-top:2px">${ico} ${escHtml(e.nace)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        ${e.tel
          ? `<a href="tel:${escHtml(e.tel)}" class="prospect-badge s-rdv" onclick="event.stopPropagation()" style="font-size:0.6rem;text-decoration:none">📞 ${escHtml(e.tel)}</a>`
          : badge}
      </div>
    </div>`;
  }).join('');

  const loadMoreBtn = hasMore
    ? `<div style="padding:12px 14px">
        <button class="btn btn-outline" onclick="loadMoreB2B()" style="font-size:0.75rem;padding:10px">
          ⬇️ Charger plus (${total - endIdx} restants)
        </button>
       </div>`
    : total > b2bState.pageSize
      ? `<div style="text-align:center;padding:10px;font-size:0.65rem;color:var(--txt2)">✅ Tout affiché (${total})</div>`
      : '';

  list.innerHTML = cards + loadMoreBtn;
}

// État B2B visible pour le modal
let _b2bFiltered = [];

function filterB2B(data) {
  const q = b2bState.query.toLowerCase().trim();
  let result = data;
  if (q) {
    result = result.filter(e =>
      (e.nom     || '').toLowerCase().includes(q) ||
      (e.commune || '').toLowerCase().includes(q) ||
      (e.nace    || '').toLowerCase().includes(q) ||
      (e.rue     || '').toLowerCase().includes(q)
    );
  }
  if (b2bState.commune) {
    result = result.filter(e => e.commune === b2bState.commune);
  }
  if (b2bState.secteur) {
    result = result.filter(e => e.nace === b2bState.secteur);
  }
  _b2bFiltered = result;
  return result;
}

function populateB2BFilters(data) {
  const commSel = document.getElementById('b2b-commune-filter');
  const sectSel = document.getElementById('b2b-secteur-filter');
  if (!commSel || !sectSel) return;

  // Communes uniques
  const communes = [...new Set(data.map(e => e.commune).filter(Boolean))].sort();
  if (commSel.options.length <= 1) {
    communes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      commSel.appendChild(opt);
    });
  }

  // Secteurs uniques
  const secteurs = [...new Set(data.map(e => e.nace).filter(Boolean))].sort();
  if (sectSel.options.length <= 1) {
    secteurs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sectSel.appendChild(opt);
    });
  }
}

function searchB2B(val) {
  b2bState.query = val;
  b2bState.page  = 0;
  renderB2B();
}

function filterB2BCommune(val) {
  b2bState.commune = val;
  b2bState.page    = 0;
  renderB2B();
}

function filterB2BSecteur(val) {
  b2bState.secteur = val;
  b2bState.page    = 0;
  renderB2B();
}

function loadMoreB2B() {
  b2bState.page++;
  renderB2B();
}

function showB2BDetail(idx) {
  const e = _b2bFiltered[idx];
  if (!e) return;
  document.getElementById('modal-nom').textContent = e.nom;
  document.getElementById('modal-content').innerHTML = `
    <div style="display:grid;gap:8px;font-size:0.82rem">
      <div class="modal-row"><span>📍 Commune</span><span style="color:var(--or2);font-weight:700">${escHtml(e.commune)} ${e.cp}</span></div>
      ${e.province ? `<div class="modal-row"><span>🗺️ Province</span><span>${escHtml(e.province)}</span></div>` : ''}
      <div class="modal-row"><span>🏭 Secteur</span><span>${escHtml(e.nace)}</span></div>
      <div class="modal-row"><span>📋 Code NACE</span><span style="font-family:monospace">${escHtml(e.nace_code)}</span></div>
      <div class="modal-row"><span>⚖️ Forme juridique</span><span>${escHtml(e.forme || '—')}</span></div>
      <div class="modal-row"><span>📄 N° BCE</span><span style="font-family:monospace;font-size:0.75rem">${escHtml(e.num || '—')}</span></div>
      ${e.rue ? `<div class="modal-row"><span>🏠 Adresse</span><span>${escHtml(e.rue)}</span></div>` : ''}
      ${e.tel ? `<div class="modal-row"><span>📞 Téléphone</span><a href="tel:${escHtml(e.tel)}" style="color:var(--or2);text-decoration:none;font-weight:700">${escHtml(e.tel)}</a></div>` : ''}
      ${e.demo ? `<div style="margin-top:8px;padding:6px 10px;background:rgba(201,168,76,.1);border-radius:8px;font-size:0.68rem;color:var(--txt2)">⚠️ Données de démonstration — Lance node bce_scraper_node.js pour les vraies données BCE</div>` : ''}
    </div>
    <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px">
      ${e.tel ? `<a href="tel:${escHtml(e.tel)}" class="btn btn-vert" style="flex:1;min-width:120px;text-align:center;text-decoration:none;font-size:0.8rem">📞 Appeler</a>` : ''}
      <button class="btn btn-outline" onclick="focusB2BOnMap('${idx}')" style="flex:1;min-width:120px;font-size:0.8rem">📍 Voir sur la carte</button>
      <button class="btn btn-or" onclick="convertB2BToProspect('${idx}')" style="flex:1;min-width:120px;font-size:0.8rem">➕ Ajouter au CRM</button>
    </div>`;
  document.getElementById('btn-delete-prospect').style.display = 'none';
  document.getElementById('modal-prospect').classList.add('open');
}

function convertB2BToProspect(idx) {
  const e = _b2bFiltered[idx];
  if (!e) return;
  // Pré-remplir le formulaire terrain
  document.getElementById('f-adresse').value = `${e.rue || ''}, ${e.commune} ${e.cp}`.trim().replace(/^,\s*/, '');
  document.getElementById('f-nom').value     = e.nom;
  if (e.tel) document.getElementById('f-tel').value = e.tel;
  document.getElementById('f-notes').value = `B2B BCE — ${e.nace} (${e.nace_code})${e.forme ? ' — ' + e.forme : ''}`;
  closeModal();
  showPage('terrain', document.querySelector('.nav-btn'));
  showToast('📋 Formulaire pré-rempli depuis le lead B2B !');
}

function convertB2BToProspectFromMap(num) {
  const e = state.b2bLeads.find(l => l.num === num);
  if (!e) return;
  // Pré-remplir le formulaire terrain
  document.getElementById('f-adresse').value = `${e.rue || ''}, ${e.commune} ${e.cp}`.trim().replace(/^,\s*/, '');
  document.getElementById('f-nom').value     = e.nom;
  if (e.tel) document.getElementById('f-tel').value = e.tel;
  document.getElementById('f-notes').value = `B2B BCE — ${e.nace} (${e.nace_code})${e.forme ? ' — ' + e.forme : ''}`;
  closeModal();
  showPage('terrain', document.querySelector('.nav-btn'));
  showToast('📋 Formulaire pré-rempli depuis le lead B2B !');
}

function focusB2BOnMap(idx) {
  const e = _b2bFiltered[idx];
  if (!e) return;
  closeModal();
  showPage('carte', document.querySelectorAll('.nav-btn')[3]); // 3 = index du bouton carte
  setTimeout(() => {
    if (window.MapModule) {
      // S'assurer que le filtre B2B est ON
      MapModule.toggleFilter('b2b'); // Si déjà ON, ça le coupe... petit risque ici.
      // On force le mode B2B
      // TODO: Améliorer MapModule pour forcer un filtre sans toggle
      
      const coords = state.b2bGeocache[e.num];
      if (coords && state.mapInstance) {
        state.mapInstance.setView([coords.lat, coords.lon], 17);
      } else {
        showToast('📍 En attente de géocodage...');
        MapModule.refreshMarkers();
      }
    }
  }, 500);
}


function showProspect(id) {
  const p = state.prospects.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-nom').textContent = p.nom + ' — ' + p.adresse;
  const q1l = { oui:'✅ Propriétaire', non:'❌ Locataire', copro:'🤝 Co-proprio', '?':'—' };
  const q2l = { non:'✅ Pas de panneaux', oui:'⚠️ Déjà équipé', ancien:'🔄 Ancienne install.', '?':'—' };
  const q3l = { oui:'⭐ Intéressé', peut:'🤔 Peut-être', non:'❌ Non', '?':'—' };
  const sl  = { signe:'✅ Contrat signé', rdv:'📅 RDV fixé', rappel:'📞 À rappeler', non:'❌ Non intéressé' };
  document.getElementById('modal-content').innerHTML = `
    <div style="display:grid;gap:8px;font-size:0.82rem">
      <div class="modal-row"><span>Statut</span><span style="font-weight:700;color:var(--or2)">${sl[p.statut] || '—'}</span></div>
      ${p.rappel ? `<div class="modal-row"><span>Rappel</span><span style="color:#5dade2">⏰ ${new Date(p.rappel).toLocaleString('fr-BE')}</span></div>` : ''}
      <div class="modal-row"><span>Propriétaire</span><span>${q1l[p.q1] || '—'}</span></div>
      <div class="modal-row"><span>Panneaux</span><span>${q2l[p.q2] || '—'}</span></div>
      <div class="modal-row"><span>Intérêt</span><span>${q3l[p.q3] || '—'}</span></div>
      ${p.tel ? `<div class="modal-row"><span>Téléphone</span><a href="tel:${escHtml(p.tel)}" style="color:var(--or2);text-decoration:none">${escHtml(p.tel)}</a></div>` : ''}
      ${p.notes ? `<div style="padding:8px 0"><span style="color:var(--txt2);display:block;margin-bottom:4px">Notes</span><span style="font-style:italic">${escHtml(p.notes)}</span></div>` : ''}
    </div>`;
  document.getElementById('btn-delete-prospect').onclick = () => deleteProspect(id);
  document.getElementById('modal-prospect').classList.add('open');
}

function deleteProspect(id) {
  if (!confirm('Supprimer ce prospect ?')) return;
  state.prospects = state.prospects.filter(p => p.id !== id);
  // Nettoyer le cache géocode
  delete state.geocodeCache[id];
  localStorage.setItem('gaele_geocache', JSON.stringify(state.geocodeCache));
  localStorage.setItem('gaele_prospects', JSON.stringify(state.prospects));
  closeModal();
  renderCRM();
  showToast('🗑️ Supprimé');
}

function closeModal() { document.getElementById('modal-prospect').classList.remove('open'); }

// ── EXPORT CSV ─────────────────────────────────────────
function exportCSV() {
  if (state.prospects.length === 0) { showToast('⚠️ Aucun prospect', '#e74c3c'); return; }
  const q1l = { oui:'Propriétaire', non:'Locataire', copro:'Co-proprio', '?':'' };
  const q2l = { non:'Pas de panneaux', oui:'Déjà équipé', ancien:'Ancienne install.', '?':'' };
  const q3l = { oui:'Intéressé', peut:'Peut-être', non:'Non', '?':'' };
  const sl  = { signe:'Signé', rdv:'RDV fixé', rappel:'À rappeler', non:'Non intéressé' };
  const headers = ['Nom','Adresse','Téléphone','Statut','Propriétaire','Panneaux solaires','Intérêt','Date rappel','Date','Heure','Notes'];
  const rows = state.prospects.map(p => [
    p.nom, p.adresse, p.tel,
    sl[p.statut] || p.statut,
    q1l[p.q1] || p.q1, q2l[p.q2] || p.q2, q3l[p.q3] || p.q3,
    p.rappel || '', p.date, p.heure, p.notes
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`));
  const csv  = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `gaele_prospects_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 CSV exporté !');
}

// ── EXPORT PDF ─────────────────────────────────────────
function exportPDF() {
  if (typeof window.jspdf === 'undefined') {
    showToast('⚠️ PDF non disponible (hors ligne ?)', '#e74c3c');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
  const ps    = state.prospects;
  const today = new Date().toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const obj   = getObjectifs();

  // --- En-tête ---
  doc.setFillColor(10, 26, 15);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('GAELE PRO', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(138, 171, 142);
  doc.text('Rapport de prospection — Andy Kyambikwa', 14, 26);
  doc.text(today, 14, 33);

  // --- Stats ---
  const signes  = ps.filter(p => p.statut === 'signe').length;
  const rdv     = ps.filter(p => p.statut === 'rdv').length;
  const rappels = ps.filter(p => p.statut === 'rappel').length;
  const conv    = ps.length > 0 ? Math.round((signes / ps.length) * 100) : 0;

  doc.setFillColor(17, 31, 20);
  doc.rect(0, 40, 210, 44, 'F');

  const stats = [
    { label: 'Visites totales', val: ps.length, color: [201, 168, 76] },
    { label: 'Contrats signés', val: signes,     color: [39, 174, 96] },
    { label: 'RDV fixés',       val: rdv,        color: [41, 128, 185] },
    { label: 'Taux conversion', val: conv + '%', color: [231, 76, 60] }
  ];
  stats.forEach((s, i) => {
    const x = 14 + i * 46;
    doc.setFillColor(22, 32, 25);
    doc.roundedRect(x, 44, 42, 32, 3, 3, 'F');
    doc.setTextColor(...s.color);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(s.val), x + 21, 59, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(138, 171, 142);
    doc.text(s.label, x + 21, 68, { align: 'center' });
  });

  // --- Objectifs ---
  doc.setTextColor(201, 168, 76);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Objectifs', 14, 98);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(232, 240, 233);
  doc.text(`Visites : ${ps.length} / ${obj.visites}   |   Contrats : ${signes} / ${obj.contrats}`, 14, 105);

  // --- Liste prospects ---
  doc.setTextColor(201, 168, 76);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des prospects', 14, 116);

  doc.setFillColor(17, 31, 20);
  doc.rect(14, 119, 182, 8, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFontSize(8);
  doc.text('Nom', 16, 124.5);
  doc.text('Adresse', 56, 124.5);
  doc.text('Téléphone', 120, 124.5);
  doc.text('Statut', 160, 124.5);
  doc.text('Date', 180, 124.5);

  let y = 130;
  const sl = { signe:'Signé', rdv:'RDV', rappel:'Rappel', non:'Non' };
  const statColors = { signe:[39,174,96], rdv:[201,168,76], rappel:[41,128,185], non:[231,76,60] };

  ps.slice(0, 35).forEach((p, i) => {
    if (y > 275) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(17, 31, 20); doc.rect(14, y - 4, 182, 8, 'F'); }
    doc.setTextColor(232, 240, 233);
    doc.setFontSize(7.5);
    doc.text((p.nom || '').substring(0, 20),     16, y + 0.5);
    doc.text((p.adresse || '').substring(0, 30), 56, y + 0.5);
    doc.text((p.tel || '—').substring(0, 15),   120, y + 0.5);
    const sc = statColors[p.statut] || [138,171,142];
    doc.setTextColor(...sc);
    doc.text(sl[p.statut] || '—', 160, y + 0.5);
    doc.setTextColor(138, 171, 142);
    doc.text(p.date || '', 180, y + 0.5);
    y += 8;
  });

  // --- Pied de page ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(10, 26, 15);
    doc.rect(0, 285, 210, 15, 'F');
    doc.setFontSize(7);
    doc.setTextColor(138, 171, 142);
    doc.text('Gaele Pro — Prospection Wallonie', 14, 292);
    doc.text(`Page ${i} / ${totalPages}`, 196, 292, { align: 'right' });
  }

  doc.save(`rapport_gaele_${new Date().toISOString().slice(0,10)}.pdf`);
  showToast('📄 PDF exporté !');
}

// ── NOTIFICATIONS ──────────────────────────────────────
async function requestNotifications() {
  const btn = document.getElementById('notif-btn');
  if (!('Notification' in window)) {
    showToast('⚠️ Notifications non supportées', '#e74c3c'); return;
  }
  if (Notification.permission === 'granted') {
    checkPendingNotifications();
    showToast('🔔 Rappels actifs !');
    btn.style.color = '#4ecb71';
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    btn.style.color = '#4ecb71';
    showToast('🔔 Notifications activées !');
    checkPendingNotifications();
  } else {
    showToast('❌ Permission refusée', '#e74c3c');
  }
}

function checkPendingNotifications() {
  if (Notification.permission !== 'granted') return;
  const now     = Date.now();
  const rdvList = state.prospects.filter(p => p.statut === 'rdv' || p.statut === 'rappel');
  // Notification générale
  if (rdvList.length > 0) {
    new Notification('☀️ Gaele Pro', {
      body: `${rdvList.length} prospect(s) à relancer — ouvre l'app pour voir`,
      tag:  'gaele-pending'
    });
  }
  // Notifications rappels datées
  state.prospects.forEach(p => {
    if (!p.rappel) return;
    const rappelTime = new Date(p.rappel).getTime();
    if (rappelTime > now && rappelTime < now + 24 * 3600 * 1000) {
      scheduleRappelNotif(p);
    }
  });
}

function scheduleRappelNotif(p) {
  if (Notification.permission !== 'granted' || !p.rappel) return;
  const delay = new Date(p.rappel).getTime() - Date.now();
  if (delay > 0 && delay < 7 * 24 * 3600 * 1000) {
    setTimeout(() => {
      new Notification('☀️ Rappel Gaele Pro', {
        body: `📞 Appeler ${p.nom} — ${p.adresse}`,
        tag:  'rappel-' + p.id
      });
    }, delay);
  }
}

// ── CARTE LEAFLET ──────────────────────────────────────
function initMap() {
  const container = document.getElementById('map-container');
  if (!window.L) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt2)">⚠️ Leaflet non chargé (connexion requise)</div>';
    return;
  }
  if (!state.mapInstance) {
    state.mapInstance = L.map('map-container', { zoomControl: true }).setView([50.4, 4.7], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(state.mapInstance);
  } else {
    // Supprimer les anciens markers
    state.mapInstance.eachLayer(layer => {
      if (layer instanceof L.Marker) state.mapInstance.removeLayer(layer);
    });
    // Forcer le recalcul de la taille (cas où la page était cachée)
    state.mapInstance.invalidateSize();
  }

  const withGeo   = state.prospects.filter(p => state.geocodeCache[p.id]);
  const toGeocode = state.prospects.filter(p => !state.geocodeCache[p.id]);

  // Placer les markers déjà géocodés
  withGeo.forEach(p => addMarker(p, state.geocodeCache[p.id]));

  const statusEl = document.getElementById('map-status');
  statusEl.textContent = `${withGeo.length} prospect(s) affichés`;

  if (toGeocode.length > 0 && !state.geocodingActive) {
    geocodeQueue(toGeocode);
  }
}

function refreshMap() {
  if (!state.mapInstance) { initMap(); return; }
  state.mapInstance.eachLayer(layer => {
    if (layer instanceof L.Marker) state.mapInstance.removeLayer(layer);
  });
  state.prospects.forEach(p => {
    if (state.geocodeCache[p.id]) addMarker(p, state.geocodeCache[p.id]);
  });
  const toGeocode = state.prospects.filter(p => !state.geocodeCache[p.id]);
  if (toGeocode.length > 0) geocodeQueue(toGeocode);
}

async function geocodeQueue(prospects) {
  state.geocodingActive = true;
  const statusEl   = document.getElementById('geocode-status');
  const mapStatusEl = document.getElementById('map-status');
  statusEl.style.display = 'block';

  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    statusEl.textContent = `Géocodage ${i + 1}/${prospects.length} — ${p.adresse}`;
    try {
      const query = encodeURIComponent(p.adresse + ', Belgique');
      const resp  = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=be`, {
        headers: { 'Accept-Language': 'fr' }
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      if (data && data[0]) {
        const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        state.geocodeCache[p.id] = coords;
        localStorage.setItem('gaele_geocache', JSON.stringify(state.geocodeCache));
        addMarker(p, coords);
        mapStatusEl.textContent = `${Object.keys(state.geocodeCache).length} prospect(s) affichés`;
      }
    } catch (e) {
      console.warn('Geocode error:', e);
    }
    // Respecter le rate-limit Nominatim (1 req/s)
    await new Promise(r => setTimeout(r, 1100));
  }

  statusEl.style.display = 'none';
  state.geocodingActive  = false;
}

function addMarker(p, coords) {
  if (!state.mapInstance || !coords) return;
  const colors = { signe:'#27ae60', rdv:'#C9A84C', rappel:'#2980B9', non:'#e74c3c' };
  const color  = colors[p.statut] || '#8aab8e';
  const labels = { signe:'Signé', rdv:'RDV', rappel:'Rappel', non:'Non' };

  const icon = L.divIcon({
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
    className: '',
    iconSize:   [14, 14],
    iconAnchor: [7, 7]
  });

  const popup = `
    <div style="font-family:sans-serif;font-size:13px;line-height:1.5;min-width:150px">
      <div style="font-weight:700;color:#0a1a0f;margin-bottom:4px">${escHtml(p.nom)}</div>
      <div style="font-size:11px;color:#555">${escHtml(p.adresse)}</div>
      <div style="margin-top:4px">
        <span style="background:${color};color:#fff;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:700">${labels[p.statut] || '?'}</span>
      </div>
      ${p.tel ? `<div style="margin-top:5px;font-size:11px"><a href="tel:${escHtml(p.tel)}" style="color:#2980b9">${escHtml(p.tel)}</a></div>` : ''}
      <div style="font-size:10px;color:#999;margin-top:3px">${p.date} ${p.heure}</div>
    </div>`;

  L.marker([coords.lat, coords.lon], { icon }).bindPopup(popup).addTo(state.mapInstance);
}

// ── DASHBOARD ──────────────────────────────────────────
function renderDashboard() {
  const ps    = state.prospects;
  const total  = ps.length;
  const signes = ps.filter(p => p.statut === 'signe').length;
  const rdv    = ps.filter(p => p.statut === 'rdv').length;
  const conv   = total > 0 ? Math.round((signes / total) * 100) : 0;
  const obj    = getObjectifs();

  document.getElementById('d-total').textContent  = total;
  document.getElementById('d-signes').textContent = signes;
  document.getElementById('d-rdv').textContent    = rdv;
  document.getElementById('d-conv').textContent   = conv + '%';

  const pctVisites = Math.min(100, Math.round((total / obj.visites) * 100));
  const pctSignes  = Math.min(100, Math.round((signes / obj.contrats) * 100));
  document.getElementById('obj-txt').textContent        = total + ' / ' + obj.visites;
  document.getElementById('obj-signes-txt').textContent = signes + ' / ' + obj.contrats;
  document.getElementById('obj-bar').style.width        = pctVisites + '%';
  document.getElementById('obj-signes-bar').style.width = pctSignes + '%';

  // Week chart
  const days    = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const today   = new Date().getDay();
  const weekData = Array(7).fill(0);
  ps.forEach(p => {
    const diff = Math.floor((Date.now() - p.id) / (1000 * 60 * 60 * 24));
    if (diff < 7) weekData[6 - diff]++;
  });
  const maxW = Math.max(...weekData, 1);
  document.getElementById('week-chart').innerHTML = weekData.map((v, i) => {
    const h  = Math.max(4, Math.round((v / maxW) * 56));
    const di = (today - (6 - i) + 7) % 7;
    return `<div class="mini-bar-wrap">
      <div class="mini-bar" style="height:${h}px"></div>
      <div class="mini-bar-lbl">${days[di]}</div>
    </div>`;
  }).join('');

  // Statuts
  const sMap = {
    signe: { l:'✅ Signés', c:'#27ae60' }, rdv:   { l:'📅 RDV',   c:'var(--or)' },
    rappel:{ l:'📞 Rappel', c:'#2980b9' }, non:   { l:'❌ Non',   c:'#e74c3c'  }
  };
  document.getElementById('stats-statuts').innerHTML = Object.entries(sMap).map(([k, v]) => {
    const n   = ps.filter(p => p.statut === k).length;
    const pct = total > 0 ? Math.round((n / total) * 100) : 0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:4px">
        <span>${v.l}</span><span style="color:${v.c};font-weight:700">${n} (${pct}%)</span>
      </div>
      <div class="progress-wrap"><div style="height:100%;width:${pct}%;border-radius:20px;background:${v.c};transition:width .6s"></div></div>
    </div>`;
  }).join('');

  // Tips IA
  const tips = [];
  if (total === 0) tips.push('🚀 Lance ta première session de prospection aujourd\'hui !');
  if (conv < 5 && total > 10) tips.push('💡 Taux de conversion bas — améliore ton accroche avec le script recensement.');
  if (rdv > 0) tips.push(`📞 ${rdv} RDV à honorer — rappelle-les dans les 24h !`);
  if (signes > 0) tips.push(`🎉 ${signes} contrat(s) signé(s) — continue !`);
  if (total > 0 && total < 50) tips.push('📈 Objectif : 50 visites cette semaine. Plus de volume = plus de conversions.');
  if (pctVisites >= 100) tips.push(`🏆 Objectif visites atteint ! (${total} / ${obj.visites})`);
  if (pctSignes >= 100) tips.push(`🥇 Objectif contrats atteint ! (${signes} / ${obj.contrats})`);
  const pendingRappels = ps.filter(p => p.statut === 'rappel').length;
  if (pendingRappels > 0) tips.push(`⏰ ${pendingRappels} prospect(s) en attente de rappel — n'oublie pas d'activer les notifications 🔔`);
  if (tips.length === 0) tips.push('✅ Tout roule ! Maintiens le rythme de 50 maisons par session.');
  document.getElementById('ai-tips').innerHTML = tips.map(t => `<div style="margin-bottom:6px">• ${t}</div>`).join('');
}

// ── PLANNING ───────────────────────────────────────────
function renderPlanning() {
  const jours   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const today   = new Date().getDay();
  const planning = [
    { j:1, h:'14h–18h', zone:'Tubize centre',           target:50, tip:'Rue du Bailli, Rue des Forges, Rue de Mons' },
    { j:1, h:'Admin',   zone:'Rappels + Suivi CRM',      target:0,  tip:'Relancer les prospects de la session' },
    { j:3, h:'14h–18h', zone:'Nivelles',                 target:50, tip:'Mercredi = parents à la maison' },
    { j:4, h:'14h–18h', zone:'Rebecq / Braine-le-Comte', target:50, tip:'Peu prospectés, bon potentiel' },
    { j:5, h:'Admin',   zone:'LinkedIn + Docs',           target:0,  tip:'Post LinkedIn + préparer le samedi' },
    { j:6, h:'10h–13h', zone:'⭐ Meilleur créneau',        target:60, tip:'Tout le monde est disponible le samedi matin' }
  ];

  document.getElementById('planning-week').innerHTML = planning.map(p => {
    const isToday = p.j === today;
    return `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);${isToday?'background:rgba(201,168,76,.05);border-radius:8px;padding:10px':''}">
      <div style="min-width:70px">
        <div style="font-size:0.7rem;font-weight:700;color:${isToday?'var(--or)':'var(--txt2)'}">${jours[p.j]}</div>
        <div style="font-size:0.65rem;color:var(--txt2)">${p.h}</div>
      </div>
      <div style="flex:1">
        <div style="font-size:0.82rem;font-weight:600;color:var(--txt)">${p.zone}</div>
        <div style="font-size:0.68rem;color:var(--txt2);margin-top:2px">${p.tip}</div>
      </div>
      ${p.target ? `<div style="text-align:center;min-width:36px"><div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;color:var(--or2)">${p.target}</div><div style="font-size:0.55rem;color:var(--txt2)">maisons</div></div>` : ''}
    </div>`;
  }).join('');

  const zones = [
    { nom:'Tubize',          dist:'25 min', note:'🔴 Top priorité — classe moyenne, peu prospectée' },
    { nom:'Nivelles',        dist:'30 min', note:'🔴 Bonne densité, profil idéal' },
    { nom:'Rebecq',          dist:'30 min', note:'🟡 Village résidentiel, zéro concurrence' },
    { nom:'Braine-le-Comte', dist:'35 min', note:'🟡 Ville ouvrière, fort potentiel' },
    { nom:'Manage',          dist:'45 min', note:'🟢 Classe moyenne typique' },
    { nom:'La Louvière',     dist:'45 min', note:'🟢 Grand volume, très réceptif' }
  ];
  document.getElementById('zones-list').innerHTML = zones.map(z => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:0.85rem;font-weight:600">${z.nom}</div>
        <div style="font-size:0.68rem;color:var(--txt2);margin-top:1px">${z.note}</div>
      </div>
      <div style="font-size:0.7rem;color:var(--txt2)">${z.dist}</div>
    </div>`).join('');
}

// ── OBJECTIFS MODAL ────────────────────────────────────
function openObjectifsModal() {
  const obj = getObjectifs();
  document.getElementById('obj-visites-input').value  = obj.visites;
  document.getElementById('obj-contrats-input').value = obj.contrats;
  document.getElementById('modal-objectifs').classList.add('open');
}
function saveObjectifsModal() {
  const visites  = parseInt(document.getElementById('obj-visites-input').value)  || 210;
  const contrats = parseInt(document.getElementById('obj-contrats-input').value) || 4;
  saveObjectifs({ visites, contrats });
  document.getElementById('modal-objectifs').classList.remove('open');
  showToast('🎯 Objectifs mis à jour !');
  renderDashboard();
}

// ── SAUVEGARDE & SYNC ──────────────────────────────────
function exportDataJSON() {
  const data = {
    prospects: state.prospects,
    geocodeCache: state.geocodeCache,
    b2bGeocache: state.b2bGeocache,
    objectifs: getObjectifs(),
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `gaele_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('💾 Données exportées avec succès');
}

function importDataJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.prospects) throw new Error('Format invalide');
      
      if (confirm(`Importer ${data.prospects.length} prospects ? Cela remplacera vos données actuelles.`)) {
        state.prospects = data.prospects;
        state.geocodeCache = data.geocodeCache || {};
        state.b2bGeocache = data.b2bGeocache || {};
        localStorage.setItem('gaele_prospects', JSON.stringify(state.prospects));
        localStorage.setItem('gaele_geocache', JSON.stringify(state.geocodeCache));
        localStorage.setItem('gaele_b2b_geocache', JSON.stringify(state.b2bGeocache));
        if (data.objectifs) saveObjectifs(data.objectifs);
        
        showToast('✅ Importation réussie !', 'var(--vert-ok)');
        renderDashboard();
        if (window.MapModule) MapModule.refreshMarkers();
      }
    } catch(err) {
      alert('Erreur lors de l\'importation : ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ── NOTIFICATIONS ──────────────────────────────────────
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      document.getElementById('notif-btn').style.color = '#4ecb71';
      showToast('🔔 Notifications activées');
    }
  });
}

function checkPendingNotifications() {
  const now = new Date();
  state.prospects.forEach(p => {
    if (p.rappel && p.statut === 'rappel') {
      const rappelDate = new Date(p.rappel);
      const diff = rappelDate - now;
      // Notifier 5 minutes avant ou au moment même (si pas déjà notifié)
      if (diff > 0 && diff < 300000 && !p._notified) {
        sendNotification(`Rappel : ${p.nom}`, `Rendez-vous à ${rappelDate.toLocaleTimeString()} pour ${p.adresse}`);
        p._notified = true; // Empêcher les doublons pendant la session
      }
    }
  });
}

function sendNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'assets/logo.png' });
  } else {
    showToast(`🔔 ${title}: ${body}`, 'var(--or)');
  }
}

// On vérifie toutes les minutes
setInterval(checkPendingNotifications, 60000);

// ── EXPORT PDF ─────────────────────────────────────────
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const ps  = state.prospects;
  const obj = getObjectifs();
  
  showToast('📄 Génération du rapport...', 'var(--or)');

  // -- Design Header --
  doc.setFillColor(10, 26, 15); // Vert foncé Gaele
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(201, 168, 76); // Or Gaele
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('GAELE PRO — RAPPORT ACTIVITÉ', 20, 20);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le : ${new Date().toLocaleString('fr-BE')}`, 20, 30);
  doc.text(`Utilisateur : Andy Kyambikwa`, 20, 35);

  // -- Stats Overview --
  let y = 55;
  doc.setTextColor(10, 26, 15);
  doc.setFontSize(14);
  doc.text('1. RÉSUMÉ DES PERFORMANCES', 20, y);
  y += 10;
  
  const stats = [
    ['Maisons visitées', ps.length, `Objectif: ${obj.visites}`],
    ['Contrats signés', ps.filter(p => p.statut === 'signe').length, `Objectif: ${obj.contrats}`],
    ['Rendez-vous fixés', ps.filter(p => p.statut === 'rdv').length, ''],
    ['Taux de conversion', ps.length > 0 ? Math.round((ps.filter(p => p.statut === 'signe').length / ps.length) * 100) + '%' : '0%', '']
  ];
  
  doc.setFontSize(11);
  stats.forEach(s => {
    doc.setFont('helvetica', 'bold');
    doc.text(s[0], 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${s[1]}`, 80, y);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(s[2], 120, y);
    doc.setFontSize(11);
    doc.setTextColor(10, 26, 15);
    y += 8;
  });

  // -- List of Signed (Top Priority) --
  y += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. CONTRATS SIGNÉS', 20, y);
  y += 8;
  
  doc.setFontSize(10);
  const signed = ps.filter(p => p.statut === 'signe');
  if (signed.length === 0) {
    doc.text('Aucun contrat signé dans la période.', 25, y);
    y += 8;
  } else {
    signed.forEach(p => {
      if (y > 270) { doc.addPage(); y = 30; }
      doc.text(`• ${p.nom} — ${p.adresse} (${p.date})`, 25, y);
      y += 6;
    });
  }

  // -- List of RDV --
  y += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. RENDEZ-VOUS À HONORER', 20, y);
  y += 8;
  
  doc.setFontSize(10);
  const rdv = ps.filter(p => p.statut === 'rdv');
  if (rdv.length === 0) {
    doc.text('Aucun rendez-vous fixé.', 25, y);
    y += 8;
  } else {
    rdv.forEach(p => {
      if (y > 270) { doc.addPage(); y = 30; }
      doc.text(`• ${p.nom} — ${p.adresse} (Tél: ${p.tel || 'N/A'})`, 25, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`  Note: ${p.notes || 'Pas de notes'}`, 25, y);
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
    });
  }

  // Footer footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Rapport Gaele Pro — Page ${i} sur ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(`Rapport_Gaele_${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('✅ Rapport PDF téléchargé !', 'var(--vert-ok)');
}

// ── B2B LEADS (BCE JSON) ───────────────────────────────
function loadB2BLeads() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'scripts/bce_wallonie.json', true);
  xhr.onload = function() {
    if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
      try {
        const rawData = JSON.parse(xhr.responseText);
        state.b2bLeads = rawData.filter(e => !e.demo);
        console.log(`✅ ${state.b2bLeads.length} leads B2B chargés (Filtrage démo: ${rawData.length - state.b2bLeads.length} supprimés)`);
        // Refresh B2B view if on CRM
        if (currentCrmTab === 'b2b') renderB2B();
        // Refresh map if active
        if (window.MapModule && document.getElementById('page-carte').classList.contains('active')) {
          MapModule.refreshMarkers();
        }
      } catch(e) {
        console.warn('B2B JSON invalide:', e);
      }
    }
  };
  xhr.onerror = function() {
    console.log('ℹ️ bce_wallonie.json absent — Voir REAL_DATA_GUIDE.md pour générer les leads B2B réels.');
  };
  try { xhr.send(); } catch(e) { /* silencieux en file:// */ }
}

// ── UTILS ──────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, bg) {
  const t = document.getElementById('toast');
  t.textContent     = msg;
  t.style.background = bg || 'var(--vert-ok)';
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

function clearData() {
  if (!confirm('Effacer TOUTES les données ?')) return;
  state.prospects = [];
  state.geocodeCache = {};
  localStorage.removeItem('gaele_prospects');
  localStorage.removeItem('gaele_geocache');
  resetSession();
  showToast('🗑️ Données effacées');
}

// ── INIT & AUTHENTIFICATION ───────────────────────────
async function handleLogin(e) {
  if (e) e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const btn = document.getElementById('btn-login');
  const errorDiv = document.getElementById('auth-error');

  if (!supabaseClient) {
    alert("Erreur: Clé API Supabase manquante ou SDK non chargé.");
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connexion...';
  errorDiv.style.display = 'none';

  try {
    // ── MASTER CODE BYPASS ────────────────────────────────
    if (password === 'azertyu' || password === 'AZERTYU') {
      showToast('🔓 Accès accordé (Master Code) !', 'var(--vert-ok)');
      initAppAfterAuth();
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    showToast('🔓 Accès accordé !', 'var(--vert-ok)');
    initAppAfterAuth();
  } catch (err) {
    console.error(err);
    errorDiv.textContent = "Erreur : " + (err.message || "Identifiants invalides");
    errorDiv.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = "Déverrouiller l'accès";
  }
}

async function handleLogout() {
  if (confirm('Voulez-vous vous déconnecter ?')) {
    await supabaseClient.auth.signOut();
    location.reload();
  }
}

async function checkAuth() {
  if (!supabaseClient || SUPABASE_KEY === 'VOTRE_ANON_KEY_ICI') {
    console.warn("Supabase Anon Key manquante. Veuillez configurer la clé dans app.js.");
    document.getElementById('page-auth').style.display = 'flex';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('main-nav').style.display = 'none';
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    initAppAfterAuth();
  } else {
    document.getElementById('page-auth').style.display = 'flex';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('main-nav').style.display = 'none';
  }
}

function initAppAfterAuth() {
  document.getElementById('page-auth').style.display = 'none';
  document.getElementById('app-content').style.display = 'flex';
  document.getElementById('main-nav').style.display = 'flex';
  
  document.getElementById('header-sub').textContent =
    'Andy Kyambikwa · ' + new Date().toLocaleDateString('fr-BE', { weekday:'long', day:'numeric', month:'long' });

  // État bouton notification
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    document.getElementById('notif-btn').style.color = '#4ecb71';
    checkPendingNotifications();
  }

  // Charger leads B2B
  loadB2BLeads();
  
  // Rendu initial
  renderDashboard();
  if (state.prospects.length > 0 && window.MapModule) {
    MapModule.refreshMarkers();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Events footer
document.getElementById('modal-prospect').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.getElementById('modal-objectifs').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('open');
});
