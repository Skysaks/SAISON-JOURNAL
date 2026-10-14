/* =========================================================
   Performance › Semaine + blocs Objectifs, Bilans, Rapport du coach
   ========================================================= */
PERF.semaine = () => {
  const mon = mondayOf(ui.week), sun = addDays(mon, 6), wkey = weekKeyOf(mon), wk = isoWeek(mon);
  const isCur = mon === mondayOf(ctx.today);
  const m = periodMetrics(mon, sun);
  const f = formOf(lastMatches(5, minKey(sun, addDays(ctx.today, -1))));
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i));
  const strip = days.map((d, i) => {
    const r = dayResult(d);
    const lbl = r.t === 'live' ? 'En cours' : RES[r.t].l;
    return `<button type="button" class="sday res-${r.t} ${d === ctx.today ? 'is-today' : ''}" data-a="dayGo" data-k="${d}" ${d <= addDays(ctx.today, 1) ? '' : 'disabled'} aria-label="${esc(cap1(fmtDay(d)))} : ${lbl}"><span class="d">${J1[i]} ${parseKey(d).getDate()}</span><b>${r.t === 'futur' || r.t === 'T' || r.score == null ? '–' : r.score}</b><span class="r">${['avant', 'futur'].includes(r.t) ? '&nbsp;' : (r.type && r.type !== 'normal' && r.t !== 'T' ? DAY_TYPES[r.type].label : lbl)}</span></button>`;
  }).join('');
  const risk = goalsFor('semaine', wkey).find(g => goalStatus(g).st === 'risque');
  const ns = isCur ? nextStep(risk ? `Objectif à risque : ${esc(risk.title)}` : (goalsFor('semaine', wkey).length ? 'Objectifs de la semaine sur la trajectoire. Tiens le rythme.' : 'Fixe jusqu’à 3 objectifs pour la semaine.')) : '';
  const kp = kpi(m.rec.avg == null ? '–' : fmt1(m.rec.avg), 'score moyen') + `<span class="kpi"><span class="fdots">${formDots(f.list)}</span><span>forme</span></span>` + kpi('+' + fmt(m.xp), 'XP', 'gold') + kpi(`${m.rec.V}-${m.rec.N}-${m.rec.D}`, vnd()) + kpi(m.routineRate == null ? '–' : m.routineRate + ' %', 'routine') + kpi(fmtMin(focusMinutes(mon, minKey(sun, ctx.today))), 'focus');
  return `
  ${navHead(`Semaine ${wk.week}`, `${fmtRange(mon, sun)} ${parseKey(sun).getFullYear()}${isCur ? ' · en cours' : ''}`, 'data-a="weekNav" data-n="-1"', 'data-a="weekNav" data-n="1"', isCur ? '' : '<button type="button" class="btn btn-sm" data-a="weekNow">Cette semaine</button>')}
  <div class="kpis top">${kp}</div>
  <div class="view-top">${ns}</div>
  <div class="grid2">
    <div class="col">
      ${sectionCard('Matchs', `<div class="strip">${strip}</div>`, 'Touche un jour pour ouvrir son match')}
      ${goalsBlock('semaine', wkey, weekKeyOf(addDays(mon, -7)))}
      ${sectionCard('Routine de la semaine', habitGrid(days))}
    </div>
    <div class="col">
      ${sectionCard('Livraison', deliveryBlock(m), plural(m.done.length, 'quête terminée', 'quêtes terminées'))}
      ${reviewBlock('S', wkey, mon, sun)}
    </div>
  </div>`;
};

function habitGrid(days) {
  const hs = ctx.habits.filter(h => habitActiveOn(h, days[6]) || days.some(d => habitActiveOn(h, d)));
  if (!hs.length) return emptyState('Aucune habitude.', `<button type="button" class="btn btn-sm" data-a="go" data-tab="reglages" data-set="routines">Créer la routine</button>`);
  return `<div class="hgrid-wrap"><table class="hgrid"><thead><tr><th>Habitude</th>${days.map(d => `<th>${J1[weekday(d) - 1]}</th>`).join('')}<th>%</th></tr></thead><tbody>${hs.map(h => {
    let due = 0, dn = 0;
    const cells = days.map(d => {
      const isDue = habitActiveOn(h, d) && daysFor(h, d).includes(weekday(d));
      const day = getDay(d);
      const on = !!(day && day.h && day.h[h.id] > 0);
      if (!isDue) return `<td><span class="hcell off" aria-hidden="true">·</span></td>`;
      if (d <= ctx.today) { due++; if (on) dn++; }
      const miss = !on && d < ctx.today;
      return `<td><button type="button" class="hcell ${on ? 'on' : miss ? 'miss' : ''}" data-a="habit" data-id="${h.id}" data-k="${d}" ${d > ctx.today ? 'disabled' : ''} aria-label="${esc(h.name)}, ${fmtDay(d)} — ${on ? TX('fait') : 'pas fait'}">${on ? ICON.check : miss ? ICON.miss : ''}</button></td>`;
    }).join('');
    return `<tr><td>${esc(h.name)}</td>${cells}<td class="small muted">${due ? Math.round(dn / due * 100) : '–'}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function deliveryBlock(m) {
  const tot = m.done.length;
  if (!tot) return `<p class="small muted">Aucune quête terminée sur la période.</p>`;
  const col = { livrer: 'var(--accent)', terrain: 'var(--accent-mid)', fond: 'var(--line-2)' };
  const by = { livrer: m.livrer, terrain: m.terrain, fond: m.fond };
  const concret = Math.round((m.livrer + m.terrain) / tot * 100);
  const byArea = {};
  m.done.forEach(q => { const e = findEv('q:' + q.id); byArea[q.area] = (byArea[q.area] || 0) + (e ? e.e.xp : 0); });
  const maxA = Math.max(1, ...Object.values(byArea));
  return `<div class="ratio" role="img" aria-label="Livrer ${by.livrer}, Terrain ${by.terrain}, Fond ${by.fond}">${Object.keys(by).map(k => by[k] ? `<i style="width:${by[k] / tot * 100}%;background:${col[k]}"></i>` : '').join('')}</div>
    <div class="legend">${Object.keys(by).map(k => `<span><i class="sw" style="background:${col[k]}"></i>${KIND[k]} ${by[k]}</span>`).join('')}</div>
    <p class="small" style="margin-top:10px"><b>${concret} %</b> de concret (Livrer + Terrain).${concret < 50 ? ' Plus de préparation que d’exécution.' : ''}${m.unplanned ? ` ${plural(m.unplanned, 'quête non planifiée', 'quêtes non planifiées')}.` : ''}</p>
    <div class="bars" style="margin-top:12px">${Object.keys(byArea).sort((a, b) => byArea[b] - byArea[a]).map(a => `<div class="bar-row"><span>${areaChip(a)}</span><span class="xp">${fmt(byArea[a])} XP</span><div class="prog thin"><i style="width:${byArea[a] / maxA * 100}%"></i></div></div>`).join('')}</div>`;
}

/* ---------- objectifs hiérarchiques */
function goalsBlock(horizon, period, prevPeriod) {
  const list = goalsFor(horizon, period);
  const max = goalMax(horizon), full = list.length >= max;
  const rows = list.map(g => goalRow(g)).join('');
  let carry = '';
  if (prevPeriod) {
    const prevL = goalsFor(horizon, prevPeriod).filter(g => !g.done && !g.carriedTo);
    if (prevL.length) carry = `<div class="hr"></div><div class="eyebrow">Non atteints la période précédente</div><ul class="rows">${prevL.map(g => `<li><div class="grow1"><div class="title">${esc(g.title)}</div><div class="meta">${areaChip(g.area)}<span class="due">${fmt(g.current)}/${fmt(g.target)}</span></div></div><button type="button" class="btn btn-sm" data-a="goalCarry" data-id="${g.id}" data-to="${esc(period)}" ${full ? 'disabled' : ''}>Reconduire</button></li>`).join('')}</ul>`;
  }
  const fid = 'gf-' + horizon;
  const parents = horizon === 'semaine' ? ['mois', 'saison'] : horizon === 'mois' ? ['saison'] : null;
  const form = full ? `<p class="small muted" style="margin-top:10px">${max} objectifs maximum par ${HORIZON[horizon]}. Au-delà, c'est de la dispersion.</p>` : `
    <form class="formbox" data-f="goal" data-h="${horizon}" data-p="${esc(period)}">
      <div class="form-row">
        <div class="grow"><label class="lbl" for="${fid}-t">Nouvel objectif</label><input type="text" id="${fid}-t" class="draft" name="title" maxlength="140" placeholder="Un résultat vérifiable, pas une activité"></div>
        <div class="fix"><label class="lbl" for="${fid}-a">Projet ou domaine</label><select id="${fid}-a" class="draft" name="area">${areaOptions(defaultArea())}</select></div>
      </div>
      <div class="form-row">
        <div class="tiny"><label class="lbl" for="${fid}-n">Cible</label><input type="number" id="${fid}-n" class="draft" name="target" min="1" step="1" value="1"></div>
        <div class="fix"><label class="lbl" for="${fid}-u">Unité</label><input type="text" id="${fid}-u" class="draft" name="unit" maxlength="24" placeholder="ventes, contacts…"></div>
        <div class="fix"><label class="lbl" for="${fid}-d">Échéance</label><input type="date" id="${fid}-d" class="draft" name="due"></div>
        ${parents ? `<div class="grow"><label class="lbl" for="${fid}-p">Sert l'objectif</label><select id="${fid}-p" class="draft" name="parent">${goalOptions('', parents)}</select></div>` : ''}
        <button type="submit" class="btn">Ajouter</button>
      </div>
    </form>`;
  const title = horizon === 'semaine' ? 'Objectifs de la semaine' : horizon === 'mois' ? 'Objectifs du mois' : 'Objectifs de la saison';
  return sectionCard(title, `${rows || `<p class="small muted">Aucun objectif pour cette période.</p>`}${carry}${form}`, `${list.filter(g => g.done).length}/${list.length} atteints · max ${max}`);
}
function goalRow(g) {
  const target = Math.max(1, Number(g.target) || 1), cur = Math.max(0, Number(g.current) || 0);
  const st = goalStatus(g);
  const parent = g.parent && S.goals[g.parent] ? `<span class="link-chip" title="Objectif parent">↳ ${esc(S.goals[g.parent].title)}</span>` : '';
  const kids = goalArr().filter(x => x.parent === g.id).length;
  const qs = questArr().filter(q => q.goal === g.id);
  const binary = target === 1;
  return `<div class="goal ${g.done ? 'is-done' : ''}">
    <div class="goal-main"><div class="title">${esc(g.title)}</div>
      <div class="meta">${areaChip(g.area)}${pill(GOAL_ST[st.st].l, GOAL_ST[st.st].c)}${isKey(st.end) ? `<span class="due">échéance ${fmtShort(st.end)}</span>` : ''}${parent}${kids ? `<span class="muted small">${plural(kids, 'sous-objectif')}</span>` : ''}${qs.length ? `<span class="muted small">${qs.filter(q => q.done).length}/${qs.length} quêtes</span>` : ''}<span class="xp">${g.done ? '+' : ''}${fmt(xpv(goalXpKey(g.horizon)))} XP</span></div>
    </div>
    <div class="goal-act">
      ${binary ? checkBtn(!!g.done, `data-a="goalStep" data-id="${g.id}" data-n="${g.done ? -1 : 1}"`, g.title) : `<span class="goal-num">${fmt(cur)}/${fmt(target)}${g.unit ? ` <small>${esc(g.unit)}</small>` : ''}</span><span class="stepper"><button type="button" class="iconbtn" data-a="goalStep" data-id="${g.id}" data-n="-1" aria-label="Retirer 1" ${cur <= 0 ? 'disabled' : ''}>−</button><button type="button" class="iconbtn" data-a="goalStep" data-id="${g.id}" data-n="1" aria-label="Ajouter 1">+</button></span>`}
      ${delBtn('goals', g.id)}
    </div>
    ${binary ? '' : `<div class="prog ${g.done ? 'done' : ''}"><i style="width:${Math.min(100, cur / target * 100)}%"></i></div>`}
  </div>`;
}

/* ---------- bilans + rapport du coach */
const REVIEW_Q = {
  S: [['win', 'Victoire de la semaine'], ['block', 'Blocage principal'], ['next', 'Le seul objectif qui compte la semaine prochaine']],
  M: [['stop', "J'arrête"], ['start', 'Je commence'], ['keep', 'Je continue'], ['compo', 'Décision de compo pour le mois prochain']],
  A: [['best', 'Meilleur souvenir de la saison'], ['learn', "Ce que la saison m'a appris"], ['next', 'Décision principale pour la saison suivante']]
};
const REVIEW_XP = { S: 'reviewS', M: 'reviewM', A: 'reviewA' };
function prevPeriodOf(kind, a, b) {
  if (kind === 'S') return [addDays(a, -7), addDays(a, -1)];
  if (kind === 'M') { const pm = shiftMonth(monthOf(a), -1); return [firstOfMonth(pm), lastDayOf(pm)]; }
  const len = daysBetween(a, b);
  return [addDays(a, -len - 1), addDays(a, -1)];
}
function autoMetrics(kind, a, b) {
  const m = periodMetrics(a, b);
  const [pa, pb] = prevPeriodOf(kind, a, b);
  const p = periodMetrics(pa, pb);
  return {
    J: m.rec.J, V: m.rec.V, N: m.rec.N, D: m.rec.D, pts: m.rec.pts, avg: m.rec.avg == null ? null : Math.round(m.rec.avg * 10) / 10,
    best: m.rec.best, worst: m.rec.worst, xp: m.xp, livrer: m.livrer, terrain: m.terrain,
    dAvg: m.rec.avg != null && p.rec.avg != null ? Math.round((m.rec.avg - p.rec.avg) * 10) / 10 : null, dXp: m.xp - p.xp, dPts: m.rec.pts - p.rec.pts
  };
}
function autoHtml(au) {
  const sg = x => (x > 0 ? '+' : '') + fmt1(x);
  return `<div class="auto">
    <div class="rep-grid">${kpi(au.avg == null ? '–' : fmt1(au.avg), 'score moyen')}${kpi(`${au.V}-${au.N}-${au.D}`, vnd())}${kpi('+' + fmt(au.xp), 'XP', 'gold')}${kpi(au.livrer, 'livrées')}${kpi(au.terrain, 'terrain')}</div>
    <p class="small">${au.best ? `Meilleur match : ${esc(fmtDayShort(au.best.k))} (${au.best.score}). ` : ''}${au.worst && au.J > 1 ? `Pire match : ${esc(fmtDayShort(au.worst.k))} (${au.worst.score}). ` : ''}</p>
    <p class="small muted">Vs période précédente : score moyen ${au.dAvg == null ? 'n.c.' : sg(au.dAvg)}, points ${sg(au.dPts)}, XP ${sg(au.dXp)}.</p>
  </div>`;
}
function reviewBlock(kind, period, a, b) {
  const id = `${kind}-${period}`;
  const r = S.reviews[id] || null;
  const ans = (r && r.answers) || {};
  const title = kind === 'S' ? 'Bilan de la semaine' : kind === 'M' ? 'Bilan du mois' : 'Bilan de la saison';
  const au = autoMetrics(kind, a, b);
  let proof = '';
  if (kind === 'S') {
    const pv = id in ui.proof ? ui.proof[id] : (r ? r.proof : null);
    proof = `<div><span class="lbl">Preuve terrain cette semaine ?</span><div class="toggle2"><button type="button" class="btn btn-sm ${pv === true ? 'sel' : ''}" aria-pressed="${pv === true}" data-a="proof" data-id="${id}" data-v="1">Oui</button><button type="button" class="btn btn-sm ${pv === false ? 'sel' : ''}" aria-pressed="${pv === false}" data-a="proof" data-id="${id}" data-v="0">Non</button></div><p class="small muted" style="margin-top:4px">Un fait extérieur qui valide un projet : une vente, un oui, un rendez-vous obtenu, une publication.</p></div>
    <div><label class="lbl" for="rv-${id}-rev">€ encaissés cette semaine</label><input type="text" inputmode="decimal" id="rv-${id}-rev" class="draft" name="revenue" value="${r && r.revenue != null ? esc(r.revenue) : ''}" placeholder="0"></div>`;
  }
  const qs = REVIEW_Q[kind].map(([q, l]) => `<div><label class="lbl" for="rv-${id}-${q}">${l}</label><textarea id="rv-${id}-${q}" class="draft" name="${q}" maxlength="800" rows="2">${esc(ans[q] || '')}</textarea></div>`).join('');
  return sectionCard(title, `${autoHtml(au)}
    <form class="stack" data-f="review" data-id="${id}" data-kind="${kind}" data-period="${esc(period)}" data-start="${a}" data-end="${b}">
      ${proof}${qs}
      <div><button type="submit" class="btn btn-primary">${r && r.done ? 'Mettre à jour' : 'Valider le bilan'}</button></div>
    </form>
    ${coachBlock(id, kind, a, b)}`, r && r.done ? pill(`Fait · +${xpv(REVIEW_XP[kind])} XP`, 'win') : `+${xpv(REVIEW_XP[kind])} XP`);
}
function coachBlock(id, kind, a, b) {
  const r = S.reviews[id] || {};
  const saved = r.coach || null;
  const st = ui.coach[id] || null;
  const facts = st && st.facts ? st.facts : (saved && saved.facts) || null;
  const interp = st && st.text ? st.text : (saved && saved.interp) || '';
  const running = st && st.status === 'thinking';
  const canAsk = !!sampleFn && !sampleOff;
  return `<div class="hr"></div>
    <div class="card-h" style="margin-bottom:6px"><h2 class="h3">Rapport du coach</h2><span class="row-wrap">${`<button type="button" class="btn btn-sm" data-a="coachFacts" data-id="${id}" data-kind="${kind}" data-a1="${a}" data-b1="${b}">${facts ? 'Recalculer' : 'Générer'}</button>`}${facts && canAsk ? (running ? '<button type="button" class="btn btn-sm" data-a="coachStop">Arrêter</button>' : `<button type="button" class="btn btn-sm" data-a="coachInterp" data-id="${id}">${interp ? 'Nouvelle interprétation' : 'Interprétation par Claude'}</button>`) : ''}</span></div>
    ${facts ? `<div class="coach"><div class="eyebrow">Chiffres (données enregistrées)</div><ul class="facts">${facts.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${interp || running ? `<div class="eyebrow" style="margin-top:10px">Interprétation (Claude, à partir de ces chiffres uniquement)</div><div class="debrief" id="coach-out-${id}">${esc(interp || 'Réflexion…')}</div>` : ''}
      ${st && st.note ? `<p class="small muted">${esc(st.note)}</p>` : ''}
      ${!canAsk ? '<p class="small muted">L’interprétation par Claude est disponible quand la page est ouverte dans Claude.</p>' : ''}</div>`
    : '<p class="small muted">Le coach analyse uniquement ce qui est enregistré : jours forts, surcharge, domaines négligés, projets qui stagnent, habitudes liées aux victoires, objectifs à risque.</p>'}`;
}
