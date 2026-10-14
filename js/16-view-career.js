/* =========================================================
   Performance › Carrière (niveau, saisons, trophées, records)
   et › Analyses (écran dédié, hors page d'accueil)
   ========================================================= */
PERF.carriere = () => {
  const lv = ctx.lv;
  const seasons = seasonList();
  const first = seasons.length ? seasons[0].start : ctx.today;
  const all = record(first, ctx.today);
  const div = division();
  const ladder = TITLES.slice().reverse().map(([n, t]) => `<li class="${lv.L >= n ? 'reached' : ''} ${lv.title === t ? 'cur' : ''}"><b>${esc(t)}</b><span>niv. ${n} · ${fmt(50 * n * (n - 1))} XP</span></li>`).join('');
  const rows = seasons.map(s => { const r = record(s.start, s.end); return `<tr><td>${esc(s.name || s.id)}</td><td>${r.J}</td><td>${r.V}</td><td>${r.N}</td><td>${r.D}</td><td class="pts">${r.pts}</td><td>${r.avg == null ? '–' : fmt1(r.avg)}</td><td>${fmt(xpBetween(s.start, s.end))}</td></tr>`; }).join('');
  const got = arr('achievements').sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const cabinet = TROPHY_DEFS.map(d => {
    const mine = got.filter(x => x.key === d.key);
    return `<div class="tr ${mine.length ? 'got' : ''}"><b>${esc(d.name)}</b><span>${esc(d.desc)}</span><span class="tr-v">${mine.length ? (d.rep ? `×${mine.length} · dernier le ${fmtShort(mine[0].at)}` : `le ${fmtShort(mine[0].at)}`) : 'À conquérir'}</span></div>`;
  }).join('');
  const rc = clubRecords(first, ctx.today);
  const recs = [
    ['Plus haut score de match', rc.score ? `${rc.score.v}/100` : '–', rc.score ? fmtDayShort(rc.score.k) : ''],
    ['Plus gros XP sur une journée', rc.dayXp ? `${fmt(rc.dayXp.v)} XP` : '–', rc.dayXp ? fmtDayShort(rc.dayXp.k) : ''],
    ['Meilleure semaine (points)', rc.weekPts ? `${rc.weekPts.v} pts` : '–', rc.weekPts ? `semaine ${isoWeek(rc.weekPts.k).week}` : ''],
    ['Meilleure semaine (XP)', rc.weekXp ? `${fmt(rc.weekXp.v)} XP` : '–', rc.weekXp ? `semaine ${isoWeek(rc.weekXp.k).week}` : ''],
    ['Plus longue série sans défaite', rc.streak.n ? plural(rc.streak.n, 'match') : '–', rc.streak.end ? `fin le ${fmtShort(rc.streak.end)}` : ''],
    ['Quêtes Livrer en un mois', rc.livrerMonth ? `${rc.livrerMonth.v}` : '–', rc.livrerMonth ? monthLabel(rc.livrerMonth.k) : ''],
    ['Meilleur taux de routine (semaine)', rc.routineWeek ? `${rc.routineWeek.v} %` : '–', rc.routineWeek ? `semaine ${isoWeek(rc.routineWeek.k).week}` : '']
  ].map(([l, v, w]) => `<tr><td>${l}</td><td class="rv">${v}</td><td class="muted small">${w}</td></tr>`).join('');
  const done = questArr().filter(q => q.done);
  const stats = [
    [all.J, 'matchs joués'], [all.winRate == null ? '–' : all.winRate + ' %', TX('victoires')], [fmt(ctx.careerXp), 'XP carrière'],
    [done.filter(q => q.kind === 'livrer').length, 'quêtes livrées'], [done.filter(q => q.kind === 'terrain').length, 'actions terrain'],
    [arr('knowledge_items').filter(x => x.status === 'termine').length, 'contenus terminés'], [sum(contactArr().map(c => c.log.length)), 'échanges réseau'],
    [arr('reviews').filter(r => r.done).length, TX('bilans')]
  ].map(([v, l]) => `<div class="stat-c"><b>${v}</b><span>${l}</span></div>`).join('');
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">Carrière</div><h1>${esc(lv.title)}</h1></div></div>
  <div class="kpis top">${kpi(lv.L, 'niveau')}${kpi(fmt(ctx.careerXp), 'XP carrière', 'gold')}${kpi(fmt(ctx.seasonXp), 'XP saison')}${kpi(div.name || `${div.n}/10`, div.name ? `division · ${div.pct} % pts (30 derniers)` : 'matchs avant classement')}</div>
  <div class="grid2">
    <div class="col">
      ${sectionCard('Titres', `<ol class="ladder">${ladder}</ol>`, 'Le niveau se calcule sur l’XP de carrière, jamais remise à zéro')}
      ${sectionCard('Historique des saisons', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Saison</th><th>${rl('J')}</th><th>${rl('V')}</th><th>${rl('N')}</th><th>${rl('D')}</th><th>Pts</th><th>Rating</th><th>XP</th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="muted">Aucune saison.</td></tr>'}</tbody></table></div>`)}
      ${sectionCard('Records du club', `<div class="tbl-wrap"><table class="tbl recs"><tbody>${recs}</tbody></table></div>`)}
    </div>
    <div class="col">
      ${sectionCard('Salle des trophées', `<div class="troph">${cabinet}</div>`, plural(got.length, 'gagné'))}
      ${rewardsCard()}
      ${sectionCard('Statistiques cumulées', `<div class="stats">${stats}</div>`)}
      ${sectionCard('Divisions', `<p class="small">Ta division dépend uniquement de tes 30 derniers matchs (pourcentage des points pris). Aucun adversaire fictif.</p><ul class="facts">${DIVISIONS.map(([t, n]) => `<li${div.name === n ? ' class="cur"' : ''}>${n} : ${t} % et plus</li>`).join('')}</ul>`)}
    </div>
  </div>`;
};

/* ---------- Analyses */
PERF.analytics = () => {
  const T = ctx.today, y = addDays(T, -1);
  const r7 = record(addDays(T, -7), y), r30 = record(addDays(T, -30), y);
  const days = [];
  for (const k of dayRange(addDays(T, -29), y)) days.push(dayResult(k));
  const chart = `<div class="chart" role="img" aria-label="Score des 30 derniers jours">
    <div class="chart-plot">${[40, 70].map(v => `<i class="thr" style="bottom:${v}%"><span>${v}</span></i>`).join('')}
    ${days.map(r => { const s = counted(r) ? Number(r.score) || 0 : 0; const tip = `${cap1(fmtDay(r.k))} · ${RES[r.t].l}${counted(r) ? ' · ' + s : ''} · +${fmt(ctx.xpByDay[r.k] || 0)} XP`; return `<button type="button" class="col-b ${RES[r.t].c}" style="--h:${counted(r) ? Math.max(3, s) : 3}%" data-tip="${esc(tip)}" aria-label="${esc(tip)}" data-a="dayGo" data-k="${r.k}"></button>`; }).join('')}</div>
    <div class="chart-x"><span>${fmtShort(addDays(T, -29))}</span><span>${fmtShort(y)}</span></div></div>`;
  const wd = weekdayStats(addDays(T, -90), y);
  const wdMax = 100;
  const wdHtml = `<div class="hbars">${wd.map(x => `<div class="hbar" data-tip="${JOURS[x.i]} : ${x.avg == null ? 'pas de données' : fmt1(x.avg) + ' de moyenne sur ' + plural(x.n, 'match')}"><span class="hb-l">${cap1(JOURS_C[x.i])}</span><span class="hb-t"><i style="width:${x.avg == null ? 0 : x.avg / wdMax * 100}%"></i></span><span class="hb-v">${x.avg == null ? '–' : fmt1(x.avg)}</span></div>`).join('')}</div><p class="small muted">Matchs normaux et haute intensité uniquement, 90 derniers jours.</p>`;
  const months = [];
  for (let i = 5; i >= 0; i--) { const ym = shiftMonth(monthOf(T), -i); const r = record(firstOfMonth(ym), lastDayOf(ym)); months.push({ ym, avg: r.avg, J: r.J, xp: xpBetween(firstOfMonth(ym), lastDayOf(ym)) }); }
  const mHtml = `<div class="hbars">${months.map(m => `<div class="hbar" data-tip="${esc(monthLabel(m.ym))} : ${m.avg == null ? 'aucun match' : fmt1(m.avg) + ' de moyenne, ' + plural(m.J, 'match') + ', ' + fmt(m.xp) + ' XP'}"><span class="hb-l">${MOIS_C[Number(m.ym.slice(5)) - 1]}</span><span class="hb-t"><i style="width:${m.avg == null ? 0 : m.avg}%"></i></span><span class="hb-v">${m.avg == null ? '–' : fmt1(m.avg)}</span></div>`).join('')}</div>`;
  const pm = periodMetrics(addDays(T, -30), y);
  const types = `<div class="stats">${Object.keys(KIND).map(k => { const n = pm.done.filter(q => q.kind === k).length; const x = sum(pm.done.filter(q => q.kind === k).map(q => { const e = findEv('q:' + q.id); return e ? e.e.xp : 0; })); return `<div class="stat-c"><b>${n}</b><span>${KIND[k]} · ${fmt(x)} XP</span></div>`; }).join('')}<div class="stat-c"><b>${pm.plan.pct == null ? '–' : pm.plan.pct + ' %'}</b><span>plan tenu (${pm.plan.done}/${pm.plan.n})</span></div><div class="stat-c"><b>${pm.unplanned}</b><span>quêtes non planifiées</span></div></div>`;
  const projs = ctx.projects.filter(p => statusAt(p, T) !== 'tribune').map(p => ({ p, st: projectStats(p.id), xp30: sum(ctx.xpEv.filter(e => e.area === p.id && e.d >= addDays(T, -30)).map(e => e.xp)) }));
  const pMax = Math.max(1, ...projs.map(x => x.xp30));
  const pHtml = `<div class="hbars">${projs.map(x => `<div class="hbar" data-tip="${esc(x.p.name)} : ${fmt(x.xp30)} XP sur 30 jours"><span class="hb-l">${esc(x.p.name)}</span><span class="hb-t"><i style="width:${x.xp30 / pMax * 100}%"></i></span><span class="hb-v">${fmt(x.xp30)}</span></div><div class="hb-note">${STATUS[statusAt(x.p, T)]} · ${x.st.sinceTL === null ? 'aucune action Terrain/Livrer' : `dernière action Terrain/Livrer il y a ${x.st.sinceTL} j`}</div>`).join('')}</div>`;
  const hc = habitCorrelation(addDays(T, -60), y);
  const hHtml = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Habitude</th><th>Taux</th><th>% V si faite</th><th>% V sinon</th></tr></thead><tbody>${hc.map(x => `<tr><td>${esc(x.h.name)}</td><td>${x.rate == null ? '–' : x.rate + ' %'}</td><td>${x.winOn == null ? '–' : x.winOn + ' %'}</td><td>${x.winOff == null ? '–' : x.winOff + ' %'}</td></tr>`).join('')}</tbody></table></div><p class="small muted">60 derniers jours, au moins 3 matchs par colonne. Corrélation, pas causalité.</p>`;
  const bal = balance(addDays(T, -29), T);
  const bMax = Math.max(1, ...bal.map(x => x.xp));
  const bHtml = `<div class="hbars">${bal.map(x => `<div class="hbar ${x.ignored ? 'ign' : ''}" data-tip="${esc(areaInfo(x.id).label)} : ${fmt(x.xp)} XP sur 30 jours${x.last ? ', dernière activité le ' + fmtShort(x.last) : ', aucune activité'}"><span class="hb-l">${esc(areaInfo(x.id).label)}</span><span class="hb-t"><i style="width:${x.xp / bMax * 100}%"></i></span><span class="hb-v">${fmt(x.xp)}${x.ignored ? ' · ignoré' : ''}</span></div>`).join('')}</div><p class="small muted">Indice d'équilibre : ne pénalise jamais un match. « Ignoré » = aucune activité depuis 14 jours ou plus.</p>`;
  const cur = currentStreak(), best = bestStreakIn(seasonList().length ? seasonList()[0].start : T, T);
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">Analyses</div><h1>Tableau de performance</h1></div></div>
  <div class="kpis top">${kpi(r7.avg == null ? '–' : fmt1(r7.avg), 'score moyen 7 j')}${kpi(r30.avg == null ? '–' : fmt1(r30.avg), 'score moyen 30 j')}${kpi(r30.winRate == null ? '–' : r30.winRate + ' %', 'victoires 30 j')}${kpi('+' + fmt(xpBetween(addDays(T, -30), T)), 'XP 30 j', 'gold')}${kpi(cur, 'série en cours')}${kpi(best.n, 'série record')}</div>
  <div class="grid2">
    <div class="col">
      ${sectionCard('Score des 30 derniers jours', chart + `<div class="legend">${legendRes()}</div>`)}
      ${sectionCard('Évolution mensuelle (score moyen)', mHtml)}
      ${sectionCard('Par type de quête (30 j)', types)}
      ${sectionCard('Habitudes', hHtml)}
    </div>
    <div class="col">
      ${sectionCard('Jour de la semaine', wdHtml)}
      ${sectionCard('Par projet (30 j)', pHtml)}
      ${sectionCard('Équilibre des domaines', bHtml)}
      ${focusAnalytics(T, y)}
    </div>
  </div>`;
};

/* ---------- récompenses : ce que tu t'offres quand une condition est atteinte */
const REWARD_TYPES = { niveau: 'Niveau atteint', xp: 'XP de carrière', victoires: 'Victoires cumulées', serie: 'Plus longue série sans défaite', points: 'Points de la saison en cours', livrees: 'Quêtes Livrer terminées', focus: 'Heures de focus cumulées', trophees: 'Trophées gagnés' };
const rewardArr = () => arr('rewards').filter(r => r.title && REWARD_TYPES[r.type]).sort((a, b) => (a.claimedAt ? 1 : 0) - (b.claimedAt ? 1 : 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
function rewardStats() {
  if (ctx.rwStats) return ctx.rwStats;
  const l = seasonList();
  const months = Object.keys(S.matches).sort();
  const first = minKey(l.length ? l[0].start : ctx.today, months.length ? months[0] + '-01' : ctx.today);
  const all = record(first, ctx.today);
  const s = ctx.season;
  ctx.rwStats = {
    niveau: ctx.lv.L, xp: ctx.careerXp, victoires: all.V, serie: bestStreakIn(first, ctx.today).n,
    points: s ? record(s.start, s.end).pts : 0, livrees: questArr().filter(q => q.done && q.kind === 'livrer').length,
    focus: Math.floor(focusMinutes(first, ctx.today) / 60), trophees: arr('achievements').length
  };
  return ctx.rwStats;
}
function rewardProgress(r) {
  const cur = Number(rewardStats()[r.type]) || 0, target = Math.max(1, Number(r.target) || 1);
  return { cur, target, met: !!r.unlockedAt || cur >= target, pct: Math.min(100, cur / target * 100) };
}
function rewardsCard() {
  const list = rewardArr();
  const rows = list.map(r => {
    const p = rewardProgress(r);
    const st = r.claimedAt ? pill(`Encaissée le ${fmtShort(r.claimedAt)}`, 'pre') : p.met ? `${pill('Débloquée', 'win')}<button type="button" class="btn btn-xs btn-primary" data-a="rewardClaim" data-id="${esc(r.id)}">Encaisser</button>` : `<span class="muted small">${fmt(Math.min(p.cur, p.target))}/${fmt(p.target)}</span>`;
    return `<li class="rw ${p.met && !r.claimedAt ? 'ready' : ''}"><div class="grow1"><div class="title">${esc(r.title)}</div><div class="meta"><span class="muted small">${REWARD_TYPES[r.type]} ≥ ${fmt(p.target)}</span>${r.unlockedAt && !r.claimedAt ? `<span class="due">débloquée le ${fmtShort(r.unlockedAt)}</span>` : ''}</div>${r.claimedAt ? '' : `<div class="prog thin ${p.met ? 'done' : ''}" style="margin-top:6px"><i style="width:${p.met ? 100 : p.pct}%"></i></div>`}</div><div class="acts">${st}${delBtn('rewards', r.id)}</div></li>`;
  }).join('');
  const form = `<form class="formbox" data-f="reward"><div class="form-row">
      <div class="grow"><label class="lbl" for="rw-t">Récompense</label><input type="text" id="rw-t" class="draft" name="title" maxlength="100" placeholder="Ex. : un bon restaurant, une paire de chaussures"></div></div>
      <div class="form-row"><div class="grow"><label class="lbl" for="rw-y">Condition</label><select id="rw-y" class="draft" name="type">${Object.keys(REWARD_TYPES).map(k => `<option value="${k}">${REWARD_TYPES[k]}</option>`).join('')}</select></div>
      <div class="tiny"><label class="lbl" for="rw-n">Seuil</label><input type="number" id="rw-n" class="draft" name="target" min="1" step="1" value="10"></div>
      <button type="submit" class="btn">Ajouter</button></div></form>`;
  return sectionCard('Récompenses', `${rows ? `<ul class="rows">${rows}</ul>` : '<p class="small muted">Aucune récompense. Choisis quelque chose de réel que tu t’offriras, et la condition qui la débloque.</p>'}${form}`, `${list.filter(r => rewardProgress(r).met && !r.claimedAt).length} à encaisser`);
}
function syncRewards() {
  if (!ctx || !canWrite(true)) return;
  rewardArr().forEach(r => {
    if (r.unlockedAt) return;
    const p = rewardProgress(r);
    if (!p.met) return;
    const x = clone(S.rewards[r.id]); x.unlockedAt = ctx.today;
    if (put('rewards', r.id, x, { system: true, silent: true })) toast(`Récompense débloquée : ${r.title}`, 'xp big');
  });
}
FORM.reward = f => {
  const title = f.elements.title.value.trim(); if (!title) { toast('Nomme la récompense.'); return; }
  const type = REWARD_TYPES[f.elements.type.value] ? f.elements.type.value : 'niveau';
  const target = clamp(Math.round(num(f.elements.target.value, 1)), 1, 1000000);
  if (put('rewards', uid('rw'), { title: title.slice(0, 100), type, target, createdAt: ctx.today, unlockedAt: null, claimedAt: null })) { clearDirty(f); ctx.rwStats = null; setTimeout(syncRewards, 60); }
};
ACT.rewardClaim = b => { const r = clone(S.rewards[b.dataset.id]); if (!r) return; r.claimedAt = ctx.today; if (!r.unlockedAt) r.unlockedAt = ctx.today; if (put('rewards', b.dataset.id, r)) toast(`Encaissée : ${r.title}`); };

/* ---------- focus sur 30 jours */
function focusAnalytics(T, y) {
  const a = addDays(T, -29);
  const tot = focusMinutes(a, T), blocks = focusBlocks(a, T);
  if (!tot) return sectionCard('Focus (30 j)', '<p class="small muted">Aucun bloc de focus sur 30 jours. Le chrono est sur l’écran du jour.</p>');
  const by = {};
  for (const k of dayRange(a, T)) focusDay(k).forEach(f => { const key = f.area || '_'; by[key] = (by[key] || 0) + (Number(f.min) || 0); });
  const mx = Math.max(1, ...Object.values(by));
  const rows = Object.keys(by).sort((p, q) => by[q] - by[p]).map(k => `<div class="hbar" data-tip="${esc(k === '_' ? 'Bloc libre' : areaInfo(k).label)} : ${fmtMin(by[k])}"><span class="hb-l">${esc(k === '_' ? 'Bloc libre' : areaInfo(k).label)}</span><span class="hb-t"><i style="width:${by[k] / mx * 100}%"></i></span><span class="hb-v">${fmtMin(by[k])}</span></div>`).join('');
  return sectionCard('Focus (30 j)', `<div class="kpis" style="margin-bottom:10px">${kpi(fmtMin(tot), 'au total')}${kpi(blocks, 'blocs terminés')}${kpi(fmtMin(tot / 30), 'par jour')}</div><div class="hbars">${rows}</div>`);
}
