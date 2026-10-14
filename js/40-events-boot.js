/* =========================================================
   Événements, raccourcis clavier, maintenance (matchs figés,
   trophées, sauvegarde hebdo) et démarrage
   ========================================================= */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  if (!b.closest('#app') && !b.closest('#ovl')) return;
  const fn = ACT[b.dataset.a];
  if (!fn) return;
  if (b.tagName === 'A') e.preventDefault();
  if (!ctx) buildCtx();
  try { fn(b, e); } catch (err) { console.error(err); toast('Action impossible. Recharge la page.', 'bad'); }
  if (b.dataset.close && ui.overlay && ui.overlay.type === 'search') { ui.overlay = null; render(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el && el.id && el.classList && el.classList.contains('draft')) dirty.add(el.id);
  const c = el && el.closest && el.closest('[data-c]');
  if (!c || (!c.closest('#app') && !c.closest('#ovl'))) return;
  const fn = CHG[c.dataset.c];
  if (!fn) return;
  try { fn(c, e); } catch (err) { console.error(err); toast('Modification impossible. Recharge la page.', 'bad'); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (!el) return;
  if (el.id && el.classList && el.classList.contains('draft')) dirty.add(el.id);
  if (el.dataset && el.dataset.live === 'search' && ui.overlay && ui.overlay.type === 'search') { ui.overlay.q = el.value; scheduleRender(); }
  if (el.dataset && el.dataset.c === 'qText') { ui.q.text = el.value; scheduleRender(); }
  if (el.dataset && el.dataset.c === 'libNText') { ui.lib.nText = el.value; scheduleRender(); }
  if (el.dataset && el.dataset.c === 'lookColor') previewLookColor(el);
});
document.addEventListener('submit', e => {
  const f = e.target;
  if (!f || !f.dataset || !f.dataset.f) return;
  e.preventDefault();
  const fn = FORM[f.dataset.f];
  if (!fn) return;
  try { const r = fn(f); if (r && typeof r.catch === 'function') r.catch(err => { console.error(err); toast('Enregistrement impossible.', 'bad'); }); } catch (err) { console.error(err); toast('Enregistrement impossible. Recharge la page.', 'bad'); }
});
CHG.qText = () => {};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ui.overlay) { ui.overlay = null; render(); return; }
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!ctx) return;
  if (e.key === '/') { e.preventDefault(); ACT.search(); }
  else if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); ACT.quick({ dataset: { kind: 'quete' } }); }
  else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); ACT.quick({ dataset: { kind: 'note' } }); }
  else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); ui.day = ctx.today; goTab('match'); }
});
/* info-bulles (graphiques, heatmap, calendrier) */
document.addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) { $tip.hidden = true; return; }
  $tip.textContent = el.dataset.tip;
  $tip.hidden = false;
  const r = el.getBoundingClientRect();
  const w = $tip.offsetWidth, h = $tip.offsetHeight;
  $tip.style.left = clamp(r.left + r.width / 2 - w / 2, 8, window.innerWidth - w - 8) + 'px';
  $tip.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + 'px';
});
document.addEventListener('scroll', () => { $tip.hidden = true; }, true);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { dayRollover(); scheduleRender(); } });

/* ---------- maintenance */
let maintDone = false;
function onDataReady() { if (maintDone) return; maintDone = true; setTimeout(runMaintenance, 400); }
async function runMaintenance() {
  if (!canWrite(true)) return;
  try {
    buildCtx();
    finalizePast(false);
    buildCtx();
    syncAchievements();
    buildCtx();
    syncRewards();
    agentAutoRun();
    await autoBackup();
  } catch (e) { console.error(e); }
}
function finalizePast() {
  const seasons = seasonList();
  if (!seasons.length || !canWrite(true)) return 0;
  const T = todayKey(), yest = addDays(T, -1);
  const touched = {};
  let n = 0;
  for (const k of dayRange(seasons[0].start, minKey(yest, seasons[seasons.length - 1].end))) {
    if (!seasonAt(k)) continue;
    const d = getDay(k);
    if (d && d.snap) continue;
    const mk = monthOf(k);
    const month = touched[mk] || (touched[mk] = clone(S.matches[mk]) || { days: {} });
    if (!isObj(month.days)) month.days = {};
    const day = normDay(month.days[k]);
    day.snap = makeSnap(k, day, rulesNow());
    month.days[k] = day; n++;
  }
  Object.keys(touched).forEach(mk => put('matches', mk, touched[mk], { system: true, silent: true }));
  return n;
}
function syncAchievements() {
  const found = detectTrophies();
  found.forEach(t => {
    const id = t.id.replace(/[^A-Za-z0-9_\-.~:@+]/g, '-').slice(0, 180);
    if (S.achievements[id]) return;
    const s = seasonAt(t.at);
    put('achievements', id, { key: t.key, at: t.at, label: t.label, season: s ? s.id : null }, { system: true, silent: true });
    toast(`Trophée : ${t.label}`, 'xp big');
  });
}
async function autoBackup() {
  if (mode !== 'db') { localBackupAuto(); return; }
  const last = R().lastAutoBackup;
  if (isKey(last) && daysBetween(last, todayKey()) < 7) return;
  const ok = await createBackup('auto');
  if (ok) saveSettings(s => { s.lastAutoBackup = todayKey(); });
}
let lastDayKey = todayKey();
function dayRollover() {
  const t = todayKey();
  if (t === lastDayKey) return;
  if (ui.day === lastDayKey) ui.day = t;
  lastDayKey = t;
  runMaintenance();
}
setInterval(() => { dayRollover(); }, 60000);

/* ---------- démarrage */
async function initCaps() {
  const c = window.claude;
  if (!c || typeof c.use !== 'function') return;
  const [s, d] = await Promise.all([c.use('sample').catch(() => null), c.use('downloads').catch(() => null)]);
  if (s) sampleFn = s;
  if (d) downloadsApi = d;
  scheduleRender();
}
async function boot() {
  loadCache();
  watchScheme();
  const t = LS.get(APP_KEY + ':tab');
  if (t && (VIEWS[t] || t === 'perf')) ui.tab = t;
  const p = LS.get(APP_KEY + ':perf');
  if (p && PERF[p]) ui.perf = p;
  render();
  let db = null;
  try { if (window.claude && typeof window.claude.use === 'function') db = await window.claude.use('db'); } catch (e) { db = null; }
  if (db) startDb(db);
  else { mode = 'local'; render(); onDataReady(); }
  initCaps();
}
boot();
