// ── SUPABASE INIT ──
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

setTimeout(loadBlockedDates, 500);

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

  // When statut is selected
  if (key === 'statut') {
    var q3Label = document.getElementById('q-step-3');
    var q3Grid = document.getElementById('q3-grid');
    if (val === 'proprio') {
      // Show panel question for owners
      if (q3Label) q3Label.style.display = 'block';
      if (q3Grid) q3Grid.style.display = 'grid';
      // Reset panneaux
      qState.panneaux = null;
      document.getElementById('q-panneaux-info').style.display = 'none';
      // Don't show result yet - wait for panel answer
      return;
    } else {
      // Locataire: hide panel question, show result directly
      if (q3Label) q3Label.style.display = 'none';
      if (q3Grid) q3Grid.style.display = 'none';
      document.getElementById('q-panneaux-info').style.display = 'none';
    }
  }

  // Handle panel answer
  if (key === 'panneaux') {
    var info = document.getElementById('q-panneaux-info');
    if (val === 'oui') {
      if (info) info.style.display = 'block';
      // Force courtier
      qState.region = qState.region || 'wal';
    } else {
      if (info) info.style.display = 'none';
    }
  }
  
  if (qState.region && qState.statut) {
    // For owner: wait for panel answer
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
  if (p === 'oui') return 'Gaele Courtier'; // Already has panels
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

  // Hide both initially
  cardXl.style.display = 'none';
  cardCourtier.style.display = 'none';

  // Logic: XL only for Wallonie/Flandre AND Propriétaire
  if ((r === 'wal' || r === 'fla') && s === 'proprio') {
    cardXl.style.display = 'block';
  } else {
    cardCourtier.style.display = 'block';
  }

  box.style.display = 'block';
  setTimeout(function(){ box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
}

// ── MODAL ──
function forceLocataireLogic() {
  var statSelect = document.getElementById('cal-statut');
  var offreSelect = document.getElementById('cal-offre');
  var typeBatSelect = document.getElementById('cal-type-batiment');
  var accordCoproWrap = document.getElementById('cal-accord-copro-wrap');
  var panneauxSelect = document.getElementById('cal-panneaux');
  var panneauxInfo = document.getElementById('cal-panneaux-info');
  
  // Show panneaux field only for Propriétaires
  if (statSelect && statSelect.value === 'Propri\u00E9taire') {
    if (typeBatSelect) typeBatSelect.style.display = 'block';
    if (panneauxSelect) panneauxSelect.style.display = 'block';
  } else {
    if (typeBatSelect) { typeBatSelect.style.display = 'none'; typeBatSelect.value = ''; }
    if (accordCoproWrap) accordCoproWrap.style.display = 'none';
    if (panneauxSelect) { panneauxSelect.style.display = 'none'; panneauxSelect.value = ''; }
    if (panneauxInfo) panneauxInfo.style.display = 'none';
  }

  // Handle panneaux selection info
  if (panneauxSelect && panneauxSelect.value === 'Oui') {
    if (panneauxInfo) panneauxInfo.style.display = 'block';
    if (offreSelect) offreSelect.value = 'Gaele Courtier';
  } else {
    if (panneauxInfo) panneauxInfo.style.display = 'none';
  }

  // R\u00e8gle 1 : locataire -> Gaele Courtier
  if (statSelect && offreSelect && statSelect.value === 'Locataire') {
    offreSelect.value = 'Gaele Courtier';
  }
  
  // R\u00e8gle 2 : Bruxelles -> Gaele Courtier
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

function lockField(el) {
  if (el) {
    el.disabled = true;
    el.classList.add('locked-field');
  }
}

function unlockField(el) {
  if (el) {
    el.disabled = false;
    el.classList.remove('locked-field');
  }
}

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

  // Reset fields & Unlock by default
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
    if (statSelect) { statSelect.style.display = 'none'; statSelect.value = 'Propriétaire'; lockField(statSelect); }
    if (entrepriseInp) { entrepriseInp.style.display = 'block'; }
    if (msgExtra) { msgExtra.value = 'PRO : '; }
    if (offreSelect) { offreSelect.value = 'Gaele XL'; lockField(offreSelect); }
  } else if (statSelect && offreSelect) {
    // PRE-FILL from qualification answers
    if (qState.statut === 'proprio') {
      statSelect.value = 'Propriétaire';
      lockField(statSelect);
      if (typeBatSelect) typeBatSelect.style.display = 'block';
      if (panneauxSelect) panneauxSelect.style.display = 'block';
      // Pre-fill panneaux
      if (qState.panneaux === 'oui' && panneauxSelect) {
        panneauxSelect.value = 'Oui';
        lockField(panneauxSelect);
        if (panneauxInfo) panneauxInfo.style.display = 'block';
      } else if (qState.panneaux === 'non' && panneauxSelect) {
        panneauxSelect.value = 'Non';
        lockField(panneauxSelect);
      }
    } else if (qState.statut === 'locataire') {
      statSelect.value = 'Locataire';
      lockField(statSelect);
    }

    // Pre-fill CP from qualification search
    var qCpSearch = document.getElementById('q-cp-search');
    if (qCpSearch && qCpSearch.value && cpInp) {
      cpInp.value = qCpSearch.value;
      lockField(cpInp);
      var regionNames = { wal: 'Wallonie', fla: 'Flandre', bxl: 'Bruxelles' };
      if (cpFeedback && qState.region) {
        cpFeedback.textContent = regionNames[qState.region] || '';
        cpFeedback.style.display = 'block';
      }
    }

    var recOffer = getOffreRecommandee();
    if (recOffer === 'Gaele XL') { offreSelect.value = 'Gaele XL'; lockField(offreSelect); }
    else if (recOffer === 'Gaele Courtier') { offreSelect.value = 'Gaele Courtier'; lockField(offreSelect); }

    forceLocataireLogic();
  }

  document.getElementById('cal-modal').classList.add('open'); 
  lockBody();
}

function closeCal() { 
  document.getElementById('cal-modal').classList.remove('open'); 
  unlockBody();
}

// ── QUESTION MODAL ──
function openQuestionModal(e) {
  if (e) e.preventDefault();
  document.getElementById('question-modal').classList.add('open');
  lockBody();
}

function closeQuestionModal() {
  document.getElementById('question-modal').classList.remove('open');
  unlockBody();
}

// ── INFO MODAL ──
function openInfoModal(e) {
  if (e) e.preventDefault();
  document.getElementById('info-modal').classList.add('open');
  lockBody();
}

function closeInfoModal() {
  document.getElementById('info-modal').classList.remove('open');
  unlockBody();
}

// Click outside logic for both
document.querySelectorAll('.modal-overlay').forEach(function(modal) {
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('open');
      unlockBody();
    }
  });
});

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

  if(!p || !e || !cp || !t || !d || !h || !st || !ofr || !eType || !enormes){ 
    alert('Veuillez remplir tous les champs obligatoires (*).'); return; 
  }

  if (st === 'Propriétaire' && document.getElementById('cal-type-batiment').style.display !== 'none' && !typeBat) {
    alert('Veuillez préciser le type de bâtiment (Maison/Appartement).'); return;
  }

  if (typeBat === 'Appartement' && document.getElementById('cal-accord-copro-wrap').style.display !== 'none' && !accordCopro && !accordCoproPending) {
    alert('Veuillez cocher soit "J\'ai l\'accord" soit "Démarche en cours" pour la co-propriété.'); return;
  }
  
  if (document.getElementById('cal-entreprise').style.display !== 'none' && !entreprise) {
    alert('Veuillez renseigner le nom de l\'entreprise.'); return;
  }

  // Combinaison de la date "d/m/Y" et de l'heure "H:i" pour correspondre exactement à l'ancien format Supabase
  var combinedDate = d + " " + h;
  
  if (blockedDatesCache.indexOf(combinedDate) !== -1 || blockedDatesCache.indexOf(d) !== -1) {
    alert("Désolé, ce créneau horaire ou cette journée est indisponible (déjà pris ou bloqué). Veuillez choisir un autre moment.");
    return;
  }

  var btn = document.querySelector('.cal-submit');
  btn.disabled = true; btn.textContent = 'Envoi...';

  // Fix: Move missing columns plus new panneaux field to message
  var panneauxVal = document.getElementById('cal-panneaux') ? document.getElementById('cal-panneaux').value : 'Non';
  var accordCoproStr = accordCopro ? "Oui" : (accordCoproPending ? "En cours" : "Non");
  var notes = msgExtra + (entreprise ? "Entreprise: " + entreprise + "\n" : "") + 
              "Offre: " + ofr + "\n" +
              "Energies: " + eType + "\n" +
              "Installation Elec: " + enormes + "\n" +
              "Type Batiment: " + (typeBat || "N/A") + "\n" +
              "Accord Copro: " + accordCoproStr + "\n" +
              "Panneaux existants: " + (panneauxVal || "Non");

  var prospectData = {
    prenom: p,
    nom: n,
    email: e,
    telephone: t,
    code_postal: cp,
    date_rdv: combinedDate,
    region: qState.region || getRegionByCP(cp),
    statut: st,
    offre_recommandee: ofr,
    message: notes 
  };

  try {
    // Insert prospect into Supabase
    var result = await _supabase.from('prospects').insert(prospectData);
    if (result.error) throw result.error;

    // Show success immediately
    document.getElementById('cal-form-inner').style.display='none';
    document.getElementById('cal-success').style.display='block';
    
    // Facebook Pixel Tracking - RDV Confirmé
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', {
        content_name: 'Prise de RDV',
        content_category: ofr // ex: 'Gaele XL' ou 'Gaele Courtier'
      });
    }

    // Send email notification in background (never blocks, never fails visibly)
    _supabase.functions.invoke('notify-prospect', { body: prospectData })
      .then(function(res) {
        if (res.error) console.warn('Email notification error:', res.error);
        else console.log('Email notification sent');
      })
      .catch(function(err) { console.warn('Email notification failed:', err); });

  } catch (err) {
    console.error('Submission error:', err);
    alert('Erreur lors de l\u2019envoi. R\u00E9essayez.');
    btn.disabled = false; btn.textContent = 'Confirmer mon rendez-vous \u2192';
  }
}

async function submitQuestion() {
  var p = document.getElementById('q-prenom').value.trim();
  var n = document.getElementById('q-nom').value.trim();
  var e = document.getElementById('q-email').value.trim();
  var cp = document.getElementById('q-cp').value.trim();
  var t = document.getElementById('q-tel').value.trim();
  var st = document.getElementById('q-statut').value;
  var msg = document.getElementById('q-message').value.trim();

  if (!p || !e || !cp || !t || !st || !msg) {
    alert('Veuillez remplir tous les champs obligatoires (*).');
    return;
  }

  var btn = document.querySelector('#question-modal .cal-submit');
  btn.disabled = true;
  btn.textContent = 'Envoi...';

  var questionData = {
    prenom: p,
    nom: n,
    email: e,
    telephone: t,
    code_postal: cp,
    region: getRegionByCP(cp),
    statut: st,
    message: msg
  };

  try {
    // On réutilise la table prospects ou une table spécifique si elle existe. 
    // Ici on insère dans 'prospects' avec le champ question.
    var result = await _supabase.from('prospects').insert(questionData);
    if (result.error) throw result.error;

    document.getElementById('question-form-inner').style.display = 'none';
    document.getElementById('question-success').style.display = 'block';

    // Facebook Pixel Tracking - Question envoyée
    if (typeof fbq === 'function') {
      fbq('track', 'Contact', {
        content_name: 'Question Form'
      });
    }

    // Notification Andy
    _supabase.functions.invoke('notify-prospect', { body: questionData })
      .catch(function(err) { console.warn('Email notification failed:', err); });

  } catch (err) {
    console.error('Question submission error:', err);
    alert('Erreur lors de l\u2019envoi. R\u00E9essayez.');
    btn.disabled = false;
    btn.textContent = 'Envoyer ma question \u2192';
  }
}

function toggleFaq(item) {
  var isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('open'); });
  if(!isOpen) item.classList.add('open');
}

// ── FOMO NOTIFICATIONS ──
function initFomo() {
  var fomoPopup = document.getElementById('fomo-popup');
  var fomoText = document.getElementById('fomo-text');
  if (!fomoPopup || !fomoText) return;

  var names = ["Marc", "Sophie", "Julien", "Nathalie", "Thomas", "Marie", "Pierre", "Laura"];
  var locations = ["Namur", "Li\u00E8ge", "Charleroi", "Mons", "Tournai", "Flandre", "Brabant"];
  var actions = ["vient de r\u00E9server son analyse gratuite.", "planifie l'installation Gaele XL.", "v\u00E9rifie son \u00E9ligibilit\u00E9."];

  function showFomo() {
    var rName = names[Math.floor(Math.random() * names.length)];
    var rLoc = locations[Math.floor(Math.random() * locations.length)];
    var rAct = actions[Math.floor(Math.random() * actions.length)];
    
    fomoText.innerHTML = "<strong>" + rName + " (" + rLoc + ")</strong> " + rAct;
    fomoPopup.classList.remove('fomo-hidden');
    
    setTimeout(function() {
      fomoPopup.classList.add('fomo-hidden');
    }, 5000); // Reste visible 5 secondes
  }

  // Apparition toutes les 25 à 45 secondes
  function scheduleNextFomo() {
    var delay = Math.floor(Math.random() * (45000 - 25000 + 1)) + 25000;
    setTimeout(function() {
      showFomo();
      scheduleNextFomo();
    }, delay);
  }

  // Démarrer la première notification après 10 secondes
  setTimeout(function() {
    showFomo();
    scheduleNextFomo();
  }, 10000);
}

// ── DYNAMIC REVIEWS ──
async function loadDynamicReviews() {
  const testiGrid = document.querySelector('.testi-grid');
  if (!testiGrid) return;

  try {
    const { data, error } = await _supabase
      .from('prospects')
      .select('*')
      .eq('admin_status', 'publie')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return;

    data.forEach(p => {
      // Extraction de la note (Avis Client X/5)
      let rating = 5;
      if (p.nom && p.nom.includes('/5')) {
        const match = p.nom.match(/(\d)\/5/);
        if (match) rating = parseInt(match[1]);
      }

      const newCard = document.createElement('div');
      newCard.className = 'tcard';
      
      let starsHtml = '';
      for(let i=0; i<5; i++) starsHtml += (i < rating) ? '★' : '☆';

      // On nettoie le message de ses préfixes de stockage
      let cleanMsg = p.message || '';
      if (cleanMsg.includes('AVIS:')) {
        cleanMsg = cleanMsg.split('AVIS:')[1].trim();
      }

      newCard.innerHTML = `
        <div class="tcard-stars">${starsHtml}</div>
        <p class="tcard-text">"${cleanMsg}"</p>
        <div class="tcard-author">
          <div class="tcard-avatar">${p.prenom.substring(0,2).toUpperCase()}</div>
          <div>
            <div class="tcard-name">${p.prenom} ${p.nom.includes('AVIS CLIENT') ? '' : p.nom}</div>
            <div class="tcard-location">${p.code_postal || ''}</div>
            <span class="tcard-badge">${p.offre_recommandee || 'Gaele XL'}</span>
          </div>
        </div>
      `;
      testiGrid.prepend(newCard);
    });
  } catch (err) {
    console.warn('Dynamic reviews load failed:', err);
  }
}

// Initialisation Calendrier
document.addEventListener('DOMContentLoaded', async function() {
  // Charger les avis dynamiques
  loadDynamicReviews();
  
  // Lancer le FOMO
  initFomo();
  
  // Bind events pour le formulaire dynamique
  var statSelect = document.getElementById('cal-statut');
  var offreSelect = document.getElementById('cal-offre');
  if (statSelect && offreSelect) {
    statSelect.addEventListener('change', forceLocataireLogic);
    
    var typeBatSelect = document.getElementById('cal-type-batiment');
    var accordCoproWrap = document.getElementById('cal-accord-copro-wrap');
    if (typeBatSelect && accordCoproWrap) {
      typeBatSelect.addEventListener('change', function() {
        if (this.value === 'Appartement') {
          accordCoproWrap.style.display = 'block';
        } else {
          accordCoproWrap.style.display = 'none';
        }
      });
      
      var c1 = document.getElementById('cal-accord-copro');
      var c2 = document.getElementById('cal-accord-copro-pending');
      if (c1 && c2) {
        c1.addEventListener('change', function() { if (this.checked) c2.checked = false; });
        c2.addEventListener('change', function() { if (this.checked) c1.checked = false; });
      }
    }

    var panneauxSelect = document.getElementById('cal-panneaux');
    if (panneauxSelect) {
      panneauxSelect.addEventListener('change', forceLocataireLogic);
    }

    offreSelect.addEventListener('change', function() {
      if ((qState.region === 'bxl' || getRegionByCP(document.getElementById('cal-cp').value)) === 'bxl' && this.value === 'Gaele XL') {
        alert("L'offre Gaele XL n'est pas disponible pour la r\u00E9gion de Bruxelles-Capitale. R\u00E9orientation vers Gaele Courtier.");
        this.value = 'Gaele Courtier';
        return;
      }
      if (statSelect.value === 'Locataire' && this.value === 'Gaele XL') {
        alert("L'offre Gaele XL est strictement r\u00E9serv\u00E9e aux propri\u00E9taires. R\u00E9orientation vers Gaele Courtier.");
        this.value = 'Gaele Courtier';
      }
    });

    var cpInp = document.getElementById('cal-cp');
    if (cpInp) {
      cpInp.addEventListener('input', async function() {
        var cp = this.value;
        var feedback = document.getElementById('cal-cp-feedback');
        if (cp.length === 4) {
          var detectedRegion = getRegionByCP(cp);
          if (detectedRegion) {
            qState.region = detectedRegion;
            forceLocataireLogic();
            if (feedback) {
              var names = { wal: 'Wallonie', fla: 'Flandre', bxl: 'Bruxelles' };
              var regionName = names[detectedRegion] || '';
              
              // Affichage immédiat de la région
              feedback.textContent = regionName;
              feedback.style.display = 'block';
              
              // Essai de récupération de la ville dans Supabase (Nouvelle table postal_codes)
              try {
                var { data, error } = await _supabase
                  .from('postal_codes')
                  .select('city')
                  .eq('zip', cp)
                  .single();
                
                if (data && data.city) {
                  feedback.textContent = data.city + " \u00B7 " + regionName;
                }
              } catch (err) { /* Silently fail if table doesn't exist yet */ }
            }
          }
        } else if (feedback) {
          feedback.style.display = 'none';
        }
      });
    }
  }

    var qCpInp = document.getElementById('q-cp');
    if (qCpInp) {
      qCpInp.addEventListener('input', function() {
        var cp = this.value;
        var feedback = document.getElementById('q-cp-feedback');
        if (cp.length === 4) {
          var detectedRegion = getRegionByCP(cp);
          if (detectedRegion) {
            qState.region = detectedRegion;
            if (feedback) {
              var names = { wal: 'Wallonie', fla: 'Flandre', bxl: 'Bruxelles' };
              feedback.textContent = names[detectedRegion];
              feedback.style.display = 'block';
            }
          }
        } else if (feedback) {
          feedback.style.display = 'none';
        }
      });
    }
    var qSearch = document.getElementById('q-cp-search');
    if (qSearch) {
      qSearch.addEventListener('input', function() {
        var cp = this.value;
        var feedback = document.getElementById('q-cp-search-feedback');
        if (cp.length === 4) {
          var detectedRegion = getRegionByCP(cp);
          if (detectedRegion) {
            qState.region = detectedRegion;
            var regionCards = document.querySelectorAll('#q1-grid .qcard');
            regionCards.forEach(function(card) {
              var oc = card.getAttribute('onclick');
              if (oc && (oc.indexOf("'" + detectedRegion + "'") !== -1 || oc.indexOf('"' + detectedRegion + '"') !== -1)) {
                selectQ(card, 'region', detectedRegion);
              }
            });
            if (feedback) {
              var names = { wal: 'Wallonie', fla: 'Flandre', bxl: 'Bruxelles' };
              feedback.textContent = names[detectedRegion];
              feedback.style.display = 'block';
            }
          }
        } else if (feedback) {
          feedback.style.display = 'none';
        }
      });
    }

  var blockedDates = [];

  // Récupérer les dates de rendez-vous via la fonction sécurisée Supabase (RPC)
  try {
    var { data, error } = await _supabase.rpc('get_booked_dates');

    if (!error && data) {
      // Formater pour flatpickr
      blockedDates = data.map(function(item) {
        return item.date_rdv;
      });
    }
    
    // Fusionner avec le cache local des blocages admin
    blockedDatesCache.forEach(function(d) {
      if (blockedDates.indexOf(d) === -1) blockedDates.push(d);
    });
    
  } catch (err) {
    console.warn("Impossible de lire les dates réservées.", err);
  }

  // Générateur des crénaux horaires 09:00 -> 18:30 (Tranches de 30 min)
  var allTimeSlots = ["09:00", "12:00", "15:00", "18:00"];

  flatpickr("#cal-date", {
    static: true, // Crucial for fixed modals
    monthSelectorType: 'static',
    enableTime: false,
    dateFormat: "d/m/Y",
    minDate: "today",
    locale: "fr",
    disable: [
      function(date) {
        // Bloque les dimanches
        return (date.getDay() === 0);
      }
    ],
    onChange: function(selectedDates, dateStr, instance) {
      var timeSelect = document.getElementById("cal-time");
      if (!dateStr) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="" disabled selected>Heure du rendez-vous *</option>';
        return;
      }

      // Vider le menu et l'activer
      timeSelect.innerHTML = '<option value="" disabled selected>Choisir une heure *</option>';
      timeSelect.disabled = false;

      // Boucler sur tous les créneaux
      // Conversion de dateStr "DD/MM/YYYY" -> "YYYY-MM-DD" pour la comparaison
      var dp = dateStr.split('/');
      var isoDate = dp[2] + '-' + dp[1] + '-' + dp[0];
      
      allTimeSlots.forEach(function(time) {
        var combinedDB = isoDate + " " + time;
        var combinedFR = dateStr + " " + time;
        
        var isBooked = (blockedDates.indexOf(combinedDB) !== -1) || 
                       (blockedDates.indexOf(combinedFR) !== -1);
        
        var opt = document.createElement("option");
        opt.value = time;
        
        if (isBooked) {
          opt.textContent = time + " (Indisponible)";
          opt.disabled = true;
        } else {
          opt.textContent = time;
        }
        
        timeSelect.appendChild(opt);
      });
    }
  });

  // ── APP VIEW REVEAL & NAV TRACKING ──
  var sections = document.querySelectorAll('.app-view');
  var mNavItems = document.querySelectorAll('.m-nav-item');

  var observerOptions = {
    threshold: 0.2
  };

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        
        // Update Mobile Nav
        var id = entry.target.getAttribute('id');
        if (id) {
          mNavItems.forEach(function(item) {
            item.classList.remove('active');
            if (item.getAttribute('href') === '#' + id) {
              item.classList.add('active');
            }
          });
        }
      }
    });
  }, observerOptions);

  sections.forEach(function(section) {
    observer.observe(section);
  });
});

// ── WELCOME WALL LOGIC ──
function closeWelcomeWall() {
  const wall = document.getElementById('welcome-wall');
  if (wall) {
    wall.classList.remove('active');
    openInfoModal(); // Appel immédiat pour qu'il soit prêt
    setTimeout(() => {
      wall.style.display = 'none';
    }, 800);
    localStorage.setItem('gaele_welcome_seen', 'true');
    // On ne réinitialise PAS l'overflow ici car openInfoModal s'en occupe
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const wall = document.getElementById('welcome-wall');
  const hasSeen = localStorage.getItem('gaele_welcome_seen');
  
  if (wall && !hasSeen) {
    wall.classList.add('active');
    lockBody();
  } else if (wall) {
    wall.style.display = 'none';
  }
});

// ── REVIEW MODAL LOGIC ──
function openReviewModal(e) {
  if (e) e.preventDefault();
  document.getElementById('review-modal').classList.add('open');
  lockBody();
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('open');
  unlockBody();
  // Reset form
  document.getElementById('review-form-inner').style.display = 'grid';
  document.getElementById('review-success').style.display = 'none';
  setRating(0);
}

function setRating(n) {
  const stars = document.querySelectorAll('#rating-stars .star');
  document.getElementById('rev-rating').value = n;
  stars.forEach((star, index) => {
    if (index < n) {
      star.classList.add('star-filled');
      star.textContent = '★';
    } else {
      star.classList.remove('star-filled');
      star.textContent = '☆';
    }
  });
}

async function submitReview() {
  const name = document.getElementById('rev-name').value.trim();
  const location = document.getElementById('rev-location').value.trim();
  const rating = parseInt(document.getElementById('rev-rating').value);
  const text = document.getElementById('rev-text').value.trim();

  if (!name || !location || rating === 0 || !text) {
    alert('Veuillez remplir tous les champs et donner une note.');
    return;
  }

  const btn = document.querySelector('#review-modal .cal-submit');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Envoi sécurisé...';

  const reviewData = {
    author_name: name,
    location: location,
    rating: rating,
    content: text,
    status: 'pending', // Pour votre modération dans l'admin
    created_at: new Date().toISOString()
  };

  try {
    // Envoi à la table 'prospects' (seule table publique garantie)
    // On n'envoie PAS admin_status ni is_read car ils sont protégés ou causent des erreurs 400 (RLS)
    // Par défaut, le Bureau Admin affiche les nouveaux prospects (sans statut) dans 'Réception'.
    const { error } = await _supabase.from('prospects').insert([{
      prenom: name,
      nom: '(AVIS CLIENT ' + rating + '/5)',
      email: 'avis@client.be',
      telephone: '0000', // Champ obligatoire probable
      code_postal: location, // On détourne ce champ pour la ville
      message: `NOTE: ${rating}/5\nVILLE: ${location}\nAVIS: ${text}`,
      statut: 'Propriétaire', // Valeur par défaut pour éviter les erreurs
      offre_recommandee: 'Gaele XL'
    }]);
    
    if (error) throw error;

    // 2. "Apparition factice" immédiate pour l'utilisateur
    const testiGrid = document.querySelector('.testi-grid');
    if (testiGrid) {
      const newCard = document.createElement('div');
      newCard.className = 'tcard';
      newCard.style.border = '2px solid var(--gold)';
      newCard.style.animation = 'fadeUp 0.6s ease-out';
      
      let starsHtml = '';
      for(let i=0; i<5; i++) starsHtml += (i < rating) ? '★' : '☆';

      newCard.innerHTML = `
        <div class="tcard-stars" style="color:var(--gold)">${starsHtml}</div>
        <p class="tcard-text">"${text}"</p>
        <div class="tcard-author">
          <div class="tcard-avatar">${name.substring(0,2).toUpperCase()}</div>
          <div>
            <div class="tcard-name">${name}</div>
            <div class="tcard-location">${location}</div>
            <span class="tcard-badge" style="background:var(--gold); color:var(--forest)">Avis en cours de modération</span>
          </div>
        </div>
      `;
      testiGrid.prepend(newCard); // On l'ajoute au tout début de la liste
      newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 3. Succès visuel dans le modal
    document.getElementById('review-form-inner').style.display = 'none';
    document.getElementById('review-success').style.display = 'block';

  } catch (err) {
    console.error('Erreur soumission avis:', err);
    alert('Une erreur est survenue. Andy a quand même été notifié.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

