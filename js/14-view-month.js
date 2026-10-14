/* =========================================================
   Performance › Mois : calendrier interactif, tendances, trésorerie, bilan
   ========================================================= */
PERF.mois = () => {
  const ym = ui.month, a = firstOfMonth(ym), b = lastDayOf(ym);
  const isCur = ym === monthOf(ctx.today);
  const m = periodMetrics(a, b);
  const pm = periodMetrics(firstOfMonth(shiftMonth(ym, -1)), lastDayOf(shiftMonth(ym, -1)));
  const offset = weekday(a) - 1;
  let cells = J1.map(j => `<div class="cal-h">${j}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += `<div class="cday blank" aria-hidden="true"></div>`;
  for (const k of dayRange(a, b)) {
    const r = dayResult(k);
    const ok = k <= addDays(ctx.today, 1);
    const show = !['futur'].includes(r.t) && !(r.t === 'avant' && !hasPlay(getDay(k)));
    const lbl = `${cap1(fmtDay(k))} : ${r.t === 'live' ? 'en cours' : RES[r.t].l}${show && r.score != null ? ', ' + r.score : ''}`;
    cells += `<button type="button" class="cday res-${r.t} ${k === ctx.today ? 'is-today' : ''}" data-a="dayGo" data-k="${k}" ${ok ? '' : 'disabled'} aria-label="${esc(lbl)}" data-tip="${esc(lbl)}"><span class="n">${parseKey(k).getDate()}</span><span class="rl">${show && RES[r.t].s && RES[r.t].s !== '·' ? rl(r.t) : ''}</span><span class="s">${show && r.score != null ? r.score : ''}</span></button>`;
  }
  // meilleure semaine du mois
  let bestW = null;
  for (let wk = mondayOf(a); wk <= b; wk = addDays(wk, 7)) {
    const r = record(maxKey(wk, a), minKey(addDays(wk, 6), b));
    if (r.J >= 2 && (!bestW || r.pts > bestW.pts || (r.pts === bestW.pts && (r.avg || 0) > (bestW.avg || 0)))) bestW = { wk, pts: r.pts, avg: r.avg, J: r.J };
  }
  const areaXp = {};
  ctx.xpEv.filter(e => e.d >= a && e.d <= b && e.area).forEach(e => { areaXp[e.area] = (areaXp[e.area] || 0) + e.xp; });
  const topA = Object.keys(areaXp).sort((x, y) => areaXp[y] - areaXp[x]).slice(0, 3);
  const compo = logItems(a, b, 'compo');
  const trend = m.rec.avg != null && pm.rec.avg != null ? m.rec.avg - pm.rec.avg : null;
  // prochaine échéance
  const nextDue = questArr().filter(q => !q.done && isKey(q.due) && q.due >= ctx.today).sort((x, y) => x.due.localeCompare(y.due))[0];
  const nextGoal = goalsFor('mois', ym).filter(g => !g.done).sort((x, y) => String(goalStatus(x).end).localeCompare(String(goalStatus(y).end)))[0];
  const ns = isCur ? nextStep(nextDue ? `Prochaine échéance : ${esc(nextDue.title)} (${fmtDayShort(nextDue.due)})` : nextGoal ? `Objectif du mois : ${esc(nextGoal.title)}` : 'Aucune échéance à venir.') : '';
  const kp = kpi(m.rec.avg == null ? '–' : fmt1(m.rec.avg), 'score moyen') + kpi(trend == null ? '–' : (trend > 0 ? '+' : '') + fmt1(trend), 'tendance') + kpi('+' + fmt(m.xp), 'XP', 'gold') + kpi(`${m.rec.V}-${m.rec.N}-${m.rec.D}`, vnd()) + kpi(m.rec.winRate == null ? '–' : m.rec.winRate + ' %', 'victoires');
  return `
  ${navHead(esc(cap1(monthLabel(ym))), isCur ? 'Mois en cours' : 'Mois', 'data-a="monthNav" data-n="-1"', 'data-a="monthNav" data-n="1"', isCur ? '' : '<button type="button" class="btn btn-sm" data-a="monthNow">Ce mois-ci</button>')}
  <div class="kpis top">${kp}</div>
  <div class="view-top">${ns}</div>
  <div class="grid2">
    <div class="col">
      ${sectionCard('Calendrier', `<div class="cal">${cells}</div><div class="legend">${legendRes()}</div>`, `Victoire ≥ ${R().score.win} · nul ≥ ${R().score.draw}`)}
      ${goalsBlock('mois', ym, shiftMonth(ym, -1))}
      ${sectionCard('Faits du mois', `<ul class="facts">
        <li>Meilleure semaine : ${bestW ? `semaine ${isoWeek(bestW.wk).week} (${bestW.pts} pts en ${bestW.J} matchs${bestW.avg != null ? `, ${fmt1(bestW.avg)} de moyenne` : ''})` : 'pas encore assez de matchs'}.</li>
        <li>Domaines les plus actifs : ${topA.length ? topA.map(x => `${esc(areaInfo(x).label)} (${fmt(areaXp[x])} XP)`).join(', ') : TX('aucun')}.</li>
        <li>Quêtes livrées : ${m.livrer} · actions terrain : ${m.terrain} · fond : ${m.fond}.</li>
        <li>Décisions de compo : ${compo.length ? compo.map(c => `${fmtShort(c.date)} ${esc(c.text)}`).join(' ; ') : TX('aucune')}.</li>
      </ul>`)}
    </div>
    <div class="col">
      ${financeCard(a, b)}
      ${reviewBlock('M', ym, a, b)}
    </div>
  </div>`;
};
function legendRes() {
  return `<span><i class="sw" style="background:var(--win)"></i>Victoire</span><span><i class="sw" style="background:var(--draw-c)"></i>Nul</span><span><i class="sw" style="background:var(--loss)"></i>Défaite</span><span><i class="sw" style="background:var(--rest)"></i>Trêve</span><span><i class="sw" style="background:var(--accent)"></i>Aujourd'hui</span>`;
}
function financeCard(a, b) {
  const f = S.finance.main || {};
  const has = f.cash != null && f.burn != null;
  const net = (Number(f.income) || 0) - (Number(f.burn) || 0);
  let rw = `<p class="small muted" style="margin-top:10px">Renseigne disponible et dépenses pour voir combien de mois tu tiens.</p>`;
  if (has) {
    if (net >= 0) rw = `<div class="runway good"><b>Autonome</b><span class="small muted">Tes revenus couvrent tes dépenses.</span></div>`;
    else {
      const months = Number(f.cash) / -net;
      const end = parseKey(ctx.today); end.setDate(end.getDate() + Math.floor(Math.max(0, months) * 30.44));
      const cls = months < 3 ? 'crit' : months < 6 ? 'warn' : 'good';
      rw = `<div class="runway ${cls}"><b>${fmt1(Math.max(0, months))} mois</b><span class="small muted">de marge, soit jusqu'à ${MOIS[end.getMonth()]} ${end.getFullYear()} au rythme actuel</span></div>`;
    }
  }
  const v = x => (x == null ? '' : esc(String(x)));
  const weekly = arr('reviews').filter(r => r.kind === 'S' && r.done && isKey(r.start) && r.start >= a && r.start <= b);
  const rev = sum(weekly.map(r => Number(r.revenue) || 0));
  return sectionCard('Trésorerie', `<div class="fin">
      <div><label class="lbl" for="fin-cash">Disponible (€)</label><input type="text" inputmode="decimal" id="fin-cash" data-c="fin" data-field="cash" value="${v(f.cash)}" placeholder="0"></div>
      <div><label class="lbl" for="fin-inc">Revenus / mois</label><input type="text" inputmode="decimal" id="fin-inc" data-c="fin" data-field="income" value="${v(f.income)}" placeholder="0"></div>
      <div><label class="lbl" for="fin-burn">Dépenses / mois</label><input type="text" inputmode="decimal" id="fin-burn" data-c="fin" data-field="burn" value="${v(f.burn)}" placeholder="0"></div>
    </div>
    ${has ? `<p class="small" style="margin-top:10px">Net mensuel : <b class="${net < 0 ? 'neg' : 'pos'}">${net > 0 ? '+' : ''}${fmt(net)} €</b></p>` : ''}
    ${rw}
    <div class="hr"></div>
    <div class="kpis">${kpi(fmt(rev) + ' €', 'encaissés (bilans hebdo)')}${kpi(`${weekly.filter(r => r.proof === true).length}/${weekly.length}`, 'semaines avec preuve')}</div>`, f.updatedAt ? `Mis à jour le ${fmtShort(f.updatedAt)}` : '');
}
