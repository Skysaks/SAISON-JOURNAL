/* =========================================================
   Analyses : statuts d'objectifs, cap, projets, briefing, coach,
   trophées, records, équilibre. Tout est calculé depuis les données.
   ========================================================= */
function buildCtx() {
  const today = todayKey();
  ctx = { today, resCache: new Map() };
  ctx.projects = projList();
  ctx.colors = {};
  ctx.projects.forEach((p, i) => { ctx.colors[p.id] = CATEGORICAL[i % CATEGORICAL.length]; });
  ctx.habits = habitList();
  ctx.season = seasonAt(today);
  ctx.captain = captainAt(today);
  ctx.xpEv = xpAllEvents();
  ctx.xpByDay = {};
  ctx.xpEv.forEach(e => { ctx.xpByDay[e.d] = (ctx.xpByDay[e.d] || 0) + e.xp; });
  ctx.careerXp = sum(ctx.xpEv.map(e => e.xp));
  ctx.lv = levelInfo(ctx.careerXp);
  const s = ctx.season || latestSeason();
  ctx.seasonRef = s;
  ctx.seasonXp = s ? xpBetween(s.start, s.end) : 0;
  return ctx;
}

/* ---------- objectifs et cap */
function goalStatus(g) {
  const target = Math.max(1, Number(g.target) || 1), cur = Math.max(0, Number(g.current) || 0);
  const prog = Math.min(1, cur / target);
  if (g.done) return { st: 'atteint', prog };
  const b = periodBounds(g.horizon, g.period);
  const start = b ? b[0] : (g.createdAt || ctx.today);
  const end = isKey(g.due) ? g.due : (b ? b[1] : ctx.today);
  if (ctx.today > end) return { st: 'manque', prog, end };
  const span = Math.max(1, daysBetween(start, end) + 1);
  const el = clamp((daysBetween(start, ctx.today) + 1) / span, 0, 1);
  const risk = target === 1 ? el >= 0.6 : prog < el - 0.2;
  return { st: risk ? 'risque' : 'ok', prog, el, end };
}
const CAP_ST = { avance: { l: 'En avance', c: 'win' }, ok: { l: 'Sur la trajectoire', c: 'ok' }, risque: { l: 'À risque', c: 'risk' }, atteint: { l: 'Atteint', c: 'win' }, manque: { l: 'Échéance dépassée', c: 'loss' } };
function capStatus(s) {
  if (!s || !s.cap) return null;
  const ms = Array.isArray(s.capMilestones) ? s.capMilestones.filter(m => m && m.title) : [];
  const done = ms.filter(m => m.done).length;
  const start = isKey(s.capStart) ? s.capStart : s.start;
  const end = s.capDeadline;
  if (!isKey(end)) return { ms, done, total: ms.length, st: null };
  const left = daysBetween(ctx.today, end);
  const span = Math.max(1, daysBetween(start, end));
  const el = clamp(daysBetween(start, ctx.today) / span, 0, 1);
  const prog = ms.length ? done / ms.length : null;
  let st = null;
  if (prog === 1) st = 'atteint';
  else if (left < 0) st = 'manque';
  else if (prog !== null) st = prog >= el + 0.1 ? 'avance' : prog >= el - 0.15 ? 'ok' : 'risque';
  if (st && st !== 'atteint' && st !== 'manque' && ms.some(m => !m.done && isKey(m.due) && m.due < ctx.today)) st = 'risque';
  return { ms, done, total: ms.length, left, el, prog, st, end, start };
}

/* ---------- projets */
function projectStats(pid) {
  const qs = questArr().filter(q => q.area === pid);
  const done = qs.filter(q => q.done && isKey(q.doneDate)).sort((a, b) => b.doneDate.localeCompare(a.doneDate) || (b.doneTs || 0) - (a.doneTs || 0));
  const lastTL = done.find(q => q.kind === 'terrain' || q.kind === 'livrer') || null;
  const sinceTL = lastTL ? daysBetween(lastTL.doneDate, ctx.today) : null;
  const xp = sum(ctx.xpEv.filter(e => e.area === pid).map(e => e.xp));
  const s = ctx.seasonRef;
  const live = goalArr().filter(g => g.area === pid && ((s && g.horizon === 'saison' && g.period === s.id) || (g.horizon === 'mois' && g.period === monthOf(ctx.today)) || (g.horizon === 'semaine' && g.period === weekKeyOf(ctx.today))));
  const gProg = live.length ? avg(live.map(g => goalStatus(g).prog)) : null;
  const p = S.projects[pid];
  const st = p ? statusAt(Object.assign({ id: pid }, p), ctx.today) : null;
  const active = st === 'capitaine' || st === 'titulaire';
  let activeSince = null;
  if (active && p) {
    const log = statusLogOf(p).filter(e => e.from <= ctx.today).sort((a, b) => a.from.localeCompare(b.from));
    for (let i = log.length - 1; i >= 0; i--) { if (log[i].status === 'capitaine' || log[i].status === 'titulaire') activeSince = log[i].from; else break; }
    const s0 = ctx.seasonRef;
    if (!activeSince || activeSince < '2001-01-01') activeSince = s0 ? s0.start : ctx.today;
  }
  const idle = sinceTL === null ? (activeSince ? daysBetween(activeSince, ctx.today) : 0) : sinceTL;
  return { open: qs.filter(q => !q.done).length, done: done.length, last: done[0] || null, lastTL, sinceTL, idle, xp, goals: live, gProg, active, stagnant: active && idle >= 7, livrer: done.filter(q => q.kind === 'livrer').length };
}

/* ---------- briefing du manager : une seule observation utile */
function briefing() {
  const T = ctx.today, out = [];
  if (!ctx.season) {
    const ls = latestSeason();
    if (ls && ls.end < T) out.push({ p: 0, t: `La ${ls.name || 'saison'} est terminée. Consulte le récapitulatif et prépare la suivante.`, go: 'saison' });
    else if (!seasonList().length) out.push({ p: 0, t: 'Aucune saison configurée : crée-la dans Réglages › Saison.', go: 'reglages' });
    else { const ns = nextSeason(); if (ns) out.push({ p: 0, t: `Intersaison : coup d'envoi de la ${ns.name || 'prochaine saison'} le ${fmtDay(ns.start)}.` }); }
  }
  const cap = ctx.captain;
  if (cap) {
    const ps = projectStats(cap.id);
    if (ps.sinceTL === null && ps.idle >= 2) out.push({ p: 1, t: `${cap.name} (capitaine) : aucune action Terrain ou Livrer terminée depuis ${ps.idle} jours.`, go: 'quetes' });
    else if (ps.sinceTL >= 4) out.push({ p: 1, t: `${cap.name} (capitaine) : aucune action Terrain ou Livrer depuis ${ps.sinceTL} jours.`, go: 'quetes' });
  }
  const cs = capStatus(ctx.season);
  if (cs && cs.st === 'risque') out.push({ p: 2, t: `Cap des 90 jours à risque : ${cs.done}/${cs.total} étapes pour ${Math.round(cs.el * 100)} % du temps écoulé.` });
  const atRisk = goalsFor('semaine', weekKeyOf(T)).concat(goalsFor('mois', monthOf(T))).filter(g => goalStatus(g).st === 'risque');
  if (atRisk.length) out.push({ p: 3, t: `${plural(atRisk.length, 'objectif')} à risque : ${atRisk.slice(0, 2).map(g => '« ' + g.title + ' »').join(', ')}.`, go: 'semaine' });
  ctx.projects.forEach(p => {
    if (statusAt(p, T) !== 'titulaire') return;
    const ps = projectStats(p.id);
    if (ps.sinceTL !== null && ps.sinceTL >= 7) out.push({ p: 4, t: `${p.name} (titulaire) : rien de concret depuis ${ps.sinceTL} jours. Remplacement à envisager ?`, go: 'compo' });
  });
  const blocked = questArr().filter(isBlocked);
  if (blocked.length) out.push({ p: 5, t: `« ${blocked[0].title} » a été reportée ${blocked[0].postponed} fois : redéfinis-la ou découpe-la.`, go: 'quetes' });
  const late = questArr().filter(q => !q.done && isKey(q.due) && q.due < T);
  if (late.length >= 3) { const oldest = late.reduce((m, q) => (q.due < m.due ? q : m)); out.push({ p: 6, t: `${late.length} quêtes en retard, la plus ancienne depuis ${daysBetween(oldest.due, T)} jours.`, go: 'quetes' }); }
  const st = currentStreak();
  if (st >= 3) out.push({ p: 7, t: `Tu restes sur ${st} matchs sans défaite.` });
  const last = lastMatches(1);
  if (last.length && (last[0].t === 'D' || last[0].t === 'F')) {
    const d = getDay(last[0].k);
    const why = d && d.ft && d.ft.block ? ` Blocage noté : « ${d.ft.block} ».` : '';
    out.push({ p: 8, t: `Dernier match ${last[0].t === 'F' ? 'perdu par forfait' : 'perdu'} (${last[0].score}/100).${why}` });
  }
  const f = formOf(lastMatches(5));
  if (f.list.length) out.push({ p: 9, t: `Forme : ${f.pts} points pris sur les ${f.list.length} derniers matchs.` });
  out.sort((a, b) => a.p - b.p);
  return out[0] || { p: 99, t: 'Premier match à jouer : choisis tes 3 coups et donne le coup d’envoi.' };
}

/* ---------- statistiques */
function weekdayStats(a, b) {
  const by = [0, 1, 2, 3, 4, 5, 6].map(() => []);
  for (const k of dayRange(a, minKey(b, addDays(ctx.today, -1)))) {
    const r = dayResult(k);
    if (!counted(r) || (r.type && r.type !== 'normal' && r.type !== 'intense')) continue;
    by[weekday(k) - 1].push(Number(r.score) || 0);
  }
  return by.map((l, i) => ({ i, n: l.length, avg: avg(l) }));
}
function habitCorrelation(a, b) {
  return ctx.habits.map(h => {
    const on = [], off = [];
    for (const k of dayRange(a, minKey(b, addDays(ctx.today, -1)))) {
      if (!habitActiveOn(h, k) || !daysFor(h, k).includes(weekday(k))) continue;
      const r = dayResult(k);
      if (!counted(r)) continue;
      const d = getDay(k);
      ((d && d.h && d.h[h.id] > 0) ? on : off).push(r.t === 'V' ? 1 : 0);
    }
    return { h, due: on.length + off.length, rate: on.length + off.length ? Math.round(on.length / (on.length + off.length) * 100) : null, winOn: on.length >= 3 ? Math.round(avg(on) * 100) : null, winOff: off.length >= 3 ? Math.round(avg(off) * 100) : null };
  });
}
function balance(a, b) {
  const areas = activeAreas(b);
  return areas.map(id => {
    const ev = ctx.xpEv.filter(e => e.area === id && e.d >= a && e.d <= b);
    const allEv = ctx.xpEv.filter(e => e.area === id && e.d <= b);
    const last = allEv.length ? allEv[allEv.length - 1].d : null;
    const since = last ? daysBetween(last, b) : null;
    return { id, xp: sum(ev.map(e => e.xp)), n: ev.length, last, since, ignored: since === null || since >= 14 };
  });
}
function questsDoneIn(a, b) { return questArr().filter(q => q.done && isKey(q.doneDate) && q.doneDate >= a && q.doneDate <= b); }
function periodMetrics(a, b) {
  const rec = record(a, b);
  const done = questsDoneIn(a, b);
  let chosen = 0, pDone = 0, hDue = 0, hDone = 0;
  for (const k of dayRange(a, minKey(b, addDays(ctx.today, -1)))) {
    const r = dayResult(k);
    if (!counted(r)) continue;
    chosen += Number(r.chosen) || 0; pDone += Number(r.pDone) || 0; hDue += Number(r.hDue) || 0; hDone += Number(r.hDone) || 0;
  }
  return {
    rec, xp: xpBetween(a, b), done, livrer: done.filter(q => q.kind === 'livrer').length, terrain: done.filter(q => q.kind === 'terrain').length, fond: done.filter(q => q.kind === 'fond').length,
    coupsRate: chosen ? Math.round(pDone / chosen * 100) : null, routineRate: hDue ? Math.round(hDone / hDue * 100) : null, plan: planAdherence(a, b),
    unplanned: done.filter(q => q.planned === false).length
  };
}
function coachFacts(a, b, pa, pb) {
  const m = periodMetrics(a, b), p = periodMetrics(pa, pb);
  const L = [];
  const d = (x, y, u) => (x == null || y == null ? '' : ` (${x - y >= 0 ? '+' : ''}${fmt1(x - y)}${u || ''} vs période précédente)`);
  L.push(`Matchs : ${m.rec.J} joués, ${m.rec.V} ${rl('V')} · ${m.rec.N} ${rl('N')} · ${m.rec.D} ${rl('D')}${m.rec.F ? ` (dont ${m.rec.F} forfaits)` : ''}, ${m.rec.pts} pts.`);
  if (m.rec.avg != null) L.push(`Score moyen : ${fmt1(m.rec.avg)}/100${d(m.rec.avg, p.rec.avg)}.`);
  L.push(`XP : ${fmt(m.xp)}${d(m.xp, p.xp)}.`);
  L.push(`Quêtes terminées : ${m.done.length} (Livrer ${m.livrer}, Terrain ${m.terrain}, Fond ${m.fond})${m.unplanned ? `, dont ${m.unplanned} non planifiées` : ''}.`);
  if (m.coupsRate != null) L.push(`Coups du jour réussis : ${m.coupsRate} %.`);
  if (m.plan.pct != null) L.push(`Respect du plan (coup d'envoi) : ${m.plan.done}/${m.plan.n}, soit ${m.plan.pct} %.`);
  if (m.routineRate != null) L.push(`Routine : ${m.routineRate} %.`);
  const fm = focusMinutes(a, minKey(b, ctx.today));
  if (fm) L.push(`Focus : ${fmtMin(fm)}, ${plural(focusBlocks(a, minKey(b, ctx.today)), 'bloc terminé', 'blocs terminés')}${d(fm, focusMinutes(pa, pb), ' min')}.`);
  const wd = weekdayStats(addDays(b, -59), b).filter(x => x.n >= 2 && x.avg != null).sort((x, y) => y.avg - x.avg);
  if (wd.length >= 2) L.push(`Meilleur jour (60 j, matchs normaux) : ${JOURS[wd[0].i]} (${fmt1(wd[0].avg)}), le plus faible : ${JOURS[wd[wd.length - 1].i]} (${fmt1(wd[wd.length - 1].avg)}).`);
  const late = questArr().filter(q => !q.done && isKey(q.due) && q.due < ctx.today).length;
  if (late) L.push(`Quêtes en retard aujourd'hui : ${late}.`);
  const ign = balance(addDays(b, -29), b).filter(x => x.ignored).map(x => areaInfo(x.id).label);
  if (ign.length) L.push(`Domaines actifs sans activité depuis 14 jours ou plus : ${ign.join(', ')}.`);
  const stag = ctx.projects.filter(pr => projectStats(pr.id).stagnant).map(pr => pr.name);
  if (stag.length) L.push(`Projets actifs sans action Terrain/Livrer depuis 7 jours ou plus : ${stag.join(', ')}.`);
  const hc = habitCorrelation(addDays(b, -59), b).filter(x => x.winOn != null && x.winOff != null && x.winOn - x.winOff >= 20).sort((x, y) => (y.winOn - y.winOff) - (x.winOn - x.winOff));
  if (hc.length) L.push(`Habitude la plus liée aux victoires : « ${hc[0].h.name} » (${hc[0].winOn} % de victoires quand elle est faite, ${hc[0].winOff} % sinon).`);
  const risk = goalArr().filter(g => !g.done && goalStatus(g).st === 'risque').map(g => g.title);
  if (risk.length) L.push(`Objectifs à risque : ${risk.slice(0, 4).join(' ; ')}.`);
  return L;
}

/* ---------- trophées (rares) */
const TROPHY_DEFS = [
  { key: 'semaine-parfaite', name: 'Semaine parfaite', desc: 'Semaine complète, au moins 6 matchs, que des victoires', rep: true },
  { key: 'mois-invaincu', name: 'Mois invaincu', desc: 'Mois complet sans défaite, au moins 20 matchs', rep: true },
  { key: 'centurion', name: 'Centurion', desc: '100 matchs joués' },
  { key: 'serie-30', name: 'Série de 30', desc: '30 matchs d’affilée sans défaite' },
  { key: 'premier-euro', name: 'Premier euro', desc: 'Premier euro encaissé déclaré dans un bilan' },
  { key: 'objectif-saison', name: 'Objectif de saison', desc: 'Un objectif de saison atteint', rep: true },
  { key: 'cup', name: 'Cup remportée', desc: 'Toutes les étapes d’une Cup', rep: true },
  { key: 'cap-tenu', name: 'Cap tenu', desc: 'Toutes les étapes du cap avant l’échéance', rep: true },
  { key: 'preuve-4', name: 'Preuve continue', desc: '4 semaines d’affilée avec preuve terrain' },
  { key: 'savoir-5', name: 'Savoir appliqué', desc: '5 idées transformées en actions réelles' }
];
function detectTrophies() {
  const out = [];
  const seasons = seasonList();
  if (seasons.length) {
    const first = seasons[0].start, yest = addDays(ctx.today, -1);
    let wk = mondayOf(first);
    for (let i = 0; i < 400 && addDays(wk, 6) <= yest; i++, wk = addDays(wk, 7)) {
      const r = record(wk, addDays(wk, 6));
      if (r.J >= 6 && r.V === r.J) out.push({ id: 'semaine-parfaite:' + weekKeyOf(wk), key: 'semaine-parfaite', at: addDays(wk, 6), label: `Semaine parfaite · semaine ${isoWeek(wk).week}` });
    }
    let ym = monthOf(first);
    for (let i = 0; i < 60 && lastDayOf(ym) <= yest; i++, ym = shiftMonth(ym, 1)) {
      const r = record(firstOfMonth(ym), lastDayOf(ym));
      if (r.J >= 20 && r.D === 0) out.push({ id: 'mois-invaincu:' + ym, key: 'mois-invaincu', at: lastDayOf(ym), label: `Mois invaincu · ${monthLabel(ym)}` });
    }
    let n = 0, run = 0, hit100 = null, hit30 = null;
    for (const k of dayRange(first, yest)) {
      const r = dayResult(k);
      if (r.t === 'T') continue;
      if (!counted(r)) continue;
      n++; if (n === 100) hit100 = k;
      if (r.t === 'V' || r.t === 'N') { run++; if (run === 30 && !hit30) hit30 = k; } else run = 0;
    }
    if (hit100) out.push({ id: 'centurion', key: 'centurion', at: hit100, label: 'Centurion · 100 matchs' });
    if (hit30) out.push({ id: 'serie-30', key: 'serie-30', at: hit30, label: 'Série de 30 sans défaite' });
  }
  const weekly = arr('reviews').filter(r => r.kind === 'S' && r.done).sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const euro = weekly.find(r => Number(r.revenue) > 0);
  if (euro) out.push({ id: 'premier-euro', key: 'premier-euro', at: euro.doneDate || euro.start, label: 'Premier euro encaissé' });
  let chain = 0, prevMon = null;
  for (const r of weekly) {
    if (r.proof === true && isKey(r.start)) { chain = prevMon && addDays(prevMon, 7) === r.start ? chain + 1 : 1; prevMon = r.start; if (chain === 4) { out.push({ id: 'preuve-4', key: 'preuve-4', at: r.doneDate || r.start, label: '4 semaines d’affilée avec preuve terrain' }); break; } }
    else { chain = 0; prevMon = r.start; }
  }
  goalArr().filter(g => g.horizon === 'saison' && g.done).forEach(g => out.push({ id: 'objectif-saison:' + g.id, key: 'objectif-saison', at: g.doneDate || ctx.today, label: `Objectif de saison · ${g.title}` }));
  arr('cups').filter(c => c.done).forEach(c => out.push({ id: 'cup:' + c.id, key: 'cup', at: c.doneDate || ctx.today, label: `${c.name}` }));
  seasons.forEach(s => {
    const ms = Array.isArray(s.capMilestones) ? s.capMilestones : [];
    if (ms.length && ms.every(m => m.done && isKey(m.doneDate)) && isKey(s.capDeadline)) {
      const lastDone = ms.map(m => m.doneDate).sort().pop();
      if (lastDone <= s.capDeadline) out.push({ id: 'cap-tenu:' + s.id, key: 'cap-tenu', at: lastDone, label: `Cap tenu · ${s.name || s.id}` });
    }
  });
  const applied = arr('knowledge_items').filter(x => x.applied && isKey(x.appliedDate)).sort((a, b) => a.appliedDate.localeCompare(b.appliedDate));
  if (applied.length >= 5) out.push({ id: 'savoir-5', key: 'savoir-5', at: applied[4].appliedDate, label: '5 idées appliquées' });
  return out;
}

/* ---------- records du club */
function clubRecords(a, b) {
  const yest = minKey(b, addDays(ctx.today, -1));
  const rec = { score: null, dayXp: null, weekPts: null, weekXp: null, streak: bestStreakIn(a, b), livrerMonth: null, routineWeek: null };
  for (const k of dayRange(a, yest)) {
    const r = dayResult(k);
    if (counted(r) && (!rec.score || r.score > rec.score.v)) rec.score = { v: r.score, k };
    const x = ctx.xpByDay[k] || 0;
    if (x > 0 && (!rec.dayXp || x > rec.dayXp.v)) rec.dayXp = { v: x, k };
  }
  for (let wk = mondayOf(a), i = 0; wk <= yest && i < 400; wk = addDays(wk, 7), i++) {
    const r = record(maxKey(wk, a), minKey(addDays(wk, 6), b));
    if (r.J >= 3 && (!rec.weekPts || r.pts > rec.weekPts.v)) rec.weekPts = { v: r.pts, k: wk, J: r.J };
    const xp = xpBetween(wk, addDays(wk, 6));
    if (xp > 0 && (!rec.weekXp || xp > rec.weekXp.v)) rec.weekXp = { v: xp, k: wk };
    let due = 0, dn = 0;
    for (const k of dayRange(wk, minKey(addDays(wk, 6), yest))) { const rr = dayResult(k); if (counted(rr)) { due += Number(rr.hDue) || 0; dn += Number(rr.hDone) || 0; } }
    if (due >= 5) { const pc = Math.round(dn / due * 100); if (!rec.routineWeek || pc > rec.routineWeek.v) rec.routineWeek = { v: pc, k: wk }; }
  }
  const byM = {};
  questArr().filter(q => q.done && q.kind === 'livrer' && isKey(q.doneDate) && q.doneDate >= a && q.doneDate <= b).forEach(q => { const m = monthOf(q.doneDate); byM[m] = (byM[m] || 0) + 1; });
  Object.keys(byM).forEach(m => { if (!rec.livrerMonth || byM[m] > rec.livrerMonth.v) rec.livrerMonth = { v: byM[m], k: m }; });
  return rec;
}

/* ---------- saison */
function seasonSummary(s) {
  const end = minKey(s.end, addDays(ctx.today, -1));
  const rec = record(s.start, s.end);
  const goals = goalsFor('saison', s.id);
  let bestMonth = null;
  for (let ym = monthOf(s.start), i = 0; firstOfMonth(ym) <= end && i < 24; ym = shiftMonth(ym, 1), i++) {
    const r = record(maxKey(firstOfMonth(ym), s.start), minKey(lastDayOf(ym), s.end));
    if (r.J >= 5 && (!bestMonth || r.pct > bestMonth.pct)) bestMonth = { ym, pct: r.pct, avg: r.avg, J: r.J };
  }
  const livrer = {};
  questsDoneIn(s.start, s.end).filter(q => q.kind === 'livrer').forEach(q => { livrer[q.area] = (livrer[q.area] || 0) + 1; });
  return { rec, xp: xpBetween(s.start, s.end), streak: bestStreakIn(s.start, s.end), bestMonth, goals, goalsDone: goals.filter(g => g.done).length, livrer };
}
