/**
 * GAELEBOT STATE MANAGEMENT
 * Unified state and persistence
 */

const STORAGE_KEY_PROSPECTS = 'gaelebot_prospects_v2';
const STORAGE_KEY_CONFIG = 'gaelebot_config_v2';
const STORAGE_KEY_SESSION = 'gaelebot_session_v2';

// Migration from v1
function migrateV1() {
  const v1bot = JSON.parse(localStorage.getItem('gbot') || '[]');
  const v1saas = JSON.parse(localStorage.getItem('gaele_prospects') || '[]');
  const visited = new Set(JSON.parse(localStorage.getItem('gbot_visited') || '[]'));
  
  if (v1bot.length === 0 && v1saas.length === 0) return null;
  
  const unified = [];
  
  // Scanned prospects
  v1bot.forEach(p => {
    unified.push({
      id: `scan-${p.adresse}-${Date.now()}`,
      adresse: p.adresse,
      commune: p.commune || '',
      cp: p.cp || '',
      lang: p.lang || 'fr',
      grd: p.grd || 'ORES',
      score: p.score || 0,
      surf: p.surf || 0,
      orient: p.orient || '',
      fiab: p.fiab || '',
      statut: visited.has(p.adresse) ? 'visited' : 'new',
      date: new Date().toLocaleDateString('fr-BE'),
      type: p.isPro ? 'pro' : 'residential'
    });
  });
  
  // SaaS prospects (CRM)
  v1saas.forEach(p => {
    unified.push({
      ...p,
      id: p.id || `crm-${Date.now()}`,
      statut: p.statut || 'new',
      type: 'residential' 
    });
  });
  
  localStorage.setItem(STORAGE_KEY_PROSPECTS, JSON.stringify(unified));
  // Keep v1 keys for backup during transition but ideally should clear them later
  return unified;
}

class StateManager {
  constructor() {
    this.prospects = JSON.parse(localStorage.getItem(STORAGE_KEY_PROSPECTS)) || migrateV1() || [];
    this.config = JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG)) || {
      googleKey: localStorage.getItem('gbot_key') || '',
      metaId: localStorage.getItem('gbot_meta') || ''
    };
    this.session = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION)) || {
      active: false,
      start: null,
      elapsed: 0,
      stats: { visites: 0, interesses: 0, rdv: 0, signes: 0 }
    };
    
    this.listeners = [];
  }

  // Persistence
  save() {
    localStorage.setItem(STORAGE_KEY_PROSPECTS, JSON.stringify(this.prospects));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(this.session));
    this.notify();
  }

  // Observers
  subscribe(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  notify() {
    this.listeners.forEach(l => l(this));
  }

  // Prospect Operations
  addProspect(p) {
    const prospect = {
      id: Date.now(),
      date: new Date().toLocaleDateString('fr-BE'),
      heure: new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
      ...p
    };
    this.prospects.unshift(prospect);
    this.save();
    return prospect;
  }

  updateProspect(id, updates) {
    this.prospects = this.prospects.map(p => 
      String(p.id) === String(id) ? { ...p, ...updates } : p
    );
    this.save();
  }

  deleteProspect(id) {
    this.prospects = this.prospects.filter(p => String(p.id) !== String(id));
    this.save();
  }

  // Session Operations
  startSession() {
    this.session.active = true;
    this.session.start = Date.now() - this.session.elapsed;
    this.save();
  }

  pauseSession() {
    this.session.active = false;
    this.session.elapsed = Date.now() - this.session.start;
    this.save();
  }

  resetSession() {
    this.session = {
      active: false,
      start: null,
      elapsed: 0,
      stats: { visites: 0, interesses: 0, rdv: 0, signes: 0 }
    };
    this.save();
  }

  updateSessionStats(type) {
    if (this.session.stats[type] !== undefined) {
      this.session.stats[type]++;
      this.save();
    }
  }

  // Config Operations
  setConfig(key, value) {
    this.config[key] = value;
    this.save();
  }
}

const state = new StateManager();
