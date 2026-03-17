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
  document.body.classList.add('modal-open');
  document.body.style.overflow='hidden'; 
}

function closeCal() { 
  document.getElementById('cal-modal').classList.remove('open'); 
  document.body.classList.remove('modal-open');
  document.body.style.overflow=''; 
}

// ── QUESTION MODAL ──
function openQuestionModal(e) {
  if (e) e.preventDefault();
  document.getElementById('question-modal').classList.add('open');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeQuestionModal() {
  document.getElementById('question-modal').classList.remove('open');
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
}

// ── INFO MODAL ──
function openInfoModal(e) {
  if (e) e.preventDefault();
  document.getElementById('info-modal').classList.add('open');
  document.body.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
}

function closeInfoModal() {
  document.getElementById('info-modal').classList.remove('open');
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
}

// Click outside logic for both
document.querySelectorAll('.modal-overlay').forEach(function(modal) {
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
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

  // On combine les nouvelles questions dans un champ "message" ou similaire si les colonnes manquent
  var notes = "Offre: " + ofr + "\n" +
              "Energies: " + eType + "\n" +
              "Installation Elec: " + enormes;

  var prospectData = {
    prenom: p,
    nom: n,
    email: e,
    telephone: t,
    code_postal: cp,
    date_rdv: combinedDate,
    region: qState.region || null,
    statut: st,
    offre_recommandee: ofr, // Correction du nom de la colonne
    message: notes // On met les détails ici pour éviter l'erreur de colonne manquante
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
  var allTimeSlots = ["09:00", "12:00", "15:00", "18:00"];

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
    document.body.style.overflow = 'hidden';
  } else if (wall) {
    wall.style.display = 'none';
  }
});

// ── REVIEW MODAL LOGIC ──
function openReviewModal(e) {
  if (e) e.preventDefault();
  document.getElementById('review-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('open');
  document.body.style.overflow = '';
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

