// ══════════════════════════════════════════════════════
//  GAELE PRO — MODULE CARTE INTERACTIVE AVANCÉE v2.0
// ══════════════════════════════════════════════════════

const MapModule = (() => {

  // ── État interne ────────────────────────────────────
  let map         = null;
  let clusterGroup = null;
  let heatLayer   = null;
  let gpsMarker   = null;
  let gpsCircle   = null;
  let gpsWatch    = null;
  let activeFilters = new Set(['signe', 'rdv', 'rappel', 'non', 'absent', 'b2b']);
  let mapMode     = 'standard'; // 'standard' | 'satellite' | 'dark'
  let showHeat    = false;
  let allMarkers  = new Map(); // id -> marker

  // ── Tile layers ──────────────────────────────────────
  const TILES = {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attr: '© Esri World Imagery'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attr: '© <a href="https://carto.com">CARTO</a>'
    }
  };

  let currentTile = null;

  // ── Couleurs statuts ─────────────────────────────────
  const COLORS = {
    signe:  { fill: '#27ae60', glow: 'rgba(39,174,96,0.4)',   label: 'Signé'  },
    rdv:    { fill: '#C9A84C', glow: 'rgba(201,168,76,0.4)',  label: 'RDV'    },
    rappel: { fill: '#2980B9', glow: 'rgba(41,128,185,0.4)',  label: 'Rappel' },
    non:    { fill: '#e74c3c', glow: 'rgba(231,76,60,0.4)',   label: 'Non'    },
    absent: { fill: '#95a5a6', glow: 'rgba(149,165,166,0.4)', label: 'Absent' }
  };

  // ── Initialisation ───────────────────────────────────
  function init() {
    const container = document.getElementById('map-container');
    if (!window.L) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:#8aab8e;font-size:0.9rem">⚠️ Leaflet non chargé (connexion requise)</div>';
      return;
    }

    if (map) {
      // Déjà initialisé — refresh uniquement
      map.invalidateSize();
      refreshMarkers();
      return;
    }

    // Créer la carte
    map = L.map('map-container', {
      zoomControl: false,
      center: [50.4, 4.7],
      zoom: 9,
      preferCanvas: true
    });

    // Ajouter contrôle zoom personnalisé
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Tile par défaut
    setTileLayer('dark');

    // Plugin cluster (si disponible)
    if (window.L.markerClusterGroup) {
      clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: createClusterIcon
      });
      map.addLayer(clusterGroup);
    }

    // Exposer référence dans l'état global
    if (window.state) window.state.mapInstance = map;

    // Charger les markers
    refreshMarkers();

    // Overlay stats
    renderMapOverlay();

    // Mise à jour de l'overlay quand on bouge la carte
    map.on('moveend zoomend', updateZoomInfo);

    return map;
  }

  function setTileLayer(mode) {
    if (currentTile) map.removeLayer(currentTile);
    mapMode = mode;
    const t = TILES[mode] || TILES.dark;
    currentTile = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(map);

    // Mettre à jour les boutons de style
    document.querySelectorAll('.map-style-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  // ── Icône cluster ────────────────────────────────────
  function createClusterIcon(cluster) {
    const count = cluster.getChildCount();
    const children = cluster.getAllChildMarkers();
    // Couleur dominante dans le cluster
    const stats = { signe: 0, rdv: 0, rappel: 0, non: 0, absent: 0 };
    children.forEach(m => { if (m.options.statut) stats[m.options.statut]++; });
    const dominant = Object.entries(stats).sort((a,b) => b[1]-a[1])[0][0];
    const col = (COLORS[dominant] || COLORS.non).fill;
    const size = count < 10 ? 34 : count < 50 ? 40 : 48;

    return L.divIcon({
      html: `<div class="cluster-icon" style="--c:${col};width:${size}px;height:${size}px">
               <span>${count}</span>
             </div>`,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  }

  // ── Markers ──────────────────────────────────────────
  function refreshMarkers() {
    if (!map) return;

    // Vider
    if (clusterGroup) clusterGroup.clearLayers();
    else map.eachLayer(l => { if (l instanceof L.Marker && l !== gpsMarker) map.removeLayer(l); });
    allMarkers.clear();

    const prospects = window.state ? window.state.prospects : [];
    const cache     = window.state ? window.state.geocodeCache : {};
    const b2bCache  = window.state ? window.state.b2bGeocache : {};
    const b2bLeads  = window.state ? window.state.b2bLeads : [];

    let placed = 0;
    const toGeocode = [];

    // 1. Prospect B2C
    prospects.forEach(p => {
      if (!activeFilters.has(p.statut)) return;
      if (cache[p.id]) {
        addMarker(p, cache[p.id]);
        placed++;
      } else {
        toGeocode.push(p);
      }
    });

    // 2. Leads B2B
    if (activeFilters.has('b2b')) {
      b2bLeads.forEach(e => {
        if (b2bCache[e.num]) {
          addB2BMarker(e, b2bCache[e.num]);
          placed++;
        } else {
          // On limite le géocodage auto à un certain nombre pour ne pas saturer
          if (toGeocode.length < 50) toGeocode.push({ ...e, isB2B: true });
        }
      });
    }

    updateMapStatus(placed, toGeocode.length);

    if (toGeocode.length > 0 && window.state && !window.state.geocodingActive) {
      geocodeQueue(toGeocode);
    }

    // Heatmap
    if (showHeat) renderHeatmap();
  }

  function addB2BMarker(e, coords) {
    if (!map || !coords) return;
    const col = { fill: '#3498db', glow: 'rgba(52,152,219,0.3)', label: 'B2B' };
    const icon = L.divIcon({
      html: `<div class="gp-marker" style="--fill:${col.fill};--glow:${col.glow}">
               <div class="gp-marker-dot" style="border-radius:2px;width:10px;height:10px;margin-top:7px;margin-left:7px"></div>
             </div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([coords.lat, coords.lon], { icon, statut: 'b2b' });
    marker.bindPopup(buildB2BPopup(e, col), { maxWidth: 260, className: 'gp-popup' });

    if (clusterGroup) clusterGroup.addLayer(marker);
    else marker.addTo(map);

    allMarkers.set('b2b_' + e.num, marker);
    return marker;
  }

  function buildB2BPopup(e, col) {
    return `
      <div class="gp-popup-inner">
        <div class="gp-popup-header" style="--col:${col.fill}">
          <div class="gp-popup-name">${escHtml(e.nom)}</div>
          <span class="gp-popup-badge" style="background:${col.fill}20;color:${col.fill}">${e.nace_code || 'B2B'}</span>
        </div>
        <div class="gp-popup-body">
          <div class="gp-popup-row"><span>🏢</span><span style="font-weight:700">${escHtml(e.nace)}</span></div>
          <div class="gp-popup-row"><span>📍</span><span>${escHtml(e.rue || '')}, ${escHtml(e.commune)}</span></div>
          ${e.forme ? `<div class="gp-popup-row"><span>⚖️</span><span>${escHtml(e.forme)}</span></div>` : ''}
          <div class="gp-popup-row"><span>📄</span><span style="font-size:0.65rem">BCE: ${escHtml(e.num)}</span></div>
        </div>
        <div class="gp-popup-actions">
          ${e.tel ? `<a href="tel:${escHtml(e.tel)}" class="gp-popup-btn gp-popup-btn-call">📞 Appeler</a>` : ''}
          <button class="gp-popup-btn gp-popup-btn-crm" onclick="convertB2BToProspectFromMap('${e.num}')">➕ CRM</button>
        </div>
      </div>`;
  }

  function addMarker(p, coords) {
    if (!map || !coords) return;
    const col = COLORS[p.statut] || { fill: '#8aab8e', glow: 'transparent', label: '?' };

    const icon = L.divIcon({
      html: `<div class="gp-marker" style="--fill:${col.fill};--glow:${col.glow}">
               <div class="gp-marker-dot"></div>
             </div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([coords.lat, coords.lon], { icon, statut: p.statut });
    marker.bindPopup(buildPopup(p, col), {
      maxWidth: 260,
      className: 'gp-popup'
    });

    if (clusterGroup) clusterGroup.addLayer(marker);
    else marker.addTo(map);

    allMarkers.set(p.id, marker);
    return marker;
  }

  function buildPopup(p, col) {
    const q3l = { oui: '⭐ Intéressé', peut: '🤔 Peut-être', non: '❌ Non', '?': '' };
    const rappelHtml = p.rappel
      ? `<div class="gp-popup-row"><span>⏰</span><span style="color:#5dade2">${new Date(p.rappel).toLocaleString('fr-BE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div>`
      : '';

    return `
      <div class="gp-popup-inner">
        <div class="gp-popup-header" style="--col:${col.fill}">
          <div class="gp-popup-name">${escHtml(p.nom)}</div>
          <span class="gp-popup-badge" style="background:${col.fill}20;color:${col.fill}">${col.label}</span>
        </div>
        <div class="gp-popup-body">
          <div class="gp-popup-row"><span>📍</span><span>${escHtml(p.adresse)}</span></div>
          ${p.q3 && p.q3 !== '?' ? `<div class="gp-popup-row"><span>💬</span><span>${q3l[p.q3] || ''}</span></div>` : ''}
          ${rappelHtml}
          <div class="gp-popup-row"><span>📅</span><span>${p.date} ${p.heure}</span></div>
          ${p.notes ? `<div class="gp-popup-notes">${escHtml(p.notes)}</div>` : ''}
        </div>
        <div class="gp-popup-actions">
          ${p.tel ? `<a href="tel:${escHtml(p.tel)}" class="gp-popup-btn gp-popup-btn-call">📞 Appeler</a>` : ''}
          <button class="gp-popup-btn gp-popup-btn-crm" onclick="showProspect(${p.id})">📋 Détail</button>
        </div>
      </div>`;
  }

  // ── Géocodage ────────────────────────────────────────
  async function geocodeQueue(prospects) {
    if (!window.state) return;
    window.state.geocodingActive = true;
    const statusEl = document.getElementById('map-geocode-progress');
    if (statusEl) statusEl.style.display = 'flex';

    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i];
      const isB2B = p.isB2B;
      if (statusEl) {
        statusEl.querySelector('.gp-geocode-text').textContent =
          `${isB2B?'🏢 ':'📍 '}${i+1}/${prospects.length}`;
        statusEl.querySelector('.gp-geocode-bar').style.width =
          Math.round(((i+1)/prospects.length)*100) + '%';
      }
      try {
        const addr = isB2B ? `${p.rue}, ${p.commune} ${p.cp}` : p.adresse;
        const q    = encodeURIComponent(addr + ', Belgique');
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=be`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        if (data && data[0]) {
          const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
          if (isB2B) {
            window.state.b2bGeocache[p.num] = coords;
            localStorage.setItem('gaele_b2b_geocache', JSON.stringify(window.state.b2bGeocache));
            if (activeFilters.has('b2b')) addB2BMarker(p, coords);
          } else {
            window.state.geocodeCache[p.id] = coords;
            localStorage.setItem('gaele_geocache', JSON.stringify(window.state.geocodeCache));
            if (activeFilters.has(p.statut)) addMarker(p, coords);
          }
          updateMapStatus(allMarkers.size, 0);
        }
      } catch(e) { /* silencieux */ }
      await new Promise(r => setTimeout(r, 1100));
    }

    if (statusEl) statusEl.style.display = 'none';
    window.state.geocodingActive = false;
    if (showHeat) renderHeatmap();
  }

  // ── GPS temps réel ───────────────────────────────────
  function toggleGPS() {
    const btn = document.getElementById('btn-gps');
    if (gpsWatch) {
      navigator.geolocation.clearWatch(gpsWatch);
      gpsWatch = null;
      if (gpsMarker) { map.removeLayer(gpsMarker); gpsMarker = null; }
      if (gpsCircle) { map.removeLayer(gpsCircle); gpsCircle = null; }
      if (btn) { btn.classList.remove('active'); btn.title = 'Activer ma position'; }
      return;
    }
    if (!navigator.geolocation) { alert('GPS non disponible'); return; }
    if (btn) { btn.classList.add('active'); btn.title = 'Désactiver GPS'; }

    gpsWatch = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        if (!map) return;

        if (!gpsMarker) {
          const gpsIcon = L.divIcon({
            html: '<div class="gps-pulse"><div class="gps-dot"></div></div>',
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          gpsMarker = L.marker([lat, lon], { icon: gpsIcon, zIndexOffset: 1000 }).addTo(map);
          gpsCircle = L.circle([lat, lon], { radius: accuracy, color: '#5dade2', fillColor: '#5dade2', fillOpacity: 0.1, weight: 1 }).addTo(map);
          map.setView([lat, lon], 15);
        } else {
          gpsMarker.setLatLng([lat, lon]);
          gpsCircle.setLatLng([lat, lon]);
          gpsCircle.setRadius(accuracy);
        }
      },
      err => {
        if (btn) btn.classList.remove('active');
        gpsWatch = null;
        alert('Erreur GPS : ' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000. }
    );
  }

  // ── Heatmap ──────────────────────────────────────────
  function toggleHeatmap() {
    showHeat = !showHeat;
    const btn = document.getElementById('btn-heatmap');
    if (btn) btn.classList.toggle('active', showHeat);
    if (showHeat) renderHeatmap();
    else if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  }

  function renderHeatmap() {
    if (!window.L.heatLayer || !map) return;
    const cache = window.state ? window.state.geocodeCache : {};
    const prospects = window.state ? window.state.prospects : [];
    const points = [];
    prospects.forEach(p => {
      const c = cache[p.id];
      if (c) {
        // Intensité selon statut
        const intensity = { signe: 1.0, rdv: 0.8, rappel: 0.5, non: 0.2 }[p.statut] || 0.3;
        points.push([c.lat, c.lon, intensity]);
      }
    });
    if (heatLayer) map.removeLayer(heatLayer);
    if (points.length > 0) {
      heatLayer = L.heatLayer(points, {
        radius: 30, blur: 20,
        gradient: { 0.2: '#2980b9', 0.5: '#C9A84C', 0.8: '#e74c3c', 1.0: '#27ae60' }
      }).addTo(map);
    }
  }

  // ── Filtres ──────────────────────────────────────────
  function toggleFilter(statut) {
    if (activeFilters.has(statut)) activeFilters.delete(statut);
    else activeFilters.add(statut);

    const btn = document.getElementById('map-filter-' + statut);
    if (btn) btn.classList.toggle('active', activeFilters.has(statut));

    refreshMarkers();
  }

  function setAllFilters(on) {
    ['signe', 'rdv', 'rappel', 'non', 'absent', 'b2b'].forEach(s => {
      if (on) activeFilters.add(s);
      else activeFilters.delete(s);
      const btn = document.getElementById('map-filter-' + s);
      if (btn) btn.classList.toggle('active', on);
    });
    refreshMarkers();
  }

  // ── Centre sur un prospect ───────────────────────────
  function focusProspect(id) {
    const cache = window.state ? window.state.geocodeCache : {};
    const coords = cache[id];
    if (!coords || !map) return;
    map.setView([coords.lat, coords.lon], 17, { animate: true });
    const marker = allMarkers.get(id);
    if (marker) setTimeout(() => marker.openPopup(), 300);
  }

  // ── Zoom sur Wallonie ────────────────────────────────
  function resetView() {
    if (map) map.setView([50.4, 4.7], 9, { animate: true });
  }

  function fitMarkers() {
    if (!map || allMarkers.size === 0) return;
    const bounds = [];
    allMarkers.forEach(m => bounds.push(m.getLatLng()));
    map.fitBounds(L.latLngBounds(bounds).pad(0.15), { animate: true });
  }

  // ── UI helpers ───────────────────────────────────────
  function updateMapStatus(placed, pending) {
    const el = document.getElementById('map-status');
    if (el) {
      el.textContent = placed > 0
        ? `${placed} prospect${placed > 1 ? 's' : ''} sur la carte`
        : 'Aucun prospect géocodé';
      if (pending > 0) el.textContent += ` · ${pending} en attente`;
    }
  }

  function updateZoomInfo() {
    const el = document.getElementById('map-zoom-info');
    if (el && map) el.textContent = 'Zoom ' + map.getZoom();
  }

  function renderMapOverlay() {
    // Déjà géré dans le HTML — on initialise juste les filtres
    ['signe', 'rdv', 'rappel', 'non', 'absent', 'b2b'].forEach(s => {
      const btn = document.getElementById('map-filter-' + s);
      if (btn) btn.classList.add('active');
    });
    updateZoomInfo();
  }

  // ── Expose API publique ──────────────────────────────
  return { init, refreshMarkers, toggleGPS, toggleHeatmap, toggleFilter, setAllFilters, setTileLayer, focusProspect, resetView, fitMarkers };
})();

// ── Utilitaire (disponible si escHtml pas encore défini) ──
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
