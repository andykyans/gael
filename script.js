// ── SUPABASE INIT ──
console.log("Gaelexl Script Version: 3.0 (Email + Logs)");
var SUPABASE_URL = 'https://adebczvhvxajiyeeyerx.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWJjenZodnhhaml5ZWV5ZXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzE2MDIsImV4cCI6MjA4NzQ0NzYwMn0._wGnpo7sHJeGYHLLdATgWxss8ySVnCZ0UQU5VB6nhhY';
var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

var blockedDatesCache = [];

async function loadBlockedDates() {
  try {
    var res = await _supabase.from('prospects').select('date_rdv').eq('admin_status', 'blocked');
    if (res.data) {
      blockedDatesCache = res.data.map(function(d) { return d.date_rdv; }).filter(Boolean);
    }
  } catch(e) { console.warn("Could not fetch blocked dates:", e); }
}

// Initial loading of blocked dates is now handled in DOMContentLoaded.

var qState = {};

function getRegionByCP(cp) {
  if (!cp || cp.length < 4) return null;
  var n = parseInt(cp);
  if (isNaN(n)) return null;
  if (n >= 1000 && n <= 1299) return 'bxl';
  if ((n >= 1300 && n <= 1499) || (n >= 4000 && n <= 7999)) return 'wal';
  if ((n >= 1500 && n <= 3999) || (n >= 8000 && n <= 9999)) return 'fla';
  return null;
}

async function updateCpFeedbackLogic(cp, feedbackId) {
  var feedback = document.getElementById(feedbackId);
  if (!feedback) return;

  if (cp.length === 4) {
    var detectedRegion = getRegionByCP(cp);
    if (detectedRegion) {
      qState.region = detectedRegion;
      // Force locataire logic to reset to owner if region changed
      if (typeof forceLocataireLogic === 'function') forceLocataireLogic();

      var names = { wal: 'Wallonie', fla: 'Flandre', bxl: 'Bruxelles' };
      var regionName = names[detectedRegion] || '';
      
      feedback.textContent = regionName;
      feedback.style.display = 'block';
      // City lookup removed as requested
    }
  } else {
    feedback.style.display = 'none';
  }
}

function selectQ(btn, key, val) {
  btn.parentElement.querySelectorAll('.qcard').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  qState[key] = val;
  
  if (key === 'region') {
    var nextStep = document.getElementById('q2-grid');
    if (nextStep) {
      setTimeout(function() {
        nextStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  if (key === 'statut') {
    var q3Label = document.getElementById('q-step-3');
    var q3Grid = document.getElementById('q3-grid');
    if (val === 'proprio') {
      if (q3Label) q3Label.style.display = 'block';
      if (q3Grid) q3Grid.style.display = 'grid';
      qState.panneaux = null;
      document.getElementById('q-panneaux-info').style.display = 'none';
      return;
    } else {
      if (q3Label) q3Label.style.display = 'none';
      if (q3Grid) q3Grid.style.display = 'none';
      document.getElementById('q-panneaux-info').style.display = 'none';
    }
  }

  if (key === 'panneaux') {
    var info = document.getElementById('q-panneaux-info');
    if (val === 'oui') {
      if (info) info.style.display = 'block';
    } else {
      if (info) info.style.display = 'none';
    }
  }
  
  if (qState.region && qState.statut) {
    if (qState.statut === 'proprio' && key !== 'panneaux' && !qState.panneaux) return;
    showQualResult();
  }
}

function getOffreRecommandee() {
  var r = qState.region;
  var s = qState.statut;
  var p = qState.panneaux;
  if (!r || !s) return null;
  if (r === 'bxl') return 'Gaele Courtier';
  if (s === 'locataire') return 'Gaele Courtier';
  if (p === 'oui') return 'Gaele Courtier';
  if (s === 'proprio') return 'Gaele XL';
  return 'Gaele Courtier';
}

function showQualResult() {
  var r = qState.region;
  var s = qState.statut;
  var box = document.getElementById('qual-result');
  var cardXl = document.getElementById('card-xl');
  var cardCourtier = document.getElementById('card-courtier');

  if (!box || !cardXl || !cardCourtier) return;

  cardXl.style.display = 'none';
  cardCourtier.style.display = 'none';

  if ((r === 'wal' || r === 'fla') && s === 'proprio') {
    cardXl.style.display = 'block';
  } else {
    cardCourtier.style.display = 'block';
  }

  box.style.display = 'block';
  setTimeout(function(){ box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
}

// ── UTILITIES ──
function forceLocataireLogic() {
  var statSelect = document.getElementById('cal-statut');
  var offreSelect = document.getElementById('cal-offre');
  var typeBatSelect = document.getElementById('cal-type-batiment');
  var accordCoproWrap = document.getElementById('cal-accord-copro-wrap');
  var panneauxSelect = document.getElementById('cal-panneaux');
  var panneauxInfo = document.getElementById('cal-panneaux-info');
  
  if (statSelect && statSelect.value === 'Propri\u00E9taire') {
    if (typeBatSelect) typeBatSelect.style.display = 'block';
    if (panneauxSelect) panneauxSelect.style.display = 'block';
  } else {
    if (typeBatSelect) { typeBatSelect.style.display = 'none'; typeBatSelect.value = ''; }
    if (accordCoproWrap) accordCoproWrap.style.display = 'none';
    if (panneauxSelect) { panneauxSelect.style.display = 'none'; panneauxSelect.value = ''; }
    if (panneauxInfo) panneauxInfo.style.display = 'none';
  }

  if (panneauxSelect && panneauxSelect.value === 'Oui') {
    if (panneauxInfo) panneauxInfo.style.display = 'block';
    if (offreSelect) offreSelect.value = 'Gaele Courtier';
  } else {
    if (panneauxInfo) panneauxInfo.style.display = 'none';
  }

  if (statSelect && offreSelect && statSelect.value === 'Locataire') {
    offreSelect.value = 'Gaele Courtier';
  }
  
  if (qState.region === 'bxl' && offreSelect) {
    offreSelect.value = 'Gaele Courtier';
  }
}

function lockBody() {
  var top = window.pageYOffset || document.documentElement.scrollTop;
  document.body.style.position = 'fixed';
  document.body.style.top = '-' + top + 'px';
  document.body.style.width = '100%';
  document.body.classList.add('modal-open');
  document.body.setAttribute('data-scroll', top);
}

function unlockBody() {
  var top = document.body.getAttribute('data-scroll');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.classList.remove('modal-open');
  if (top) window.scrollTo(0, parseInt(top));
}

function lockField(el) { if (el) { el.disabled = true; el.classList.add('locked-field'); } }
function unlockField(el) { if (el) { el.disabled = false; el.classList.remove('locked-field'); } }

// ── MODAL TOGGLES ──
function openCal(e, mode) { 
  if(e) e.preventDefault(); 
  
  var statSelect = document.getElementById('cal-statut');
  var offreSelect = document.getElementById('cal-offre');
  var typeBatSelect = document.getElementById('cal-type-batiment');
  var accordCoproWrap = document.getElementById('cal-accord-copro-wrap');
  var entrepriseInp = document.getElementById('cal-entreprise');
  var msgExtra = document.getElementById('cal-message-extra');
  var panneauxSelect = document.getElementById('cal-panneaux');
  var panneauxInfo = document.getElementById('cal-panneaux-info');
  var cpInp = document.getElementById('cal-cp');
  var cpFeedback = document.getElementById('cal-cp-feedback');

  unlockField(statSelect);
  unlockField(offreSelect);
  unlockField(typeBatSelect);
  unlockField(panneauxSelect);
  unlockField(cpInp);

  if (entrepriseInp) { entrepriseInp.style.display = 'none'; entrepriseInp.value = ''; }
  if (statSelect) { statSelect.style.display = 'block'; }
  if (typeBatSelect) { typeBatSelect.style.display = 'none'; typeBatSelect.value = ''; }
  if (accordCoproWrap) { accordCoproWrap.style.display = 'none'; }
  if (panneauxSelect) { panneauxSelect.style.display = 'none'; panneauxSelect.value = ''; }
  if (panneauxInfo) { panneauxInfo.style.display = 'none'; }
  if (msgExtra) { msgExtra.value = ''; }

  if (mode === 'pro') {
    if (statSelect) { statSelect.value = 'Propri\u00E9taire'; lockField(statSelect); }
    if (entrepriseInp) { entrepriseInp.style.display = 'block'; }
    if (msgExtra) { msgExtra.value = 'PRO : '; }
    if (offreSelect) { offreSelect.value = 'Gaele XL'; lockField(offreSelect); }
  } else if (statSelect && offreSelect) {
    if (qState.statut === 'proprio') {
      statSelect.value = 'Propri\u00E9taire';
      lockField(statSelect);
      if (typeBatSelect) typeBatSelect.style.display = 'block';
      if (panneauxSelect) panneauxSelect.style.display = 'block';
      if (qState.panneaux === 'oui' && panneauxSelect) { panneauxSelect.value = 'Oui'; lockField(panneauxSelect); }
      else if (qState.panneaux === 'non' && panneauxSelect) { panneauxSelect.value = 'Non'; lockField(panneauxSelect); }
    } else if (qState.statut === 'locataire') {
      statSelect.value = 'Locataire';
      lockField(statSelect);
    }

    var qCpSearch = document.getElementById('q-cp-search');
    if (qCpSearch && qCpSearch.value && cpInp) {
      cpInp.value = qCpSearch.value;
      lockField(cpInp);
      updateCpFeedbackLogic(cpInp.value, 'cal-cp-feedback');
    }

    var recOffer = getOffreRecommandee();
    if (recOffer === 'Gaele XL') { offreSelect.value = 'Gaele XL'; lockField(offreSelect); }
    else if (recOffer === 'Gaele Courtier') { offreSelect.value = 'Gaele Courtier'; lockField(offreSelect); }

    forceLocataireLogic();
  }

  document.getElementById('cal-modal').classList.add('open'); 
  lockBody();
}

function closeCal() { document.getElementById('cal-modal').classList.remove('open'); unlockBody(); }
function openQuestionModal(e) { if (e) e.preventDefault(); document.getElementById('question-modal').classList.add('open'); lockBody(); }
function closeQuestionModal() { document.getElementById('question-modal').classList.remove('open'); unlockBody(); }
function openInfoModal(e) { if (e) e.preventDefault(); document.getElementById('info-modal').classList.add('open'); lockBody(); }
function closeInfoModal() { document.getElementById('info-modal').classList.remove('open'); unlockBody(); }

// Outside click
document.querySelectorAll('.modal-overlay').forEach(function(modal) {
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('open');
      unlockBody();
    }
  });
});

// ── FORM SUBMISSIONS ──
async function submitCal() {
  var p = document.getElementById('cal-prenom').value.trim();
  var n = document.getElementById('cal-nom').value.trim();
  var e = document.getElementById('cal-email').value.trim();
  var cp = document.getElementById('cal-cp').value.trim();
  var t = document.getElementById('cal-tel').value.trim();
  var d = document.getElementById('cal-date').value.trim();
  var h = document.getElementById('cal-time').value.trim();
  var st = document.getElementById('cal-statut') ? document.getElementById('cal-statut').value : null;
  var ofr = document.getElementById('cal-offre') ? document.getElementById('cal-offre').value : null;
  var eType = document.getElementById('cal-energie') ? document.getElementById('cal-energie').value : null;
  var enormes = document.getElementById('cal-elec-normes') ? document.getElementById('cal-elec-normes').value : null;
  var typeBat = document.getElementById('cal-type-batiment') ? document.getElementById('cal-type-batiment').value : null;
  var accordCopro = document.getElementById('cal-accord-copro') ? document.getElementById('cal-accord-copro').checked : false;
  var accordCoproPending = document.getElementById('cal-accord-copro-pending') ? document.getElementById('cal-accord-copro-pending').checked : false;
  var msgExtra = document.getElementById('cal-message-extra') ? document.getElementById('cal-message-extra').value : "";
  var entreprise = document.getElementById('cal-entreprise') ? document.getElementById('cal-entreprise').value : "";

  if(!p || !e || !cp || !t || !d || !h || !st || !ofr || !eType || !enormes){ alert('Veuillez remplir tous les champs obligatoires (*).'); return; }
  if (st === 'Propri\u00E9taire' && document.getElementById('cal-type-batiment').style.display !== 'none' && !typeBat) { alert('Veuillez pr\u00E9ciser le type de b\u00E2timent.'); return; }
  if (typeBat === 'Appartement' && !accordCopro && !accordCoproPending) { alert('Veuillez cocher l\'accord co-propri\u00E9t\u00E9.'); return; }

  var combinedDate = d + " " + h;
  if (blockedDatesCache.indexOf(combinedDate) !== -1 || blockedDatesCache.indexOf(d) !== -1) {
    alert("Cr\u00E9neau indisponible."); return;
  }

  var btn = document.querySelector('.cal-submit');
  btn.disabled = true; btn.textContent = 'Envoi...';

  var panneauxVal = document.getElementById('cal-panneaux') ? document.getElementById('cal-panneaux').value : 'Non';
  var accordCoproStr = accordCopro ? "Oui" : (accordCoproPending ? "En cours" : "Non");
  var notes = msgExtra + (entreprise ? "Entreprise: " + entreprise + "\n" : "") + 
              "Offre: " + ofr + "\nEnergies: " + eType + "\nNormes: " + enormes + "\nBatiment: " + (typeBat || "N/A") + "\nAccord Copro: " + accordCoproStr + "\nPanneaux: " + panneauxVal;

  var prospectData = { prenom: p, nom: n, email: e, telephone: t, code_postal: cp, date_rdv: combinedDate, region: qState.region || getRegionByCP(cp), statut: st, offre_recommandee: ofr, message: notes };

  try {
    var result = await _supabase.from('prospects').insert(prospectData);
    if (result.error) throw result.error;
    document.getElementById('cal-form-inner').style.display='none';
    document.getElementById('cal-success').style.display='block';
    if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: 'Prise de RDV', content_category: ofr });
    console.log("Form submitted successfully.");
  } catch (err) { alert('Erreur. R\u00E9essayez.'); console.error(err); btn.disabled = false; btn.textContent = 'Confirmer \u2192'; }
}

async function submitQuestion() {
  var p = document.getElementById('q-prenom').value.trim();
  var e = document.getElementById('q-email').value.trim();
  var cp = document.getElementById('q-cp').value.trim();
  var t = document.getElementById('q-tel').value.trim();
  var st = document.getElementById('q-statut').value;
  var msg = document.getElementById('q-message').value.trim();

  if (!p || !e || !cp || !t || !st || !msg) { alert('Champs obligatoires manquants.'); return; }
  var btn = document.querySelector('#question-modal .cal-submit');
  btn.disabled = true; btn.textContent = 'Envoi...';

  var data = { prenom: p, nom: document.getElementById('q-nom').value.trim(), email: e, telephone: t, code_postal: cp, region: getRegionByCP(cp), statut: st, message: msg };
  try {
    await _supabase.from('prospects').insert(data);
    document.getElementById('question-form-inner').style.display = 'none';
    document.getElementById('question-success').style.display = 'block';
    console.log("Question submitted successfully.");
  } catch (err) { btn.disabled = false; btn.textContent = 'Envoyer \u2192'; console.error(err); }
}

function toggleFaq(item) {
  var isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('open'); });
  if(!isOpen) item.classList.add('open');
}

// ── FOMO & REVIEWS ──
function initFomo() {
  var popup = document.getElementById('fomo-popup');
  var text = document.getElementById('fomo-text');
  if (!popup || !text) return;
  var names = ["Marc", "Sophie", "Julien", "Nathalie", "Thomas", "Marie", "Pierre", "Laura"];
  var locations = ["Namur", "Li\u00E8ge", "Charleroi", "Mons", "Tournai", "Flandre", "Brabant"];
  var actions = ["vient de r\u00E9server son analyse gratuite.", "planifie l'installation Gaele XL.", "v\u00E9rifie son \u00E9ligibilit\u00E9."];
  function show() {
    text.innerHTML = "<strong>" + names[Math.floor(Math.random()*names.length)] + "</strong> " + actions[Math.floor(Math.random()*actions.length)];
    popup.classList.remove('fomo-hidden');
    setTimeout(() => popup.classList.add('fomo-hidden'), 5000);
  }
  setInterval(show, 35000);
  setTimeout(show, 10000);
}

async function loadDynamicReviews() {
  const grid = document.querySelector('.testi-grid');
  if (!grid) return;
  try {
    const { data } = await _supabase.from('prospects').select('*').eq('admin_status', 'publie').order('created_at', { ascending: false });
    if (!data) return;
    data.forEach(p => {
      let rating = 5;
      if (p.nom && p.nom.includes('/5')) { const m = p.nom.match(/(\d)\/5/); if (m) rating = parseInt(m[1]); }
      const card = document.createElement('div');
      card.className = 'tcard';
      let stars = ''; for(let i=0; i<5; i++) stars += (i < rating) ? '★' : '☆';
      let clean = (p.message || '').includes('AVIS:') ? p.message.split('AVIS:')[1].trim() : p.message;
      card.innerHTML = `<div class="tcard-stars">${stars}</div><p class="tcard-text">"${clean}"</p><div class="tcard-author"><div class="tcard-avatar">${p.prenom.substring(0,2).toUpperCase()}</div><div><div class="tcard-name">${p.prenom}</div><div class="tcard-location">${p.code_postal}</div><span class="tcard-badge">Gaele XL</span></div></div>`;
      grid.prepend(card);
    });
  } catch (e) {}
}

// ── MAIN INIT ──
document.addEventListener('DOMContentLoaded', async function() {
  loadDynamicReviews();
  initFomo();
  
  const wall = document.getElementById('welcome-wall');
  if (wall && !localStorage.getItem('gaele_welcome_seen')) { 
    wall.classList.add('active'); 
    lockBody(); 
    
    let countdown = 5;
    const cdEl = document.getElementById('welcome-countdown');
    if (cdEl) cdEl.innerText = `Le site s'ouvre dans ${countdown}s...`;
    
    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        if (cdEl) cdEl.innerText = `Le site s'ouvre dans ${countdown}s...`;
      } else {
        clearInterval(interval);
        closeWelcomeWall();
      }
    }, 1000);
  }
  else if (wall) wall.style.display = 'none';

  var pan = document.getElementById('cal-panneaux'); if (pan) pan.addEventListener('change', forceLocataireLogic);
  var stat = document.getElementById('cal-statut'); var off = document.getElementById('cal-offre');
  if (stat && off) { stat.addEventListener('change', forceLocataireLogic); off.addEventListener('change', forceLocataireLogic); }

  var calCp = document.getElementById('cal-cp'); if (calCp) calCp.addEventListener('input', function() { updateCpFeedbackLogic(this.value, 'cal-cp-feedback'); });
  var qCp = document.getElementById('q-cp'); if (qCp) qCp.addEventListener('input', function() { updateCpFeedbackLogic(this.value, 'q-cp-feedback'); });
  var qS = document.getElementById('q-cp-search');
  if (qS) {
    qS.addEventListener('input', async function() {
      await updateCpFeedbackLogic(this.value, 'q-cp-search-feedback');
      var r = getRegionByCP(this.value);
      if (r) {
        document.querySelectorAll('#q1-grid .qcard').forEach(c => {
          var oc = c.getAttribute('onclick');
          if (oc && (oc.indexOf("'"+r+"'")!==-1 || oc.indexOf('"'+r+'"')!==-1)) selectQ(c, 'region', r);
        });
      }
    });
  }

  var blockedDates = [];
  try {
    await loadBlockedDates(); // Await the fetch
    var { data } = await _supabase.rpc('get_booked_dates');
    if (data) blockedDates = data.map(item => item.date_rdv);
    
    // Merge both sources (booked and admin blocked)
    blockedDatesCache.forEach(d => { if (blockedDates.indexOf(d) === -1) blockedDates.push(d); });
  } catch (e) {
    console.warn("Error mixing blocked dates:", e);
  }

  flatpickr("#cal-date", {
    static: true, monthSelectorType: 'static', dateFormat: "d/m/Y", minDate: "today", locale: "fr",
    disable: [d => d.getDay()===0],
    onChange: function(sd, ds) {
      var ts = document.getElementById("cal-time");
      if (!ds) { ts.disabled = true; return; }
      ts.innerHTML = '<option value="" disabled selected>Choisir une heure *</option>';
      ts.disabled = false;
      var iso = ds.split('/')[2]+'-'+ds.split('/')[1]+'-'+ds.split('/')[0];
      ["09:00", "12:00", "15:00", "18:00"].forEach(t => {
        var isB = blockedDates.indexOf(iso+" "+t)!==-1 || blockedDates.indexOf(ds+" "+t)!==-1;
        var opt = document.createElement("option"); opt.value = t; opt.textContent = t + (isB ? " (Indisponible)" : ""); opt.disabled = isB; ts.appendChild(opt);
      });
    }
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        var id = entry.target.getAttribute('id');
        if (id) document.querySelectorAll('.m-nav-item').forEach(i => { i.classList.toggle('active', i.getAttribute('href')==='#'+id); });
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.app-view').forEach(s => observer.observe(s));
});

function closeWelcomeWall() {
  const wall = document.getElementById('welcome-wall');
  if (wall) { wall.classList.remove('active'); openInfoModal(); setTimeout(() => wall.style.display='none', 800); localStorage.setItem('gaele_welcome_seen','true'); }
}
function openReviewModal(e) { if(e)e.preventDefault(); document.getElementById('review-modal').classList.add('open'); lockBody(); }
function closeReviewModal() { document.getElementById('review-modal').classList.remove('open'); unlockBody(); document.getElementById('review-form-inner').style.display='grid'; document.getElementById('review-success').style.display='none'; setRating(0); }
function setRating(n) { document.getElementById('rev-rating').value = n; document.querySelectorAll('#rating-stars .star').forEach((s,i) => { s.classList.toggle('star-filled', i<n); s.textContent = i<n ? '★' : '☆'; }); }

async function submitReview() {
  const name = document.getElementById('rev-name').value.trim();
  const loc = document.getElementById('rev-location').value.trim();
  const rat = parseInt(document.getElementById('rev-rating').value);
  const txt = document.getElementById('rev-text').value.trim();
  if(!name || !loc || rat===0 || !txt) { alert('Champs requis.'); return; }
  const btn = document.querySelector('#review-modal .cal-submit'); btn.disabled = true; btn.textContent='Envoi...';
  try {
    await _supabase.from('prospects').insert([{ prenom: name, nom: '(AVIS CLIENT '+rat+'/5)', email: 'avis@client.be', telephone: '0000', code_postal: loc, message: `NOTE: ${rat}/5\nAVIS: ${txt}`, statut: 'Propri\u00E9taire', offre_recommandee: 'Gaele XL' }]);
    const grid = document.querySelector('.testi-grid');
    if (grid) {
      const card = document.createElement('div'); card.className='tcard'; card.style.border='2px solid var(--gold)';
      let stars = ''; for(let i=0; i<5; i++) stars += (i<rat) ? '★' : '☆';
      card.innerHTML = `<div class="tcard-stars">${stars}</div><p class="tcard-text">"${txt}"</p><div class="tcard-author"><div class="tcard-avatar">${name.substring(0,2).toUpperCase()}</div><div><div class="testi-name">${name}</div><div class="testi-location">${loc}</div><span class="tcard-badge">Avis en mod\u00E9ration</span></div></div>`;
      grid.prepend(card); card.scrollIntoView({ behavior:'smooth', block:'center'});
    }
    document.getElementById('review-form-inner').style.display='none'; document.getElementById('review-success').style.display='block';
  } catch(e) { alert('Erreur.'); } finally { btn.disabled = false; btn.textContent='Confirmer'; }
}
function closeInfoModal() { document.getElementById('info-modal').classList.remove('open'); unlockBody(); }
function closeQuestionModal() { document.getElementById('question-modal').classList.remove('open'); unlockBody(); }
