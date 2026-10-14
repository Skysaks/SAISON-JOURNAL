/* =========================================================
   Données : base de l'artifact (db) ou navigateur, file d'écriture
   ========================================================= */
const COLLS = ['settings', 'seasons', 'matches', 'quests', 'projects', 'goals', 'habits', 'xp_events', 'contacts', 'knowledge_items', 'reviews', 'achievements', 'cups', 'log', 'finance', 'mood', 'rewards', 'agent'];
const S = {};
COLLS.forEach(c => { S[c] = {}; });
let mode = 'boot'; // boot | db-loading | db | local
let dbApi = null, readOnly = false, userActed = false;
let sampleFn = null, sampleOff = false, downloadsApi = null;

let cacheT = null;
let cacheWarned = false;
function flushCache() {
  clearTimeout(cacheT); cacheT = null;
  const d = {}; COLLS.forEach(c => { d[c] = S[c]; });
  const ok = LS.set(APP_KEY + ':data', JSON.stringify(d));
  if (!ok && mode === 'local' && !cacheWarned) { cacheWarned = true; banner('Stockage du navigateur plein ou bloqué : tes derniers changements risquent de ne pas être gardés. Retire des images du moodboard ou exporte tes données (Réglages › Données).'); }
}
function saveCache() {
  if (mode === 'local') { flushCache(); return; }
  clearTimeout(cacheT);
  cacheT = setTimeout(flushCache, 300);
}
window.addEventListener('pagehide', () => { if (cacheT) flushCache(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && cacheT) flushCache(); });
function loadCache() {
  const raw = LS.get(APP_KEY + ':data');
  if (!raw) return false;
  try { const d = JSON.parse(raw); COLLS.forEach(c => { S[c] = (d && isObj(d[c])) ? d[c] : {}; }); return true; } catch (e) { return false; }
}

function canWrite(silent) {
  if (mode === 'boot' || mode === 'db-loading') { if (!silent) toast('Chargement de tes données… réessaie dans une seconde.'); return false; }
  if (readOnly) { if (!silent) toast('Lecture seule : il faut les droits d’édition sur cette page.', 'bad'); return false; }
  return true;
}
function put(c, id, data, opts) {
  if (!canWrite(opts && opts.silent)) return false;
  S[c] = Object.assign({}, S[c], { [id]: data });
  if (!(opts && opts.system)) userActed = true;
  saveCache(); scheduleRender();
  if (mode === 'db') enqueue(c, id, data);
  return true;
}
function del(c, id, opts) {
  if (!canWrite(opts && opts.silent)) return false;
  const o = Object.assign({}, S[c]); delete o[id]; S[c] = o;
  if (!(opts && opts.system)) userActed = true;
  saveCache(); scheduleRender();
  if (mode === 'db') enqueue(c, id, null);
  return true;
}
const wq = {};
let pendingWrites = 0;
function enqueue(c, id, data) {
  const p = c + '/' + id;
  const q = wq[p] || (wq[p] = { data: null, has: false, running: false });
  q.data = data; q.has = true;
  if (!q.running) runQueue(p);
}
async function runQueue(p) {
  const q = wq[p]; q.running = true;
  while (q.has) {
    const data = q.data; q.has = false;
    pendingWrites++;
    let ref = null;
    try { ref = dbApi.doc(p); } catch (e) { writeError({ code: 'invalid_argument' }); pendingWrites--; continue; }
    const go = () => (data === null ? ref.delete() : ref.set(data));
    try { await go(); }
    catch (e) {
      if (e && (e.code === 'unavailable' || e.code === 'resource_exhausted')) {
        await sleep(600 + Math.random() * 900);
        try { await go(); } catch (e2) { writeError(e2); }
      } else writeError(e);
    }
    pendingWrites--;
  }
  q.running = false;
}
function writeError(e) {
  const code = e && e.code;
  if (code === 'invalid_argument') { readOnly = true; toast('Écriture refusée : il faut les droits d’édition sur cette page.', 'bad'); }
  else if (code === 'quota_exceeded') toast('Base pleine : supprime d’anciens éléments ou de vieilles sauvegardes.', 'bad');
  else if (code === 'resource_exhausted') toast('Trop d’écritures d’un coup : attends quelques secondes.', 'bad');
  else if (code === 'revoked') banner('Accès à la base retiré. Recharge la page.');
  else toast('Synchronisation impossible pour l’instant. Ta dernière action n’est peut-être pas enregistrée.', 'bad');
}
function syncError(e) {
  if (e && e.code === 'revoked') banner('Accès à la base retiré. Recharge la page.');
  else banner('Synchronisation interrompue. Recharge la page pour reprendre.');
}

function startDb(db) {
  dbApi = db; mode = 'db-loading';
  const pending = new Set(COLLS);
  const fresh = {};
  COLLS.forEach(c => {
    try {
      db.collection(c).limit(1000).onSnapshot(snap => {
        const o = {};
        snap.docs.forEach(d => { if (d.exists) o[d.id] = d.data(); });
        if (mode !== 'db') {
          fresh[c] = o; pending.delete(c);
          if (pending.size === 0 && mode === 'db-loading') {
            COLLS.forEach(k => { S[k] = fresh[k] || {}; });
            mode = 'db'; saveCache(); render(); onDataReady();
          }
        } else { S[c] = o; saveCache(); scheduleRender(); }
      }, err => syncError(err));
    } catch (e) { syncError(e); }
  });
  setTimeout(() => {
    if (mode === 'db-loading') { mode = 'local'; banner('Base de la page injoignable : mode local, enregistré dans ce navigateur uniquement.'); render(); onDataReady(); }
  }, 15000);
}

/* ---------- journées (match) */
function getDay(k) { const m = S.matches[monthOf(k)]; return (m && isObj(m.days) && m.days[k]) || null; }
function normDay(d) {
  const x = isObj(d) ? clone(d) : {};
  if (!Array.isArray(x.coups)) x.coups = [];
  if (!isObj(x.h)) x.h = {};
  if (!isObj(x.pre)) x.pre = {};
  if (!isObj(x.ft)) x.ft = {};
  if (!Array.isArray(x.notes)) x.notes = [];
  return x;
}
function setDay(k, fn, what) {
  if (!isKey(k) || k > addDays(todayKey(), 1)) return false;
  const mk = monthOf(k);
  const month = clone(S.matches[mk]) || { days: {} };
  if (!isObj(month.days)) month.days = {};
  const day = normDay(month.days[k]);
  if (fn(day) === false) return false;
  if (day.snap && k < todayKey()) {
    day.snap = makeSnap(k, day, day.snap.rules);
    day.edited = true;
    day.edits = (Array.isArray(day.edits) ? day.edits : []).concat({ ts: nowTs(), what: what || 'modification' }).slice(-20);
  }
  month.days[k] = day;
  return put('matches', mk, month);
}
/* écriture d'une journée sans toucher à son instantané figé (chrono focus) */
function setDayRaw(k, fn) {
  if (!isKey(k) || k > addDays(todayKey(), 1)) return false;
  const mk = monthOf(k);
  const month = clone(S.matches[mk]) || { days: {} };
  if (!isObj(month.days)) month.days = {};
  const day = normDay(month.days[k]);
  if (fn(day) === false) return false;
  month.days[k] = day;
  return put('matches', mk, month);
}
function refreshSnap(k, what) {
  const d = getDay(k);
  if (!d || !d.snap || k >= todayKey()) return;
  setDay(k, () => {}, what);
}

/* ---------- journal des décisions (compo, corrections, règles) */
function addLog(type, text, extra) {
  const k = todayKey(), mk = monthOf(k);
  const doc = clone(S.log[mk]) || { items: [] };
  if (!Array.isArray(doc.items)) doc.items = [];
  doc.items.push(Object.assign({ ts: nowTs(), date: k, type, text }, extra || {}));
  doc.items = doc.items.slice(-300);
  put('log', mk, doc, { system: true, silent: true });
}
function logItems(a, b, type) {
  const out = [];
  Object.keys(S.log).forEach(mk => { ((S.log[mk] && S.log[mk].items) || []).forEach(it => { if (it && it.date >= a && it.date <= b && (!type || it.type === type)) out.push(it); }); });
  return out.sort((x, y) => (x.ts || 0) - (y.ts || 0));
}

/* ---------- accès pratiques */
const arr = coll => Object.keys(S[coll]).map(id => Object.assign({ id }, S[coll][id])).filter(x => x && typeof x === 'object');
function settingsDoc() { return clone(S.settings.main) || {}; }
function saveSettings(mut, logText) {
  const s = settingsDoc();
  mut(s);
  if (put('settings', 'main', s) && logText) addLog('regles', logText);
}
