// ── SUPABASE INIT ──
var SUPABASE_URL = 'https://adebczvhvxajiyeeyerx.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZWJjenZodnhhaml5ZWV5ZXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzE2MDIsImV4cCI6MjA4NzQ0NzYwMn0._wGnpo7sHJeGYHLLdATgWxss8ySVnCZ0UQU5VB6nhhY';
var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── QUALIFICATION ──
var qState = {};

function selectQ(btn, key, val) {
  btn.parentElement.querySelectorAll('.qcard').forEach(function(b){ b.classList.remove('selected'); });
  btn.classList.add('selected');
  qState[key] = val;
  if (qState.region && qState.statut) { showQualResult(); }
}

function getOffreRecommandee() {
  var r = qState.region;
  var s = qState.statut;
  if (!r || !s) return null;
  if (r === 'bxl') {
    return 'Gaele Courtier';
  }
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
  
  // Règle 1 : Un locataire n'a jamais droit à Gaele XL
  if (statSelect && offreSelect && statSelect.value === 'Locataire') {
    offreSelect.value = 'Gaele Courtier';
  }
  
  // Règle 2 : À Bruxelles, personne n'a droit à Gaele XL
  if (qState.region === 'bxl' && offreSelect) {
    offreSelect.value = 'Gaele Courtier';
  }
}

function openCal(e) { 
  if(e) e.preventDefault(); 
  
  var statSelect = document.getElementById('cal-statut');
  var offreSelect = document.getElementById('cal-offre');
  if (statSelect && offreSelect) {
    if (qState.statut === 'proprio') statSelect.value = 'Propriétaire';
    else if (qState.statut === 'locataire') statSelect.value = 'Locataire';
    
    var recOffer = getOffreRecommandee();
    if (recOffer === 'Gaele XL') offreSelect.value = 'Gaele XL';
    else if (recOffer === 'Gaele Courtier') offreSelect.value = 'Gaele Courtier';

    forceLocataireLogic();
  }

  document.getElementById('cal-modal').classList.add('open'); 
  document.body.style.overflow='hidden'; 
}

function closeCal() { document.getElementById('cal-modal').classList.remove('open'); document.body.style.overflow=''; }

// ── QUESTION MODAL ──
function openQuestionModal(e) {
  if (e) e.preventDefault();
  document.getElementById('question-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeQuestionModal() {
  document.getElementById('question-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ── INFO MODAL ──
function openInfoModal(e) {
  if (e) e.preventDefault();
  document.getElementById('info-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeInfoModal() {
  document.getElementById('info-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// Click outside logic for both
document.querySelectorAll('.modal-overlay').forEach(function(modal) {
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
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

  if(!p || !e || !cp || !t || !d || !h || !st || !ofr || !eType || !enormes){ 
    alert('Veuillez remplir tous les champs obligatoires (*).'); return; 
  }

  // Combinaison de la date "d/m/Y" et de l'heure "H:i" pour correspondre exactement à l'ancien format Supabase
  var combinedDate = d + " " + h;

  var btn = document.querySelector('.cal-submit');
  btn.disabled = true; btn.textContent = 'Envoi...';

  var prospectData = {
    prenom: p,
    nom: n,
    email: e,
    telephone: t,
    code_postal: cp,
    date_rdv: combinedDate,
    region: qState.region || null,
    statut: st,
    offre_demandee: ofr,
    energies: eType,
    electricite_normes: enormes
  };

  try {
    // Insert prospect into Supabase
    var result = await _supabase.from('prospects').insert(prospectData);
    if (result.error) throw result.error;

    // Show success immediately
    document.getElementById('cal-form-inner').style.display='none';
    document.getElementById('cal-success').style.display='block';

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

// Initialisation Calendrier
document.addEventListener('DOMContentLoaded', async function() {
  // Lancer le FOMO
  initFomo();
  
  // Bind events pour le formulaire dynamique
  var statSelect = document.getElementById('cal-statut');
  var offreSelect = document.getElementById('cal-offre');
  if (statSelect && offreSelect) {
    statSelect.addEventListener('change', forceLocataireLogic);
    offreSelect.addEventListener('change', function() {
      if (qState.region === 'bxl' && this.value === 'Gaele XL') {
        alert("L'offre Gaele XL n'est pas disponible pour la r\u00E9gion de Bruxelles-Capitale. R\u00E9orientation vers Gaele Courtier.");
        this.value = 'Gaele Courtier';
        return; // Stoppe l'exécution ici
      }
      if (statSelect.value === 'Locataire' && this.value === 'Gaele XL') {
        alert("L'offre Gaele XL est strictement r\u00E9serv\u00E9e aux propri\u00E9taires. R\u00E9orientation vers Gaele Courtier.");
        this.value = 'Gaele Courtier';
      }
    });
  }

  var blockedDates = [];

  // Essayer de récupérer les dates de rendez-vous depuis Supabase
  try {
    var { data, error } = await _supabase
      .from('prospects')
      .select('date_rdv')
      .not('date_rdv', 'is', null);

    if (!error && data) {
      // Formater pour flatpickr (ex: "18/03/2026 10:30" => le même mais traité comme date javascript)
      blockedDates = data.map(function(item) {
        // Le format stocké est "d/m/Y H:i"
        return item.date_rdv;
      });
    }
  } catch (err) {
    console.warn("Impossible de lire les dates réservées. RLS bloque peut-être la lecture.", err);
  }

  // Générateur des crénaux horaires 09:00 -> 18:30 (Tranches de 30 min)
  var allTimeSlots = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30"];

  flatpickr("#cal-date", {
    enableTime: false, // On désactive le choix de l'heure intégré
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
      allTimeSlots.forEach(function(time) {
        var combined = dateStr + " " + time;
        var isBooked = blockedDates.includes(combined);
        
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
});
