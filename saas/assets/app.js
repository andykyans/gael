// ── STATE ──────────────────────────────────────────────
const state = {
  prospects: JSON.parse(localStorage.getItem('gaele_prospects') || '[]'),
  session: { active: false, start: null, visites: 0, interesses: 0, rdv: 0, signes: 0, elapsed: 0 },
  timer: null,
  selections: { q1: null, q2: null, q3: null, statut: null }
};

// ── OBJECTIFS (configurables) ──────────────────────────
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
  if (id === 'crm') renderCRM();
  if (id === 'dashboard') renderDashboard();
  if (id === 'planning') renderPlanning();
}

// ── SESSION TIMER ──────────────────────────────────────
function toggleSession() {
  const btn = document.getElementById('btn-session');
  const badge = document.getElementById('session-badge');
  if (!state.session.active) {
    state.session.active = true;
    state.session.start = Date.now() - (state.session.elapsed || 0);
    state.timer = setInterval(updateTimer, 1000);
    btn.textContent = '⏸ Pause session';
    btn.className = 'btn btn-rouge';
    badge.textContent = 'Session ON 🔴';
    badge.style.background = '#e74c3c';
    badge.style.color = '#fff';
  } else {
    state.session.active = false;
    state.session.elapsed = Date.now() - state.session.start;
    clearInterval(state.timer);
    btn.textContent = '▶ Reprendre session';
    btn.className = 'btn btn-vert';
    badge.textContent = 'Session PAUSE';
    badge.style.background = '#f39c12';
    badge.style.color = '#fff';
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
  if (state.session.active) { clearInterval(state.timer); }
  state.session = { active: false, start: null, visites: 0, interesses: 0, rdv: 0, signes: 0, elapsed: 0 };
  document.getElementById('timer-display').textContent = '00:00:00';
  document.getElementById('btn-session').textContent = '▶ Démarrer session';
  document.getElementById('btn-session').className = 'btn btn-vert';
  const badge = document.getElementById('session-badge');
  badge.textContent = 'Session OFF';
  badge.style.background = 'var(--or)';
  badge.style.color = 'var(--v)';
  updateSessionCounters();
}

function updateSessionCounters() {
  document.getElementById('c-visites').textContent = state.session.visites;
  document.getElementById('c-interesses').textContent = state.session.interesses;
  document.getElementById('c-rdv').textContent = state.session.rdv;
  document.getElementById('c-signes').textContent = state.session.signes;
}

// ── SELECTIONS ─────────────────────────────────────────
function sel(btn, q, val, cls) {
  document.querySelectorAll(`[data-q="${q}"]`).forEach(b => {
    b.className = 'choix-btn';
  });
  btn.className = 'choix-btn ' + cls;
  state.selections[q] = val;
}

// ── SAVE VISITE ────────────────────────────────────────
function saveVisite() {
  const adresse = document.getElementById('f-adresse').value.trim();
  const nom = document.getElementById('f-nom').value.trim();
  const tel = document.getElementById('f-tel').value.trim();
  const notes = document.getElementById('f-notes').value.trim();
  const { q1, q2, q3, statut } = state.selections;

  if (!adresse) { showToast('⚠️ Entrez une adresse', '#e74c3c'); return; }
  if (!statut) { showToast('⚠️ Sélectionnez un statut', '#e74c3c'); return; }

  const prospect = {
    id: Date.now(),
    adresse,
    nom: nom || 'Inconnu',
    tel, notes,
    q1: q1 || '?', q2: q2 || '?', q3: q3 || '?',
    statut,
    date: new Date().toLocaleDateString('fr-BE'),
    heure: new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
  };

  state.prospects.unshift(prospect);
  localStorage.setItem('gaele_prospects', JSON.stringify(state.prospects));

  // Update session counters
  state.session.visites++;
  if (q3 === 'oui') state.session.interesses++;
  if (statut === 'rdv') state.session.rdv++;
  if (statut === 'signe') state.session.signes++;
  updateSessionCounters();

  // Reset form
  document.getElementById('f-adresse').value = '';
  document.getElementById('f-nom').value = '';
  document.getElementById('f-tel').value = '';
  document.getElementById('f-notes').value = '';
  document.querySelectorAll('.choix-btn').forEach(b => b.className = 'choix-btn');
  state.selections = { q1: null, q2: null, q3: null, statut: null };

  showToast('✅ Visite enregistrée !');
}

// ── CRM ────────────────────────────────────────────────
function renderCRM(filter) {
  const list = document.getElementById('prospects-list');
  const empty = document.getElementById('crm-empty');
  const count = document.getElementById('crm-count');

  let data = state.prospects;
  if (filter && filter !== 'all') {
    if (filter === 'chaud') data = data.filter(p => p.statut === 'rdv' || p.statut === 'signe');
    else data = data.filter(p => p.statut === filter);
  }

  count.textContent = data.length + ' prospect' + (data.length > 1 ? 's' : '');

  if (data.length === 0) {
    list.innerHTML = ''; empty.style.display = 'block'; return;
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
    const si = statutInfo[p.statut] || statutInfo.default;
    const initials = p.nom.split(' ').map(w => w[0] || '').join('').toUpperCase().substring(0, 2) || '?';
    return `<div class="prospect-item" onclick="showProspect(${p.id})">
      <div class="prospect-avatar" style="background:#${si.bg}20;color:#fff">${initials}</div>
      <div class="prospect-info">
        <div class="prospect-name">${escHtml(p.nom)}</div>
        <div class="prospect-detail">${escHtml(p.adresse)} · ${p.date} ${p.heure}</div>
      </div>
      <span class="prospect-badge ${si.cls}">${si.label}</span>
    </div>`;
  }).join('');
}

function filterProspects(f) { renderCRM(f); }

function showProspect(id) {
  const p = state.prospects.find(x => x.id === id);
  if (!p) return;
  document.getElementById('modal-nom').textContent = p.nom + ' — ' + p.adresse;
  const q1l = { oui: '✅ Propriétaire', non: '❌ Locataire', copro: '🤝 Co-proprio', '?': '—' };
  const q2l = { non: '✅ Pas de panneaux', oui: '⚠️ Déjà équipé', ancien: '🔄 Ancienne install.', '?': '—' };
  const q3l = { oui: '⭐ Intéressé', peut: '🤔 Peut-être', non: '❌ Non', '?': '—' };
  const sl  = { signe: '✅ Contrat signé', rdv: '📅 RDV fixé', rappel: '📞 À rappeler', non: '❌ Non intéressé' };
  document.getElementById('modal-content').innerHTML = `
    <div style="display:grid;gap:8px;font-size:0.82rem">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--txt2)">Statut</span><span style="font-weight:700;color:var(--or2)">${sl[p.statut] || '—'}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--txt2)">Propriétaire</span><span>${q1l[p.q1] || '—'}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--txt2)">Panneaux</span><span>${q2l[p.q2] || '—'}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--txt2)">Intérêt</span><span>${q3l[p.q3] || '—'}</span></div>
      ${p.tel ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span style="color:var(--txt2)">Téléphone</span><a href="tel:${escHtml(p.tel)}" style="color:var(--or2);text-decoration:none">${escHtml(p.tel)}</a></div>` : ''}
      ${p.notes ? `<div style="padding:8px 0"><span style="color:var(--txt2);display:block;margin-bottom:4px">Notes</span><span style="font-style:italic">${escHtml(p.notes)}</span></div>` : ''}
    </div>`;
  document.getElementById('btn-delete-prospect').onclick = () => deleteProspect(id);
  document.getElementById('modal-prospect').classList.add('open');
}

function deleteProspect(id) {
  if (!confirm('Supprimer ce prospect ?')) return;
  state.prospects = state.prospects.filter(p => p.id !== id);
  localStorage.setItem('gaele_prospects', JSON.stringify(state.prospects));
  closeModal();
  renderCRM();
  showToast('🗑️ Supprimé');
}

function closeModal() { document.getElementById('modal-prospect').classList.remove('open'); }

// ── EXPORT CSV ─────────────────────────────────────────
function exportCSV() {
  if (state.prospects.length === 0) {
    showToast('⚠️ Aucun prospect à exporter', '#e74c3c');
    return;
  }
  const q1l = { oui: 'Propriétaire', non: 'Locataire', copro: 'Co-proprio', '?': '' };
  const q2l = { non: 'Pas de panneaux', oui: 'Déjà équipé', ancien: 'Ancienne install.', '?': '' };
  const q3l = { oui: 'Intéressé', peut: 'Peut-être', non: 'Non', '?': '' };
  const sl  = { signe: 'Signé', rdv: 'RDV fixé', rappel: 'À rappeler', non: 'Non intéressé' };

  const headers = ['Nom', 'Adresse', 'Téléphone', 'Statut', 'Propriétaire', 'Panneaux solaires', 'Intérêt', 'Date', 'Heure', 'Notes'];
  const rows = state.prospects.map(p => [
    p.nom, p.adresse, p.tel,
    sl[p.statut] || p.statut,
    q1l[p.q1] || p.q1,
    q2l[p.q2] || p.q2,
    q3l[p.q3] || p.q3,
    p.date, p.heure,
    p.notes
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`));

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM pour Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `gaele_prospects_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Export CSV téléchargé !');
}

// ── OBJECTIFS MODAL ────────────────────────────────────
function openObjectifsModal() {
  const obj = getObjectifs();
  document.getElementById('obj-visites-input').value = obj.visites;
  document.getElementById('obj-contrats-input').value = obj.contrats;
  document.getElementById('modal-objectifs').classList.add('open');
}

function saveObjectifsModal() {
  const visites  = parseInt(document.getElementById('obj-visites-input').value) || 210;
  const contrats = parseInt(document.getElementById('obj-contrats-input').value) || 4;
  saveObjectifs({ visites, contrats });
  document.getElementById('modal-objectifs').classList.remove('open');
  showToast('🎯 Objectifs mis à jour !');
  renderDashboard();
}

// ── DASHBOARD ──────────────────────────────────────────
function renderDashboard() {
  const ps = state.prospects;
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
  document.getElementById('obj-txt').textContent       = total + ' / ' + obj.visites;
  document.getElementById('obj-signes-txt').textContent = signes + ' / ' + obj.contrats;
  document.getElementById('obj-bar').style.width        = pctVisites + '%';
  document.getElementById('obj-signes-bar').style.width = pctSignes + '%';

  // Week chart
  const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const today = new Date().getDay();
  const weekData = Array(7).fill(0);
  ps.forEach(p => {
    const d = new Date(p.id);
    const diff = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
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
    signe:  { l: '✅ Signés', c: '#27ae60' },
    rdv:    { l: '📅 RDV',   c: 'var(--or)' },
    rappel: { l: '📞 Rappel', c: '#2980b9' },
    non:    { l: '❌ Non',    c: '#e74c3c' }
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
  if (conv < 5 && total > 10) tips.push('💡 Ton taux de conversion est bas — améliore ton accroche avec le script recensement.');
  if (rdv > 0) tips.push(`📞 Tu as ${rdv} RDV à honorer — rappelle-les dans les 24h pour maximiser la conversion.`);
  if (signes > 0) tips.push(`🎉 Bravo ! ${signes} contrat(s) signé(s). Continue sur cette lancée !`);
  if (total > 0 && total < 50) tips.push('📈 Objectif : atteindre 50 visites cette semaine. Plus de volume = plus de conversions.');
  if (pctVisites >= 100) tips.push(`🏆 Objectif visites atteint ! (${total} / ${obj.visites})`);
  if (pctSignes >= 100) tips.push(`🥇 Objectif contrats atteint ! (${signes} / ${obj.contrats})`);
  if (tips.length === 0) tips.push('✅ Tout roule ! Maintiens le rythme de 50 maisons par session.');
  document.getElementById('ai-tips').innerHTML = tips.map(t => `<div style="margin-bottom:6px">• ${t}</div>`).join('');
}

// ── PLANNING ───────────────────────────────────────────
function renderPlanning() {
  const jours   = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const today   = new Date().getDay();
  const planning = [
    { j: 1, h: '14h–18h', zone: 'Tubize centre',          target: 50, tip: 'Rue du Bailli, Rue des Forges, Rue de Mons' },
    { j: 1, h: 'Admin',   zone: 'Rappels + Suivi CRM',     target: 0,  tip: 'Relancer les prospects de la session' },
    { j: 3, h: '14h–18h', zone: 'Nivelles',                target: 50, tip: 'Mercredi = parents à la maison' },
    { j: 4, h: '14h–18h', zone: 'Rebecq / Braine-le-Comte',target: 50, tip: 'Peu prospectés, bon potentiel' },
    { j: 5, h: 'Admin',   zone: 'LinkedIn + Docs',          target: 0,  tip: 'Post LinkedIn + préparer le samedi' },
    { j: 6, h: '10h–13h', zone: '⭐ Meilleur créneau',       target: 60, tip: 'Tout le monde est disponible le samedi matin' }
  ];

  document.getElementById('planning-week').innerHTML = planning.map(p => {
    const isToday = p.j === today;
    return `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);${isToday ? 'background:rgba(201,168,76,.05);border-radius:8px;padding:10px;margin:-2px' : ''}">
      <div style="min-width:70px">
        <div style="font-size:0.7rem;font-weight:700;color:${isToday ? 'var(--or)' : 'var(--txt2)'}">${jours[p.j]}</div>
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
    { nom: 'Tubize',            dist: '25 min', note: '🔴 Top priorité — classe moyenne, peu prospectée' },
    { nom: 'Nivelles',          dist: '30 min', note: '🔴 Bonne densité, profil idéal' },
    { nom: 'Rebecq',            dist: '30 min', note: '🟡 Village résidentiel, zéro concurrence' },
    { nom: 'Braine-le-Comte',   dist: '35 min', note: '🟡 Ville ouvrière, fort potentiel' },
    { nom: 'Manage',            dist: '45 min', note: '🟢 Classe moyenne typique' },
    { nom: 'La Louvière',       dist: '45 min', note: '🟢 Grand volume, très réceptif' }
  ];

  document.getElementById('zones-list').innerHTML = zones.map(z => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:0.85rem;font-weight:600">${z.nom}</div>
        <div style="font-size:0.68rem;color:var(--txt2);margin-top:1px">${z.note}</div>
      </div>
      <div style="font-size:0.7rem;color:var(--txt2);text-align:right">${z.dist}</div>
    </div>`).join('');
}

// ── UTILS ──────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, bg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = bg || 'var(--vert-ok)';
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2000);
}

function clearData() {
  if (!confirm('Effacer TOUTES les données ?')) return;
  state.prospects = [];
  localStorage.removeItem('gaele_prospects');
  resetSession();
  showToast('🗑️ Données effacées');
}

// ── EVENTS ─────────────────────────────────────────────
document.getElementById('modal-prospect').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
document.getElementById('modal-objectifs').addEventListener('click', function (e) {
  if (e.target === this) document.getElementById('modal-objectifs').classList.remove('open');
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('header-sub').textContent =
    'Andy Kyambikwa · ' + new Date().toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
});
