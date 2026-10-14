/* =========================================================
   Performance › Saison : bilan, heatmap, pyramide, Cups, fin de saison
   ========================================================= */
function viewedSeason() {
  const l = seasonList();
  if (!l.length) return null;
  if (ui.seasonId && S.seasons[ui.seasonId]) return seasonById(ui.seasonId);
  return ctx.season || latestSeason() || l[0];
}
PERF.saison = () => {
  const s = viewedSeason();
  if (!s) return onboardingHtml();
  const l = seasonList(), i = l.findIndex(x => x.id === s.id);
  const sum0 = seasonSummary(s);
  const rec = sum0.rec;
  const prevS = prevSeasonOf(s);
  const prevSum = prevS ? seasonSummary(prevS) : null;
  const ended = s.end < ctx.today;
  const kp = kpi(`${rec.J}`, rl('J')) + kpi(`${rec.V}-${rec.N}-${rec.D}`, vnd()) + kpi(rec.pts, 'pts') + kpi(rec.winRate == null ? '–' : rec.winRate + ' %', 'victoires') + kpi(rec.avg == null ? '–' : fmt1(rec.avg), 'rating', '', 'title="Score moyen des matchs : mesure uniquement la performance dans le système"') + kpi(fmt(sum0.xp), 'XP saison', 'gold');
  const cmp = prevSum ? `<p class="small muted">Vs ${esc(prevS.name || prevS.id)} : rating ${prevSum.rec.avg == null || rec.avg == null ? 'n.c.' : ((rec.avg - prevSum.rec.avg >= 0 ? '+' : '') + fmt1(rec.avg - prevSum.rec.avg))}, victoires ${rec.winRate == null || prevSum.rec.winRate == null ? 'n.c.' : ((rec.winRate - prevSum.rec.winRate >= 0 ? '+' : '') + (rec.winRate - prevSum.rec.winRate) + ' pts')}, XP ${(sum0.xp - prevSum.xp >= 0 ? '+' : '') + fmt(sum0.xp - prevSum.xp)}.</p>` : '';
  const liv = Object.keys(sum0.livrer).sort((a, b) => sum0.livrer[b] - sum0.livrer[a]).map(a => `${esc(areaInfo(a).label)} ${sum0.livrer[a]}`).join(', ');
  const facts = `<ul class="facts">
    <li>Meilleure série sans défaite : ${sum0.streak.n ? plural(sum0.streak.n, 'match') + ` (fin le ${fmtShort(sum0.streak.end)})` : '–'}.</li>
    <li>Meilleur mois : ${sum0.bestMonth ? `${monthLabel(sum0.bestMonth.ym)} (${sum0.bestMonth.pct} % des points)` : 'pas encore assez de matchs'}.</li>
    <li>Meilleur match : ${rec.best ? `${fmtDayShort(rec.best.k)} (${rec.best.score})` : '–'} · pire : ${rec.worst && rec.J > 1 ? `${fmtDayShort(rec.worst.k)} (${rec.worst.score})` : '–'}.</li>
    <li>Objectifs de saison : ${sum0.goalsDone}/${sum0.goals.length} atteints.</li>
    <li>Quêtes livrées par projet : ${liv || TX('aucune')}.</li>
  </ul>${cmp}`;
  const recap = ended ? endOfSeason(s, sum0) : '';
  return `
  ${navHead(esc(s.name || s.id), `${fmtLong(s.start)} → ${fmtLong(s.end)}${ended ? ' · terminée' : s === ctx.season || (ctx.season && ctx.season.id === s.id) ? ' · en cours' : ''}`, `data-a="seasonNav" data-n="-1" ${i <= 0 ? 'disabled' : ''}`, `data-a="seasonNav" data-n="1" ${i >= l.length - 1 ? 'disabled' : ''}`)}
  <div class="kpis top">${kp}</div>
  ${recap}
  ${sectionCard('Bilan de saison', `${heatmap(s)}${facts}`, 'Victoire 3 pts · nul 1 · défaite et forfait 0')}
  <div class="grid2" style="margin-top:16px">
    <div class="col">
      ${pyramid(s)}
      ${goalsBlock('saison', s.id, null)}
      ${cupsCard(s)}
    </div>
    <div class="col">${reviewBlock('A', s.id, s.start, s.end)}</div>
  </div>`;
};

function heatmap(s) {
  const a = s.start, b = s.end;
  const offset = weekday(a) - 1;
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<span class="hm B"></span>';
  const monthCols = [];
  let idx = offset;
  for (const k of dayRange(a, b)) {
    const d = parseKey(k);
    if (d.getDate() === 1 || k === a) monthCols.push([Math.floor(idx / 7), d.getMonth()]);
    const r = dayResult(k);
    const cls = { V: 'V', N: 'N', D: 'D', F: 'F', T: 'T', live: 'L' }[r.t] || '';
    const lbl = `${cap1(fmtDay(k))} · ${r.t === 'live' ? 'en cours' : RES[r.t].l}${r.score != null && !['futur', 'avant', 'T'].includes(r.t) ? ' · ' + r.score : ''}${ctx.xpByDay[k] ? ' · +' + ctx.xpByDay[k] + ' XP' : ''}`;
    cells += k <= addDays(ctx.today, 1)
      ? `<button type="button" class="hm ${cls}${k === ctx.today ? ' now' : ''}${ui.heatSel === k ? ' sel' : ''}" data-tip="${esc(lbl)}" aria-label="${esc(lbl)}" data-a="heatSel" data-k="${k}"></button>`
      : `<span class="hm ${cls}"></span>`;
    idx++;
  }
  const ncols = Math.ceil(idx / 7);
  const cols = monthCols.filter((m, i) => !(i === 0 && monthCols[1] && monthCols[1][0] - m[0] < 3));
  const mrow = cols.filter((m, i) => i === 0 || m[0] - cols[i - 1][0] >= 3).map(([c, m]) => `<span style="grid-column:${c + 1} / span 3">${MOIS_C[m]}</span>`).join('');
  let panel = '';
  if (ui.heatSel && ui.heatSel >= a && ui.heatSel <= b) {
    const k = ui.heatSel, r = dayResult(k), d = getDay(k) || {};
    const coups = (d.coups || []).filter(id => S.quests[id]).map(id => `<li>${questDoneBy(id, k) ? '✓' : '·'} ${esc(S.quests[id].title)}</li>`).join('');
    panel = `<div class="heat-panel"><div class="row-wrap"><b>${esc(cap1(fmtDay(k)))}</b>${pill(r.t === 'live' ? 'En cours' : RES[r.t].l, RES[r.t].c)}${r.score != null && !['futur', 'avant', 'T'].includes(r.t) ? `<span>${r.score}/100</span>` : ''}<span class="xp">+${fmt(ctx.xpByDay[k] || 0)} XP</span></div>${coups ? `<ul class="clog">${coups}</ul>` : '<p class="small muted">Aucun coup choisi.</p>'}<button type="button" class="btn btn-sm" data-a="dayGo" data-k="${k}">Ouvrir le match</button></div>`;
  }
  return `<div class="heat-wrap" id="heatwrap" data-keep-scroll><div class="heat-inner"><div class="heat-m" style="grid-template-columns:repeat(${ncols},12px)">${mrow}</div><div class="heat">${cells}</div></div></div>
    <div class="legend">${legendRes()}<span><i class="sw" style="background:var(--loss);opacity:.45"></i>Forfait</span></div>${panel}`;
}

function pyramid(s) {
  const cs = capStatus(s);
  const sg = goalsFor('saison', s.id);
  const T = ctx.today;
  const curM = monthOf(T), curW = weekKeyOf(T);
  const kidsOf = (g, h, p) => goalArr().filter(x => x.parent === g.id && x.horizon === h && (!p || x.period === p));
  const qn = g => { const qs = questArr().filter(q => q.goal === g.id); return qs.length ? ` · ${qs.filter(q => q.done).length}/${qs.length} quêtes` : ''; };
  const node = (g, lvl) => `<li class="py-${lvl}"><span class="py-dot ${goalStatus(g).st}"></span><span>${esc(g.title)}</span><span class="muted small">${GOAL_ST[goalStatus(g).st].l}${qn(g)}</span></li>`;
  const tree = sg.map(g => {
    const ms = kidsOf(g, 'mois', curM);
    const inner = ms.map(m => node(m, 2) + kidsOf(m, 'semaine', curW).map(w => node(w, 3)).join('')).join('') + kidsOf(g, 'semaine', curW).map(w => node(w, 3)).join('');
    return node(g, 1) + inner;
  }).join('');
  const orphans = goalsFor('mois', curM).concat(goalsFor('semaine', curW)).filter(g => !g.parent);
  return sectionCard('Pyramide des objectifs', `<ul class="pyr">
    <li class="py-0"><span class="eyebrow">Vision</span><span>${s.vision ? esc(s.vision) : '<span class="muted">À écrire dans Réglages › Saison</span>'}</span></li>
    ${s.cap ? `<li class="py-0"><span class="eyebrow">Cap 90 j</span><span>${esc(s.cap)}</span>${cs && cs.st ? pill(CAP_ST[cs.st].l, CAP_ST[cs.st].c) : ''}</li>` : ''}
    ${tree || '<li class="py-1 muted">Aucun objectif de saison.</li>'}
  </ul>${orphans.length ? `<p class="small muted" style="margin-top:8px">Sans objectif parent ce mois-ci : ${orphans.map(g => esc(g.title)).join(', ')}.</p>` : ''}`, 'Vision › saison › mois › semaine › quêtes');
}

function cupsCard(s) {
  const cups = arr('cups').filter(c => c.name && (!c.season || c.season === s.id)).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const html = cups.map(c => {
    const ms = Array.isArray(c.milestones) ? c.milestones : [];
    const dn = ms.filter(m => m.done).length;
    return `<div class="cup ${c.done ? 'won' : ''}"><div class="row-wrap"><b class="cup-name">${esc(c.name)}</b>${areaChip(c.area)}${c.done ? pill('Remportée', 'win') : `<span class="muted small">${dn}/${ms.length} étapes</span>`}</div>
      <ul class="rows">${ms.map(m => `<li>${checkBtn(!!m.done, `data-a="cupStep" data-id="${esc(c.id)}" data-m="${esc(m.id)}"`, m.title)}<div class="grow1"><div class="title n">${esc(m.title)}</div><div class="meta">${isKey(m.due) ? `<span class="due ${!m.done && m.due < ctx.today ? 'late' : ''}">${fmtShort(m.due)}</span>` : ''}${m.doneDate ? `<span class="due">fait le ${fmtShort(m.doneDate)}</span>` : ''}</div></div><span class="xp">+${xpv('cupStep')}</span></li>`).join('')}</ul>
      <form class="form-row" data-f="cupStepAdd" data-id="${esc(c.id)}"><div class="grow"><label class="sr" for="cm-${esc(c.id)}">Nouvelle étape</label><input type="text" id="cm-${esc(c.id)}" class="draft" name="title" maxlength="120" placeholder="Ajouter une étape"></div><button type="submit" class="btn btn-sm">Ajouter</button>${delBtn('cups', c.id)}</form></div>`;
  }).join('');
  return sectionCard('Cups', `${html || '<p class="small muted">Une Cup = un grand objectif en plusieurs étapes, qui se termine par un trophée. Secondaire par rapport au championnat quotidien.</p>'}
    <form class="formbox" data-f="cup" data-s="${esc(s.id)}"><div class="form-row"><div class="grow"><label class="lbl" for="cup-name">Nouvelle Cup</label><input type="text" id="cup-name" class="draft" name="name" maxlength="60" placeholder="Ex. : Cup de lancement"></div><div class="fix"><label class="lbl" for="cup-area">Projet</label><select id="cup-area" class="draft" name="area">${areaOptions(defaultArea())}</select></div><button type="submit" class="btn">Créer</button></div></form>`, `étape +${xpv('cupStep')} XP · Cup +${xpv('cup')} XP`);
}

function endOfSeason(s, sum0) {
  const rec = sum0.rec;
  const ns = nextSeason();
  const tro = arr('achievements').filter(x => x.season === s.id || (isKey(x.at) && x.at >= s.start && x.at <= s.end));
  return `<section class="card recap">
    <div class="eyebrow">Récapitulatif de fin de saison</div>
    <h2 class="recap-t">${esc(s.name || s.id)}</h2>
    <div class="rep-grid">${kpi(rec.J, 'matchs')}${kpi(`${rec.V}-${rec.N}-${rec.D}`, vnd())}${kpi(rec.pts, 'points')}${kpi(rec.avg == null ? '–' : fmt1(rec.avg), 'score moyen')}${kpi(fmt(sum0.xp), 'XP', 'gold')}${kpi(`${sum0.goalsDone}/${sum0.goals.length}`, 'objectifs')}${kpi(tro.length, 'trophées')}</div>
    <p class="small">${sum0.bestMonth ? `Meilleur mois : ${monthLabel(sum0.bestMonth.ym)}. ` : ''}${rec.best ? `Meilleur match : ${fmtDayShort(rec.best.k)} (${rec.best.score}). ` : ''}${sum0.streak.n ? `Série record : ${sum0.streak.n}.` : ''}</p>
    ${ns ? `<p class="small">Saison suivante prête : ${esc(ns.name || ns.id)}, coup d'envoi le ${fmtDay(ns.start)}.</p>` : `<div class="hr"></div><div class="eyebrow">Préparer la saison suivante</div><p class="small muted">Cap, dates et vision d'abord ; ensuite objectifs de saison, compo et routine. L'XP de carrière, les trophées et les records sont conservés.</p>${seasonForm(null)}`}
  </section>`;
}
