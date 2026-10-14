/* =========================================================
   Moteur de score : score d'exécution /100, résultat, instantanés
   Score ≠ XP ≠ points ≠ niveau.
   ========================================================= */
function dayType(day) {
  const t = day && day.type;
  if (DAY_TYPES[t]) return t;
  const d = R().match.defaultType;
  return DAY_TYPES[d] && d !== 'treve' ? d : 'normal';
}
function typeCfg(type, rules) {
  const rl = rules || rulesNow();
  const c = (rl.dayTypes && rl.dayTypes[type]) || DEFAULTS.dayTypes[type] || DEFAULTS.dayTypes.normal;
  return { coups: clamp(Math.round(Number(c.coups)), 0, 3), routine: c.routine !== false };
}
const questDoneBy = (id, k) => { const q = S.quests[id]; return !!(q && q.done && q.doneDate && q.doneDate <= k); };

function computeScore(k, dayIn, rulesIn) {
  const day = dayIn || {};
  const rules = rulesIn && rulesIn.score ? rulesIn : rulesNow();
  const type = dayType(day);
  const ids = (Array.isArray(day.coups) ? day.coups : []).filter(id => S.quests[id]).slice(0, 3);
  const due = habitsDue(k);
  const hDone = due.filter(h => (day.h || {})[h.id] > 0).length;
  const closed = !!(day.ft && day.ft.closedTs);
  const pDone = ids.filter(id => questDoneBy(id, k)).length;
  const base = { type, chosen: ids.length, pDone, hDone, hDue: due.length, closed };
  if (type === 'treve') return Object.assign(base, { score: null, req: 0, parts: null });
  const cfg = typeCfg(type, rules);
  const sc = rules.score;
  const kw = id => Number((sc.kindWeight || {})[S.quests[id].kind]) || 1;
  const req = cfg.coups;
  const chosenW = ids.map(kw).sort((a, b) => b - a);
  const D = sum(chosenW.slice(0, req)) + Math.max(0, req - ids.length);
  const N = sum(ids.filter(id => questDoneBy(id, k)).map(kw));
  const coupsR = req > 0 ? (D > 0 ? Math.min(1, N / D) : 0) : null;
  const routineR = cfg.routine && due.length ? hDone / due.length : null;
  const wC = Number(sc.wCoups) || 0, wR = Number(sc.wRoutine) || 0, wF = Number(sc.wClose) || 0;
  let max = wF, earned = closed ? wF : 0;
  if (coupsR !== null) { max += wC; earned += wC * coupsR; }
  if (routineR !== null) { max += wR; earned += wR * routineR; }
  const f = max > 0 ? 100 / max : 0;
  const raw = earned * f;
  const score = sc.rounding === 'floor' ? Math.floor(raw + 1e-9) : Math.round(raw);
  const parts = {
    coups: coupsR === null ? null : { got: wC * coupsR * f, max: wC * f },
    routine: routineR === null ? null : { got: wR * routineR * f, max: wR * f },
    close: { got: closed ? wF * f : 0, max: wF * f }
  };
  return Object.assign(base, { score: clamp(score, 0, 100), req, coupsR, routineR, parts });
}
function resultOf(score, rules) {
  const sc = (rules && rules.score) || R().score;
  return score >= Number(sc.win) ? 'V' : score >= Number(sc.draw) ? 'N' : 'D';
}
function hasPlay(day) {
  if (!day) return false;
  const h = day.h || {};
  const ft = day.ft || {};
  return Object.keys(h).some(x => h[x] > 0) || (day.coups || []).length > 0 || !!day.ko || !!ft.closedTs ||
    !!(ft.shipped || ft.block || ft.adjust || ft.lesson) || (day.notes || []).length > 0 || !!day.type || !!(day.pre && day.pre.energy);
}
function makeSnap(k, day, rulesIn) {
  const rules = rulesIn && rulesIn.score ? rulesIn : rulesNow();
  const sc = computeScore(k, day, rules);
  let result;
  if (sc.type === 'treve') result = 'T';
  else if (!hasPlay(day)) result = 'F';
  else result = resultOf(sc.score, rules);
  const ko = day && day.ko;
  const planned = ko && Array.isArray(ko.coups) ? { n: ko.coups.length, done: ko.coups.filter(id => questDoneBy(id, k)).length } : null;
  const cap = captainAt(k);
  return {
    v: rules.v || 1, rules: { v: rules.v || 1, score: clone(rules.score), dayTypes: clone(rules.dayTypes) },
    type: sc.type, score: result === 'F' ? 0 : sc.score, result, req: sc.req || 0, chosen: sc.chosen, pDone: sc.pDone,
    hDone: sc.hDone, hDue: sc.hDue, closed: sc.closed, parts: sc.parts, planned, captain: cap ? cap.id : null,
    xp: xpScanDay(k), coups: ((day && day.coups) || []).slice(0, 3), at: nowTs()
  };
}
function dayResult(k) {
  if (ctx.resCache.has(k)) return ctx.resCache.get(k);
  const day = getDay(k);
  const season = seasonAt(k);
  let r;
  if (k > ctx.today) r = Object.assign({ t: 'futur' }, computeScore(k, day));
  else if (!season) r = Object.assign({ t: 'avant' }, computeScore(k, day));
  else if (day && day.snap && k < ctx.today) {
    const s = day.snap;
    r = { t: RES[s.result] ? s.result : 'D', score: s.score, type: s.type, req: s.req, chosen: s.chosen, pDone: s.pDone, hDone: s.hDone, hDue: s.hDue, closed: s.closed, parts: s.parts, planned: s.planned, frozen: true, edited: !!day.edited };
  } else {
    const sc = computeScore(k, day, rulesNow());
    if (sc.type === 'treve') r = Object.assign({ t: 'T' }, sc);
    else if (k === ctx.today) r = Object.assign({ t: 'live', prov: resultOf(sc.score) }, sc);
    else if (!hasPlay(day)) r = Object.assign({ t: 'F' }, sc, { score: 0 });
    else r = Object.assign({ t: resultOf(sc.score) }, sc);
  }
  r.k = k;
  ctx.resCache.set(k, r);
  return r;
}
const counted = r => r.t === 'V' || r.t === 'N' || r.t === 'D' || r.t === 'F';

/* ---------- bilans chiffrés */
function record(a, b) {
  const o = { J: 0, V: 0, N: 0, D: 0, F: 0, T: 0, pts: 0, pct: null, winRate: null, avg: null, best: null, worst: null, scores: [] };
  const yest = addDays(ctx.today, -1);
  const hi = minKey(b, yest);
  for (const k of dayRange(a, hi)) {
    const r = dayResult(k);
    if (r.t === 'T') { o.T++; continue; }
    if (!counted(r)) continue;
    o.J++;
    if (r.t === 'V') o.V++; else if (r.t === 'N') o.N++; else { o.D++; if (r.t === 'F') o.F++; }
    const s = Number(r.score) || 0;
    o.scores.push(s);
    if (!o.best || s > o.best.score) o.best = { k, score: s };
    if (!o.worst || s < o.worst.score) o.worst = { k, score: s };
  }
  o.pts = o.V * 3 + o.N;
  if (o.J) { o.pct = Math.round(o.pts / (o.J * 3) * 100); o.winRate = Math.round(o.V / o.J * 100); o.avg = avg(o.scores); }
  return o;
}
function lastMatches(n, fromKey) {
  const out = [];
  let k = fromKey || addDays(ctx.today, -1);
  for (let i = 0; i < 500 && out.length < n; i++, k = addDays(k, -1)) {
    const r = dayResult(k);
    if (r.t === 'avant' && !seasonAt(k) && !seasonList().some(s => s.start <= k)) break;
    if (counted(r)) out.unshift({ k, t: r.t, score: Number(r.score) || 0 });
  }
  return out;
}
function formOf(list) {
  const pts = sum(list.map(m => (m.t === 'V' ? 3 : m.t === 'N' ? 1 : 0)));
  return { list, pts, max: list.length * 3, avg: avg(list.map(m => m.score)) };
}
function currentStreak() {
  let n = 0;
  const tr = dayResult(ctx.today);
  if (tr.t === 'live' && tr.score >= Number(R().score.draw)) n++;
  for (let i = 0, k = addDays(ctx.today, -1); i < 1000; i++, k = addDays(k, -1)) {
    const r = dayResult(k);
    if (r.t === 'T') continue;
    if (r.t === 'V' || r.t === 'N') n++; else break;
  }
  return n;
}
function bestStreakIn(a, b) {
  let best = 0, cur = 0, bestEnd = null;
  for (const k of dayRange(a, minKey(b, addDays(ctx.today, -1)))) {
    const r = dayResult(k);
    if (r.t === 'T') continue;
    if (r.t === 'V' || r.t === 'N') { cur++; if (cur > best) { best = cur; bestEnd = k; } }
    else if (counted(r)) cur = 0;
  }
  return { n: best, end: bestEnd };
}
function division() {
  const list = lastMatches(30);
  if (list.length < 10) return { name: null, n: list.length, pct: null };
  const f = formOf(list);
  const pct = Math.round(f.pts / f.max * 100);
  return { name: (DIVISIONS.find(d => pct >= d[0]) || DIVISIONS[DIVISIONS.length - 1])[1], n: list.length, pct };
}
function planAdherence(a, b) {
  let n = 0, done = 0, days = 0;
  for (const k of dayRange(a, minKey(b, ctx.today))) {
    const d = getDay(k);
    if (!d || !d.ko || !Array.isArray(d.ko.coups)) continue;
    days++; n += d.ko.coups.length;
    done += d.ko.coups.filter(id => questDoneBy(id, k)).length;
  }
  return { days, n, done, pct: n ? Math.round(done / n * 100) : null };
}
function trevesInWeek(k, exceptK) {
  const mon = mondayOf(k);
  let n = 0;
  for (let i = 0; i < 7; i++) { const d = addDays(mon, i); if (d === exceptK) continue; const dd = getDay(d); if (dd && dd.type === 'treve') n++; }
  return n;
}
