/* =========================================================
   Réglages : valeurs par défaut et lecture fusionnée
   ========================================================= */
const DEFAULTS = {
  clubName: '',                       /* vide = nom par défaut du thème */
  lang: 'auto',
  theme: THEME_ID === 'ligue' ? 'ligue' : 'foot',
  profile: '',
  score: {
    wCoups: 60, wRoutine: 30, wClose: 10,
    win: 70, draw: 40,
    kindWeight: { livrer: 1.5, terrain: 1.25, fond: 1 },
    rounding: 'round'
  },
  dayTypes: {
    normal: { coups: 3, routine: true },
    intense: { coups: 3, routine: true },
    recovery: { coups: 1, routine: true },
    voyage: { coups: 1, routine: false },
    imprevu: { coups: 1, routine: true }
  },
  xp: {
    livrer: 40, terrain: 30, fond: 10,
    hat: 30, close: 10,
    goalW: 100, goalM: 300, goalS: 1000,
    reviewS: 50, reviewM: 100, reviewA: 300,
    book: 50, applied: 50, contact: 15,
    capStep: 100, cupStep: 100, cup: 500,
    focus: 10, focusCap: 4,
    dailyQuestCap: 8, unplannedCap: 4
  },
  mult: { capitaine: 2, titulaire: 1, banc: 0.5, tribune: 0 },
  mercato: 'prochain',
  quests: { defaultKind: 'livrer', defaultPrio: 'normale', blockedAfter: 3 },
  goals: { maxW: 3, maxM: 3, maxS: 5 },
  match: { defaultType: 'normal', askKickoff: true },
  notif: { kickoff: true, kickoffTime: '08:00', deadlines: true, fulltime: true, fulltimeTime: '21:30' },
  look: { theme: 'auto', density: 'confort', motion: 'auto', palette: 'defaut', custom: THEME_ID === 'ligue' ? /*nt*/ { accent: '#1F4FD1', reward: '#D0843A', board: '#0E1726' } : /*nt*/ { accent: '#6B34A0', reward: '#D9A21B', board: '#1B1726' }, tint: 'teinte', results: 'std', titles: 'condense' },
  focus: { sound: true },
  agent: { autoWeekly: true, onMatch: true, snoozeDays: 14, minMatches: 4 },
  lib: { goalYear: 12 },
  onboard: { hidden: false },
  rulesVersion: 1,
  rulesLog: []
};
const SETTINGS_SECTIONS = {
  score: ['score', 'dayTypes'],
  xp: ['xp', 'mult'],
  compo: ['mercato'],
  quetes: ['quests'],
  objectifs: ['goals'],
  match: ['match', 'focus'],
  agent: ['agent'],
  savoir: ['lib'],
  notifications: ['notif'],
  apparence: ['look', 'clubName', 'theme']
};

let _settingsMemo = null, _settingsSrc = null;
function R() {
  const src = S.settings && S.settings.main;
  if (_settingsMemo && _settingsSrc === src) return _settingsMemo;
  _settingsSrc = src;
  _settingsMemo = deepMerge(DEFAULTS, src || {});
  return _settingsMemo;
}
/* ---------- langue de l'interface (bascule à chaud, sans rechargement) */
function browserLang() {
  let n = 'fr';
  try { n = String(navigator.language || 'fr').slice(0, 2).toLowerCase(); } catch (e) { /* ignore */ }
  return n === 'fr' || n === 'es' ? n : 'en';
}
function resolveLang() {
  const raw = S.settings && S.settings.main ? S.settings.main.lang : undefined;
  if (LANG_NAMES[raw]) return raw;
  /* données créées avant le choix de langue : elles étaient en français */
  if (raw == null && Object.keys(S.seasons).length) return 'fr';
  return browserLang();
}
function resolveTheme() {
  if (THEME_ID !== 'foot') return THEME_ID;                 /* build déjà thématisé */
  const raw = S.settings && S.settings.main ? S.settings.main.theme : undefined;
  return THEMES[raw] ? raw : 'foot';
}
/* langue + thème : les deux réécrivent la table des textes */
function applyVocab() {
  const id = resolveTheme();
  TH = THEMES[id] || THEMES.foot;
  if (typeof __setTheme === 'function') __setTheme(THEME_ID === 'foot' ? themeRules(id, LANG) : []);
  if (typeof __RI !== 'undefined') __RI.forEach(f => f());
  _settingsMemo = null;
}
function setLang(l) {
  if (!LANG_NAMES[l] || l === LANG) return;
  LANG = l;
  if (typeof __setTable === 'function') __setTable(l);
  applyVocab();
  applyDateLang();
  _settingsMemo = null;
  try { document.documentElement.lang = l; } catch (e) { /* ignore */ }
}
/* Règles de score figées dans chaque match terminé */
function rulesNow() { const r = R(); return { v: r.rulesVersion || 1, score: clone(r.score), dayTypes: clone(r.dayTypes) }; }
function rulesOf(snapRules) { return snapRules && snapRules.score ? deepMerge(rulesNow(), snapRules) : rulesNow(); }
function xpv(key) { const v = Number(R().xp[key]); return Number.isFinite(v) ? v : Number(DEFAULTS.xp[key]) || 0; }
