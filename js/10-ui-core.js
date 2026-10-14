/* =========================================================
   Interface : boucle de rendu, en-tête collant, navigation, composants
   ========================================================= */
const $app = document.getElementById('app');
const $hdr = document.getElementById('hdr');
const $view = document.getElementById('view');
const $bnav = document.getElementById('bnav');
const $ovl = document.getElementById('ovl');
const $toasts = document.getElementById('toasts');
const $banner = document.getElementById('banner');
const $tip = document.getElementById('tip');
const VIEWS = {};
const PERF = {};
const ACT = {}, CHG = {}, FORM = {};
let ctx = null;

const ui = {
  tab: 'match', perf: 'semaine', set: 'saison',
  day: todayKey(), week: todayKey(), month: todayKey().slice(0, 7), seasonId: null,
  q: { view: 'toutes', area: 'all', kind: 'all', prio: 'all', text: '', showDone: false }, editQuest: null, postpone: null, split: null,
  lib: { tab: 'lectures', area: 'all', kind: 'all', open: null, finishing: null, noteKind: 'idee', nFilter: 'all', nText: '' },
  net: { filter: 'all', tag: '', open: null, note: null },
  agent: { open: null, run: null, view: 'revue' },
  editProj: null, confirm: null, proof: {}, coach: {}, overlay: null, heatSel: null, dayPanel: null, cupOpen: null, restoreId: null, restartFrom: null,
  mood: { filter: 'all', kind: 'image', img: null, busy: false, edit: null }
};
const NAV = [['match', 'Match', 'ball'], ['perf', 'Performance', 'chart'], ['quetes', 'Quêtes', 'list'], ['compo', 'Compo', 'team'], ['agent', 'Revue', null], ['savoir', 'Bibliothèque', null], ['reseau', 'Réseau', null], ['mood', 'Moodboard', null]];
const PERF_TABS = [['semaine', 'Semaine'], ['mois', 'Mois'], ['saison', 'Saison'], ['carriere', 'Carrière'], ['analytics', 'Analyses']];
const isWide = () => window.matchMedia('(min-width: 920px)').matches;
const isPhone = () => window.matchMedia('(max-width: 719px)').matches;

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  $toasts.appendChild(el);
  while ($toasts.children.length > 3) $toasts.removeChild($toasts.firstChild);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2800);
}
function banner(msg) { $banner.textContent = msg; $banner.hidden = false; }

let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  const run = () => { if (!renderQueued) return; renderQueued = false; render(); };
  requestAnimationFrame(run);
  setTimeout(run, 120);
}

/* ---------- préservation de la saisie pendant un rendu */
const dirty = new Set();
function captureInputs() {
  const a = document.activeElement;
  const o = { focusId: null, sel: null, vals: {}, scroll: {} };
  if (a && a.id && document.body.contains(a) && (a.closest('#app') || a.closest('#ovl'))) {
    o.focusId = a.id;
    const typing = a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && ['text', 'number', 'date', 'search', 'time'].includes(a.type));
    if (typing) {
      o.vals[a.id] = a.value;
      try { if (a.type === 'text' || a.type === 'search' || a.tagName === 'TEXTAREA') o.sel = [a.selectionStart, a.selectionEnd]; } catch (e) { /* ignore */ }
    }
  }
  dirty.forEach(id => { const el = document.getElementById(id); if (el && !(id in o.vals)) o.vals[id] = el.type === 'checkbox' ? el.checked : el.value; });
  document.querySelectorAll('[data-keep-scroll]').forEach(el => { if (el.id) o.scroll[el.id] = el.scrollLeft; });
  return o;
}
function restoreInputs(o) {
  Object.keys(o.vals).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!o.vals[id]; else if (el.value !== o.vals[id]) el.value = o.vals[id];
  });
  Object.keys(o.scroll).forEach(id => { const el = document.getElementById(id); if (el) el.scrollLeft = o.scroll[id]; });
  if (o.focusId) {
    const el = document.getElementById(o.focusId);
    if (el && el !== document.activeElement) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    if (el && o.sel && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(o.sel[0], o.sel[1]); } catch (e) { /* ignore */ } }
  }
}
function clearDirty(form) {
  form.querySelectorAll('[id]').forEach(el => dirty.delete(el.id));
  try { form.reset(); } catch (e) { /* ignore */ }
}

/* ---------- apparence */
function applyLook() {
  const lk = R().look;
  const b = document.body;
  b.classList.toggle('th-dark', lk.theme === 'dark');
  b.classList.toggle('th-light', lk.theme === 'light');
  b.classList.toggle('dens-compact', lk.density === 'compact');
  b.classList.toggle('motion-reduce', lk.motion === 'reduce');
  b.classList.toggle('titles-classic', lk.titles === 'classique');
  b.classList.toggle('res-cb', lk.results === 'cb');
  applyPalette();
  $hdr.setAttribute('aria-label', 'Tableau d’affichage');
  $bnav.setAttribute('aria-label', 'Navigation principale');
  const fab = document.querySelector('.fab');
  if (fab) fab.setAttribute('aria-label', 'Ajout rapide');
}

/* ---------- rendu */
let prev = { total: null, level: null, rec: null, score: {} };
let lastWide = null;
function render() {
  renderQueued = false;
  const snap = captureInputs();
  const lang = resolveLang();
  if (lang !== LANG) setLang(lang);
  const th = resolveTheme();
  if (!TH || TH !== THEMES[th]) applyVocab();
  buildCtx();
  applyLook();
  lastWide = isWide();
  $hdr.innerHTML = headerHtml();
  let html;
  try { html = ui.tab === 'perf' ? perfHtml() : (VIEWS[ui.tab] || VIEWS.match)(); }
  catch (e) { console.error(e); html = `<div class="card" style="margin-top:16px"><p>Cette vue n'a pas pu s'afficher. Recharge la page ; si le problème persiste, signale-le à Claude.</p></div>`; }
  $view.innerHTML = html;
  $bnav.innerHTML = bottomNavHtml();
  $ovl.innerHTML = overlayHtml();
  $ovl.hidden = !ui.overlay;
  document.body.classList.toggle('ovl-open', !!ui.overlay);
  restoreInputs(snap);
  animateCounts();
  if (userActed && prev.total !== null) {
    const d = ctx.careerXp - prev.total;
    if (d > 0) toast(`+${fmt(d)} XP`, 'xp');
    if (ctx.lv.L > prev.level) setTimeout(() => toast(`Niveau ${ctx.lv.L} · ${ctx.lv.title}`, 'xp big'), 350);
  }
  if (userActed) setTimeout(syncRewards, 60);
  userActed = false;
  prev.total = ctx.careerXp; prev.level = ctx.lv.L;
}
window.addEventListener('resize', () => { if (lastWide !== null && isWide() !== lastWide) scheduleRender(); });

/* compteurs animés (score, XP) */
const counts = {};
function animateCounts() {
  const reduce = document.body.classList.contains('motion-reduce') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-count]').forEach(el => {
    const key = el.dataset.count, to = Number(el.dataset.to);
    if (!Number.isFinite(to)) return;
    const from = counts[key];
    counts[key] = to;
    if (reduce || from === undefined || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 450;
    const step = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    if (el.dataset.pulse && to > from) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  });
}

function headerHtml() {
  const lv = ctx.lv;
  const s = ctx.seasonRef;
  const pct = clamp(lv.into / lv.need * 100, 0, 100);
  const f = formOf(lastMatches(5));
  const rec = s ? record(s.start, s.end) : null;
  const sync = mode === 'db' ? ['ok', 'Synchronisé'] : mode === 'local' ? ['local', 'Local'] : ['', 'Connexion…'];
  const tabs = NAV.map(([id, label]) => `<button type="button" class="tab" role="tab" aria-selected="${ui.tab === id}" data-a="go" data-tab="${id}">${label}${tabBadge(id)}</button>`).join('');
  return `<div class="hdr-in">
    <button type="button" class="brand" data-a="go" data-tab="match" aria-label="Aller au match du jour"><b>${esc(R().clubName || thBrand())}</b><small>${esc(s ? (s.name || 'Saison') : 'Intersaison')} <i class="sync ${sync[0]}" title="${sync[1]}"></i></small></button>
    <div class="lvl" title="${fmt(ctx.careerXp)} XP carrière">
      <span class="lvl-badge">${lv.L}</span>
      <span class="lvl-main"><span class="lvl-title">${esc(lv.title)}</span><span class="xpbar" role="progressbar" aria-label="Vers le niveau ${lv.L + 1}" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}"><i style="width:${pct.toFixed(1)}%"></i></span><span class="lvl-sub">${fmt(lv.hi - ctx.careerXp)} XP avant niveau ${lv.L + 1}</span></span>
    </div>
    <div class="hform" aria-label="Forme : ${f.list.map(m => RES[m.t].l).join(', ') || 'aucun match'}">${formDots(f.list)}<span class="hform-t">${f.list.length ? `${f.pts} pts / ${f.max}` : 'Forme'}</span></div>
    ${rec ? `<div class="hrec"><b>${rec.pts}</b><span>pts · ${rec.J} ${rl('J')}</span></div>` : ''}
    <div class="hdr-act">
      ${ui.tab !== 'match' || ui.day !== ctx.today ? `<button type="button" class="btn btn-sm btn-primary hdr-match" data-a="go" data-tab="match" data-today="1"><span class="hide-phone">Match du jour</span><span class="show-phone">Match</span></button>` : ''}
      <button type="button" class="iconbtn" data-a="search" aria-label="Rechercher (touche /)">${ICON.search}</button>
      <button type="button" class="iconbtn hide-phone" data-a="quick" aria-label="Ajout rapide (touche Q)">${ICON.plus}</button>
      <button type="button" class="iconbtn hide-phone" data-a="go" data-tab="guide" aria-label="Guide" aria-pressed="${ui.tab === 'guide'}">${ICON.help}</button>
      <button type="button" class="btn btn-sm hdr-set hide-phone" data-a="go" data-tab="reglages" aria-pressed="${ui.tab === 'reglages'}">${ICON.gear}<span>Réglages</span></button>
    </div>
  </div>
  <nav class="tabs" role="tablist" aria-label="Sections">${tabs}</nav>`;
}
function tabBadge(id) {
  if (id === 'quetes') { const n = questArr().filter(q => !q.done && isKey(q.due) && q.due < ctx.today).length; return n ? `<span class="cnt" aria-label="${n} en retard">${n}</span>` : ''; }
  if (id === 'reseau') { const n = contactArr().filter(c => c.late).length; return n ? `<span class="cnt" aria-label="${n} à relancer">${n}</span>` : ''; }
  if (id === 'agent') { const n = agentCount(); return n ? `<span class="cnt" aria-label="${n} points à traiter">${n}</span>` : ''; }
  return '';
}
function formDots(list) {
  if (!list.length) return '<span class="fdot empty" aria-hidden="true"></span>'.repeat(5);
  const pad5 = Array(Math.max(0, 5 - list.length)).fill('<span class="fdot empty" aria-hidden="true"></span>').join('');
  return pad5 + list.map(m => `<span class="fdot ${RES[m.t].c}" title="${esc(fmtDay(m.k))} · ${RES[m.t].l} · ${m.score}">${rl(m.t === 'F' ? 'D' : m.t)}</span>`).join('');
}
function bottomNavHtml() {
  const items = [['match', 'Match', (TH && ICON[TH.icon]) || ICON.ball], ['perf', 'Perf.', ICON.chart], ['quetes', 'Quêtes', ICON.list], ['agent', 'Revue', ICON.radar]];
  const more = ['savoir', 'reseau', 'reglages', 'mood', 'guide', 'compo'].includes(ui.tab);
  return items.map(([id, l, ic]) => `<button type="button" class="bn ${ui.tab === id ? 'on' : ''}" data-a="go" data-tab="${id}" aria-current="${ui.tab === id ? 'page' : 'false'}">${ic}<span>${l}</span>${tabBadge(id)}</button>`).join('') +
    `<button type="button" class="bn ${more ? 'on' : ''}" data-a="more" aria-label="Plus de sections">${ICON.more}<span>Plus</span>${tabBadge('reseau')}</button>`;
}
function perfHtml() {
  const sub = PERF[ui.perf] ? ui.perf : 'semaine';
  return `<div class="seg-nav" role="tablist" aria-label="Performance">${PERF_TABS.map(([id, l]) => `<button type="button" role="tab" aria-selected="${sub === id}" data-a="perf" data-v="${id}">${l}</button>`).join('')}</div>${PERF[sub]()}`;
}

/* ---------- composants */
const checkBtn = (on, attrs, label, disabled) => `<button type="button" class="chk ${on ? 'on' : ''}" role="checkbox" aria-checked="${on ? 'true' : 'false'}" aria-label="${esc(label)}" ${disabled ? 'disabled' : ''} ${attrs}>${ICON.check}</button>`;
function areaChip(a) { const i = areaInfo(a); return `<span class="chip"><i class="dot" style="background:${i.color}"></i>${esc(i.label)}</span>`; }
function kindChip(k) { const kk = KIND[k] ? k : 'fond'; return `<span class="kind kind-${kk}">${KIND[kk]}</span>`; }
function prioChip(p) { return p === 'importante' || p === 'critique' || p === 'faible' ? `<span class="prio prio-${p}">${PRIO[p]}</span>` : ''; }
const pill = (label, c) => `<span class="pill pill-${c}">${esc(label)}</span>`;
const kpi = (v, l, cls, attrs) => `<span class="kpi ${cls || ''}" ${attrs || ''}><b>${v}</b><span>${l}</span></span>`;
function nextStep(text, btn) { return text ? `<div class="next"><span class="next-l">Prochain geste</span><span class="next-t">${text}</span>${btn || ''}</div>` : ''; }
function emptyState(text, action) { return `<div class="empty"><p>${text}</p>${action || ''}</div>`; }
function delBtn(coll, id, label) {
  const key = coll + ':' + id, on = ui.confirm === key;
  return `<button type="button" class="btn btn-xs ${on ? 'danger' : 'btn-ghost'}" data-a="del" data-coll="${coll}" data-id="${esc(id)}">${on ? 'Confirmer' : (label || 'Supprimer')}</button>`;
}
function dueLabel(q) {
  if (!isKey(q.due)) return '';
  if (q.done) return `<span class="due">${fmtShort(q.due)}</span>`;
  const d = daysBetween(ctx.today, q.due);
  if (d < 0) return `<span class="due late">En retard · ${fmtShort(q.due)}</span>`;
  if (d === 0) return `<span class="due now">Aujourd'hui</span>`;
  if (d === 1) return `<span class="due">Demain</span>`;
  return `<span class="due">${fmtDayShort(q.due)}</span>`;
}
function areaOptions(sel, withLife) {
  const ps = ctx.projects.filter(p => statusAt(p, ctx.today) !== 'tribune' || p.id === sel);
  const o = ps.map(p => `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(p.name)} · ${STATUS[statusAt(p, ctx.today)]}</option>`).join('');
  const l = withLife === false ? '' : Object.keys(LIFE).map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${LIFE[k]}</option>`).join('');
  return `${o ? `<optgroup label="Projets">${o}</optgroup>` : ''}${l ? `<optgroup label="Vie">${l}</optgroup>` : ''}`;
}
const defaultArea = () => (ctx.captain ? ctx.captain.id : (ctx.projects[0] ? ctx.projects[0].id : 'esprit'));
function kindOptions(sel) { return Object.keys(KIND).map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${KIND[k]} · ${xpv(k)} XP</option>`).join(''); }
function prioOptions(sel) { return Object.keys(PRIO).map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${PRIO[k]}</option>`).join(''); }
function goalOptions(sel, horizons) {
  const T = ctx.today, s = ctx.seasonRef;
  const list = goalArr().filter(g => !g.done && ((g.horizon === 'semaine' && g.period === weekKeyOf(T)) || (g.horizon === 'mois' && g.period === monthOf(T)) || (s && g.horizon === 'saison' && g.period === s.id)) && (!horizons || horizons.includes(g.horizon)));
  if (sel && S.goals[sel] && !list.some(g => g.id === sel)) list.push(Object.assign({ id: sel }, S.goals[sel]));
  return `<option value="">Aucun objectif lié</option>` + list.map(g => `<option value="${esc(g.id)}"${g.id === sel ? ' selected' : ''}>${esc(g.title)} · ${HORIZON[g.horizon]}</option>`).join('');
}
function navHead(title, eyebrow, prevA, nextA, extra) {
  return `<div class="viewhead">
    <button type="button" class="iconbtn" ${prevA} aria-label="Précédent">${ICON.left}</button>
    <div class="grow"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div>
    <button type="button" class="iconbtn" ${nextA} aria-label="Suivant">${ICON.right}</button>${extra || ''}
  </div>`;
}
function goalStatusPill(g) { const st = goalStatus(g); return pill(GOAL_ST[st.st].l, GOAL_ST[st.st].c); }
function recKpis(rec, xp) {
  return kpi(rec.avg == null ? '–' : fmt1(rec.avg), 'score moyen') + kpi(`${rec.V}-${rec.N}-${rec.D}`, vnd()) + kpi(rec.pts, 'pts') + kpi('+' + fmt(xp), 'XP', 'gold');
}
function sectionCard(title, body, right, cls, id) {
  return `<section class="card ${cls || ''}"${id ? ` id="${id}"` : ''}><div class="card-h"><h2>${title}</h2>${right ? `<span class="card-r">${right}</span>` : ''}</div>${body}</section>`;
}

/* ---------- réseau (utilisé dans plusieurs vues) */
function contactArr() {
  return arr('contacts').filter(c => c.name).map(c => {
    const log = Array.isArray(c.log) ? c.log.filter(x => x && isKey(x.date)) : [];
    const last = log.length ? log.reduce((m, x) => (x.date > m ? x.date : m), log[0].date) : null;
    const cad = Number(c.cadence) || 30;
    const base = last || (isKey(c.createdAt) ? c.createdAt : ctx.today);
    const nextDate = last ? addDays(last, cad) : base;
    const since = last ? daysBetween(last, ctx.today) : null;
    return Object.assign(c, { log, last, cad, nextDate, since, late: nextDate <= ctx.today, soon: nextDate > ctx.today && nextDate <= addDays(ctx.today, 7), dormant: since === null ? daysBetween(base, ctx.today) >= 90 : since >= 90, tags: Array.isArray(c.tags) ? c.tags : [] });
  });
}
