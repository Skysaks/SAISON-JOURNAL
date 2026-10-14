'use strict';
/* =========================================================
   Ma Saison — utilitaires, dates, libellés
   Aucune donnée personnelle ici : tout vient de la base.
   ========================================================= */
const APP_KEY = 'ma-saison-v2';
const THEME_ID = 'foot';
const NT = s => s; // marque un texte à ne jamais traduire
const TX = s => s; // marque un texte court à toujours traduire (mot seul en minuscules)
let LANG = 'fr';
let TH = null;                      /* thème actif (voir 36-themes.js) */
const thName = () => (TH && TH.names && TH.names[LANG]) || (TH && TH.name) || '';
const thSub = () => (TH && TH.subs && TH.subs[LANG]) || '';
const thBrand = () => (TH && TH.brands && TH.brands[LANG]) || 'Ma saison';
const LANG_NAMES = /*nt*/ { fr: 'Français', en: 'English', es: 'Español' };
const LOCALES = /*nt*/ { fr: 'fr-FR', en: 'en-GB', es: 'es-ES' };

const pad = n => String(n).padStart(2, '0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(Number(n) || 0).toLocaleString(LOCALES[LANG] || 'fr-FR');
const fmt1 = n => (Number(n) || 0).toLocaleString(LOCALES[LANG] || 'fr-FR', { maximumFractionDigits: 1 });
const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const cap1 = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sum = arr => arr.reduce((s, x) => s + (Number(x) || 0), 0);
const avg = arr => (arr.length ? sum(arr) / arr.length : null);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const isObj = o => o && typeof o === 'object' && !Array.isArray(o);
const nowTs = () => Date.now();
const plural = (n, s, p) => `${n} ${(LANG === 'fr' ? n > 1 : n !== 1) ? (p || s + 's') : s}`;

/* ---------- dates locales (jamais UTC) */
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
const isKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
const todayKey = () => dkey(new Date());
const weekday = k => { const w = parseKey(k).getDay(); return w === 0 ? 7 : w; };
const mondayOf = k => addDays(k, 1 - weekday(k));
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
function isoWeek(k) {
  const d = parseKey(k);
  const th = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (4 - (d.getDay() || 7)));
  const y0 = new Date(th.getFullYear(), 0, 1);
  return { year: th.getFullYear(), week: Math.floor(Math.round((th - y0) / 86400000) / 7) + 1 };
}
const weekKeyOf = k => { const w = isoWeek(k); return `${w.year}-W${pad(w.week)}`; };
const monthOf = k => k.slice(0, 7);
const firstOfMonth = ym => `${ym}-01`;
const lastDayOf = ym => { const [y, m] = ym.split('-').map(Number); return `${ym}-${pad(new Date(y, m, 0).getDate())}`; };
const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
function* dayRange(a, b) { for (let k = a; k <= b; k = addDays(k, 1)) yield k; }
const minKey = (a, b) => (a < b ? a : b);
const maxKey = (a, b) => (a > b ? a : b);
const timeOf = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* noms des jours et des mois par langue (jamais passés par la traduction automatique) */
const DATE_L = /*nt*/ {
  fr: { J: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'], JC: ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'], J1: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    M: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], MC: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'] },
  en: { J: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], JC: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], J1: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    M: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], MC: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
  es: { J: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'], JC: ['lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.', 'dom.'], J1: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    M: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], MC: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'] }
};
let JOURS, JOURS_C, J1, MOIS, MOIS_C;
function applyDateLang() { const d = DATE_L[LANG] || DATE_L.fr; JOURS = d.J; JOURS_C = d.JC; J1 = d.J1; MOIS = d.M; MOIS_C = d.MC; }
applyDateLang();
const fmtDay = k => { const d = parseKey(k), w = JOURS[weekday(k) - 1], m = MOIS[d.getMonth()]; return LANG === 'es' ? /*nt*/ `${w} ${d.getDate()} de ${m}` : `${w} ${d.getDate()} ${m}`; };
const fmtShort = k => { if (!isKey(k)) return ''; const d = parseKey(k); return `${d.getDate()} ${MOIS_C[d.getMonth()]}`; };
const fmtLong = k => { const d = parseKey(k); return LANG === 'es' ? /*nt*/ `${d.getDate()} de ${MOIS[d.getMonth()]} de ${d.getFullYear()}` : `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDayShort = k => `${JOURS_C[weekday(k) - 1]} ${fmtShort(k)}`;
function fmtRange(a, b) {
  const da = parseKey(a), db = parseKey(b);
  if (da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()) return `${da.getDate()}–${db.getDate()} ${MOIS_C[db.getMonth()]}`;
  return `${fmtShort(a)} – ${fmtShort(b)}`;
}
const monthLabel = ym => { const [y, m] = ym.split('-').map(Number); return LANG === 'es' ? /*nt*/ `${MOIS[m - 1]} de ${y}` : `${MOIS[m - 1]} ${y}`; };

/* ---------- libellés métier */
const KIND = { livrer: 'Livrer', terrain: 'Terrain', fond: 'Fond' };
const KIND_HINT = { livrer: 'publier, envoyer, lancer, soumettre', terrain: 'appel, rendez-vous, vente, match observé', fond: 'préparer, étudier, organiser, administratif' };
const PRIO = { faible: 'Faible', normale: 'Normale', importante: 'Importante', critique: 'Critique' };
const PRIO_RANK = { critique: 0, importante: 1, normale: 2, faible: 3 };
const STATUS = { capitaine: 'Capitaine', titulaire: 'Titulaire', banc: 'Banc', tribune: 'Tribune' };
const LIFE = { corps: 'Corps', esprit: 'Esprit', argent: 'Argent & admin', liens: 'Relations' };
const DAY_TYPES = {
  normal: { label: 'Normal', hint: '3 coups, routine complète' },
  intense: { label: 'Haute intensité', hint: 'Grosse journée, mêmes exigences' },
  recovery: { label: 'Récupération', hint: '1 coup suffit : récupérer est l’objectif' },
  voyage: { label: 'Voyage', hint: '1 coup, routine hors score' },
  imprevu: { label: 'Imprévu', hint: 'Journée bousculée : 1 coup, raison notée' },
  treve: { label: 'Trêve', hint: 'Repos planifié, match neutre' }
};
const RES = {
  V: { l: 'Victoire', c: 'win', s: 'V' }, N: { l: 'Match nul', c: 'draw', s: 'N' }, D: { l: 'Défaite', c: 'loss', s: 'D' },
  F: { l: 'Forfait', c: 'loss', s: 'F' }, T: { l: 'Trêve', c: 'rest', s: 'T' },
  live: { l: 'En cours', c: 'live', s: '·' }, avant: { l: 'Hors saison', c: 'pre', s: '' }, futur: { l: 'À venir', c: 'pre', s: '' }
};
const BLOCKS = { matin: 'Matin', journee: 'Journée', soir: 'Soir' };
const LIB_KINDS = { livre: 'Livre', cours: 'Cours', reglement: 'Règlement', podcast: 'Podcast', article: 'Article', video: 'Vidéo' };
const LIB_STATUS = { a_lire: 'À lire', en_cours: 'En cours', termine: 'Terminé' };
/* types de note d'une lecture : ce que la note est, pas ce qu'elle vaut */
const NOTE_KINDS = {
  idee: { l: 'Idée', hint: 'Ce que l’auteur avance, reformulé avec tes mots' },
  citation: { l: 'Citation', hint: 'Les mots exacts, entre guillemets' },
  question: { l: 'Question', hint: 'Ce que ça ouvre et que tu veux vérifier' },
  action: { l: 'Action', hint: 'Ce que tu vas faire à cause de cette page' },
  desaccord: { l: 'Désaccord', hint: 'Ce qui te paraît faux, et pourquoi' }
};
/* gravité d'un constat de l'agent de revue */
const AG_SEV = { critique: { l: 'Urgent', c: 'loss', r: 3 }, corriger: { l: 'À corriger', c: 'risk', r: 2 }, surveiller: { l: 'À surveiller', c: 'pre', r: 1 } };
const ROLES = { joueur: 'Joueur', coach: 'Coach', agent: 'Agent', club: 'Club / recruteur', partenaire: 'Partenaire', autre: 'Autre' };
const TITLES = [[36, "Ballon d'Or"], [28, 'Légende du club'], [21, 'International'], [16, 'Capitaine'], [12, 'Cadre du vestiaire'], [8, 'Titulaire'], [5, 'Groupe pro'], [3, 'Équipe réserve'], [1, 'Centre de formation']];
const DIVISIONS = [[85, 'Élite'], [72, 'Ligue 1'], [60, 'Ligue 2'], [45, 'National'], [30, 'Régional'], [0, 'District']];
const HORIZON = { semaine: 'semaine', mois: 'mois', saison: 'saison' };
const GOAL_ST = { atteint: { l: 'Atteint', c: 'win' }, ok: { l: 'En bonne voie', c: 'ok' }, risque: { l: 'À risque', c: 'risk' }, manque: { l: 'Manqué', c: 'loss' } };
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#7a6ad8', '#e34948'];
const LIFE_COLORS = { corps: '#1baf7a', esprit: '#2a78d6', argent: '#eda100', liens: '#e87ba4' };

const ICON = {
  check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  left: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  search: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  more: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12.5" cy="8" r="1.4" fill="currentColor"/></svg>',
  ball: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 5.2l2.4 1.7-.9 2.8h-3l-.9-2.8z" fill="currentColor"/></svg>',
  chart: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  list: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4h8M5.5 8h8M5.5 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="2.7" cy="4" r="1" fill="currentColor"/><circle cx="2.7" cy="8" r="1" fill="currentColor"/><circle cx="2.7" cy="12" r="1" fill="currentColor"/></svg>',
  team: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2l1.2 2.3 2.6.4-1.9 1.8.4 2.6L8 8.1 5.7 9.3l.4-2.6-1.9-1.8 2.6-.4z" fill="currentColor"/><path d="M3 14c.6-2 2.6-3.2 5-3.2s4.4 1.2 5 3.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6.2 6.3c.2-1 1-1.6 1.9-1.6 1.1 0 1.9.7 1.9 1.6 0 1.4-1.9 1.5-1.9 2.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8.1" cy="11.4" r="1" fill="currentColor"/></svg>',
  hoop: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 7h10M8 2v10M4.6 3.6c2 2.4 2 5.4 0 6.8M11.4 3.6c-2 2.4-2 5.4 0 6.8" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>',
  shoe: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 11.5V7l3 .5 2.5-2 2 2.5 4 1.2c.8.3 1.5.9 1.5 1.8v.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M1.5 11.5h13" stroke="currentColor" stroke-width="1.5"/></svg>',
  dumbbell: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 8h6M3 5.5v5M2 6.5v3M13 5.5v5M14 6.5v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  wheel: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2" fill="currentColor"/><path d="M8 2v2.5M8 11.5V14M2 8h2.5M11.5 8H14" stroke="currentColor" stroke-width="1.4"/></svg>',
  bike: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.6" cy="11" r="2.6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12.4" cy="11" r="2.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M3.6 11l3-5.5h3.2L12.4 11M6.2 5.5h3" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linejoin="round"/></svg>',
  belt: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 6.5h13v3h-13z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 6.5v3M10 6.5v3" stroke="currentColor" stroke-width="1.5"/></svg>',
  pan: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 7h8a0 0 0 010 0v1a4 4 0 01-4 4H6a4 4 0 01-4-4z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 8.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4 5c0-1 1-1 1-2M7 5c0-1 1-1 1-2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
  note: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 12V3.5l7-1.2V11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="4.2" cy="12" r="2" fill="currentColor"/><circle cx="11.2" cy="11" r="2" fill="currentColor"/></svg>',
  rocket: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5c2.2 1.8 3.2 4.2 3 7l-1.4 2.2H6.4L5 8.5c-.2-2.8.8-5.2 3-7z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="6" r="1.3" fill="currentColor"/><path d="M6.4 11.2L5 14l3-1.4L11 14l-1.4-2.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  mountain: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 13l4.2-8 2.6 4.6L10 7l4.5 6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4.4 7.6h2.6" stroke="currentColor" stroke-width="1.2"/></svg>',
  hammer: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5l4 4-2 2-1.3-1.3-5.4 5.4a1.3 1.3 0 01-1.9-1.9l5.4-5.4L7 3.6z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  sprout: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7C8 4.8 6.3 3 4 3c0 2.2 1.7 4 4 4zM8 8c0-2.2 1.7-4 4-4 0 2.2-1.7 4-4 4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  dice: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l5.5 3.2v6.4L8 14.4 2.5 11.2V4.8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 8l5.5-3.2M8 8v6.4M8 8L2.5 4.8" stroke="currentColor" stroke-width="1.2"/></svg>',
  miss: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 5l6 6M11 5l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  radar: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 8l4.4-4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="11.1" cy="5.4" r="1.3" fill="currentColor"/></svg>',
  book: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.2c1.8-.7 3.7-.7 5.5.3v9c-1.8-1-3.7-1-5.5-.3zM13.5 3.2c-1.8-.7-3.7-.7-5.5.3v9c1.8-1 3.7-1 5.5-.3z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  quote: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.4 4.2C4.5 5 3.4 6.4 3.4 8.3c0 1.7 1 2.9 2.4 2.9 1.2 0 2.1-.9 2.1-2.1 0-1.1-.8-2-1.9-2-.2 0-.4 0-.5.1.2-.9.9-1.7 1.9-2.2zM13 4.2c-1.9.8-3 2.2-3 4.1 0 1.7 1 2.9 2.4 2.9 1.2 0 2.1-.9 2.1-2.1 0-1.1-.8-2-1.9-2-.2 0-.4 0-.5.1.2-.9.9-1.7 1.9-2.2z" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6 4.2 13.6l.7-4.3-3.1-3 4.3-.6z" fill="currentColor"/></svg>'
};

const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};

function deepMerge(base, over) {
  if (!isObj(base)) return over === undefined ? clone(base) : clone(over);
  const out = clone(base);
  if (!isObj(over)) return out;
  Object.keys(over).forEach(k => {
    if (isObj(base[k]) && isObj(over[k])) out[k] = deepMerge(base[k], over[k]);
    else if (over[k] !== undefined) out[k] = clone(over[k]);
  });
  return out;
}
const num = (v, d) => { const n = Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
const withDot = s => (/\.$/.test(s) ? s : s + '.');
/* lettres de résultat par thème et par langue : joués, victoire, nul, défaite, forfait, repos */
const RES_LETTERS = /*nt*/ {
  foot: { fr: { J: 'J', V: 'V', N: 'N', D: 'D', F: 'F', T: 'T' }, en: { J: 'P', V: 'W', N: 'D', D: 'L', F: 'F', T: 'B' }, es: { J: 'J', V: 'V', N: 'E', D: 'D', F: 'I', T: 'P' } },
  ligue: { fr: { J: 'J', V: 'V', N: 'N', D: 'D', F: 'F', T: 'O' }, en: { J: 'P', V: 'W', N: 'D', D: 'L', F: 'F', T: 'O' }, es: { J: 'J', V: 'V', N: 'E', D: 'D', F: 'I', T: 'L' } }
};
const rl = t => {
  const over = TH && TH.letters && TH.letters[LANG];
  if (over && over[t]) return over[t];
  const th = RES_LETTERS[THEME_ID] || RES_LETTERS.foot;
  return (th[LANG] || th.fr)[t] || t;
};
const vnd = () => `${rl('V')}-${rl('N')}-${rl('D')}`;
