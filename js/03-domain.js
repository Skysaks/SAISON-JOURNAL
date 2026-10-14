/* =========================================================
   Domaine : saisons, compo (mercato), domaines, habitudes, objectifs
   ========================================================= */
function seasonList() {
  return arr('seasons').filter(s => isKey(s.start) && isKey(s.end) && s.start <= s.end).sort((a, b) => a.start.localeCompare(b.start));
}
function seasonAt(k) { return seasonList().find(s => s.start <= k && k <= s.end) || null; }
function seasonById(id) { const s = S.seasons[id]; return s ? Object.assign({ id }, s) : null; }
function prevSeasonOf(s) { const l = seasonList(); const i = l.findIndex(x => x.id === s.id); return i > 0 ? l[i - 1] : null; }
function latestSeason() { const l = seasonList().filter(s => s.start <= ctx.today); return l.length ? l[l.length - 1] : null; }
function nextSeason() { return seasonList().find(s => s.start > ctx.today) || null; }

/* ---------- projets et compo */
function projList() {
  return arr('projects').filter(p => p.name).sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99) || String(a.name).localeCompare(String(b.name)));
}
function statusLogOf(p) {
  return Array.isArray(p && p.statusLog) ? p.statusLog.filter(e => e && isKey(e.from) && STATUS[e.status]) : [];
}
function statusAt(p, k) {
  if (!p) return 'banc';
  const log = statusLogOf(p);
  if (!log.length) return STATUS[p.status] ? p.status : 'banc';
  let cur = null;
  log.forEach(e => { if (e.from <= k && (!cur || e.from >= cur.from)) cur = e; });
  if (!cur) cur = log.reduce((m, e) => (!m || e.from < m.from ? e : m), null);
  return cur.status;
}
function pendingChange(p) {
  const fut = statusLogOf(p).filter(e => e.from > ctx.today).sort((a, b) => a.from.localeCompare(b.from));
  return fut.length ? fut[0] : null;
}
function lineupAt(k) { const o = {}; ctx.projects.forEach(p => { o[p.id] = statusAt(p, k); }); return o; }
function mercatoDate() {
  const m = R().mercato, T = ctx.today;
  if (m === 'libre') return T;
  if (m === 'hebdo') return addDays(mondayOf(T), 7);
  if (m === 'mensuel') return firstOfMonth(shiftMonth(monthOf(T), 1));
  return addDays(T, 1);
}
function captainAt(k) { return ctx.projects.find(p => statusAt(p, k) === 'capitaine') || null; }

function areaInfo(a, k) {
  if (LIFE[a]) return { id: a, label: LIFE[a], color: LIFE_COLORS[a], life: true, mult: 1, status: null };
  const p = S.projects[a];
  if (p) {
    const st = statusAt(Object.assign({ id: a }, p), k || ctx.today);
    return { id: a, label: p.name, color: ctx.colors[a] || '#8A8595', life: false, status: st, mult: Number(R().mult[st]) };
  }
  return { id: a, label: 'Sans domaine', color: '#8A8595', life: true, mult: 1, status: null };
}
function activeAreas(k) {
  return ctx.projects.filter(p => { const st = statusAt(p, k || ctx.today); return st === 'capitaine' || st === 'titulaire'; }).map(p => p.id).concat(Object.keys(LIFE));
}

/* ---------- habitudes (calendrier non rétroactif) */
function daysFor(h, k) {
  if (Array.isArray(h.sched) && h.sched.length) {
    let cur = null;
    h.sched.forEach(s => { if (s && s.from <= k && (!cur || s.from >= cur.from)) cur = s; });
    return cur && Array.isArray(cur.days) ? cur.days : [];
  }
  return Array.isArray(h.days) ? h.days : [];
}
function habitList() {
  return arr('habits').filter(h => h.name).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name)));
}
function habitActiveOn(h, k) { return (!h.createdAt || h.createdAt <= k) && !(h.archivedAt && h.archivedAt <= k); }
function habitsDue(k) { const w = weekday(k); return ctx.habits.filter(h => habitActiveOn(h, k) && daysFor(h, k).includes(w)); }
function habitStreak(h, k) {
  let n = 0;
  for (let i = 0, d = k; i < 400; i++, d = addDays(d, -1)) {
    if (h.createdAt && d < h.createdAt) break;
    if (!daysFor(h, d).includes(weekday(d))) continue;
    const day = getDay(d);
    if (day && day.type === 'treve') continue;
    const done = day && day.h && day.h[h.id] > 0;
    if (done) n++;
    else if (d === ctx.today) continue;
    else break;
  }
  return n;
}

/* ---------- quêtes */
const questArr = () => arr('quests').filter(q => q.title);
const isBlocked = q => !q.done && (Number(q.postponed) || 0) >= (Number(R().quests.blockedAfter) || 3);
const kindW = k => Number((R().score.kindWeight || {})[k]) || 1;

/* ---------- objectifs */
function isoWeekMonday(year, week) { return addDays(mondayOf(`${year}-01-04`), (week - 1) * 7); }
function periodBounds(horizon, period) {
  if (horizon === 'semaine') {
    const m = /^(\d{4})-W(\d{2})$/.exec(period || '');
    if (!m) return null;
    const a = isoWeekMonday(Number(m[1]), Number(m[2]));
    return [a, addDays(a, 6)];
  }
  if (horizon === 'mois') return /^\d{4}-\d{2}$/.test(period || '') ? [firstOfMonth(period), lastDayOf(period)] : null;
  const s = seasonById(period);
  return s ? [s.start, s.end] : null;
}
const goalArr = () => arr('goals').filter(g => g.title);
function goalsFor(horizon, period) {
  return goalArr().filter(g => g.horizon === horizon && g.period === period)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || String(a.title).localeCompare(String(b.title)));
}
const goalMax = h => Number(R().goals[h === 'semaine' ? 'maxW' : h === 'mois' ? 'maxM' : 'maxS']) || 3;
const goalXpKey = h => (h === 'semaine' ? 'goalW' : h === 'mois' ? 'goalM' : 'goalS');
function goalLabel(id) { const g = S.goals[id]; return g ? g.title : ''; }
