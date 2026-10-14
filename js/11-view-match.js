/* =========================================================
   Écran Match : score, 3 coups, routine, briefing, cap, Full Time
   ========================================================= */
VIEWS.match = () => {
  const k = ui.day, T = ctx.today;
  const dayRaw = getDay(k);
  const day = normDay(dayRaw);
  const r = dayResult(k);
  if (!seasonList().length) return onboardingHtml();
  const cards = {
    match: matchCard(k, day, r), coups: coupsCard(k, day, r), routine: routineCard(k, day, r),
    side: secondaryCard(k, day), brief: briefCard(), cap: capCard(seasonAt(k) || ctx.seasonRef), ft: fullTimeCard(k, day),
    focus: focusCard(k), mood: k === T ? moodReminderCard() : '',
    agent: k === T ? agentCard() : '',
    tomorrow: k === T && day.ft && day.ft.closedTs ? tomorrowCard(k) : ''
  };
  const ids = (day.coups || []).filter(id => S.quests[id]);
  const nextQ = ids.map(id => Object.assign({ id }, S.quests[id])).find(q => !q.done);
  let ns = '';
  if (k === T) {
    if (dayType(dayRaw) === 'treve') ns = nextStep('Trêve : récupère. Le match ne compte pas.');
    else if (!ids.length) ns = nextStep('Choisis tes coups du jour.', `<a class="btn btn-sm" href="#coups" data-a="scrollTo" data-id="coups">Choisir</a>`);
    else if (nextQ) ns = nextStep(`${esc(nextQ.title)}`, checkBtn(false, `data-a="slotToggle" data-id="${nextQ.id}" data-k="${k}"`, 'Terminer : ' + nextQ.title));
    else if (!(day.ft && day.ft.closedTs)) ns = nextStep('Les coups sont joués : siffle la fin du match (Full Time).', `<a class="btn btn-sm" href="#fulltime" data-a="scrollTo" data-id="fulltime">Full Time</a>`);
    else ns = nextStep('Match clôturé. Prépare les coups de demain.', `<button type="button" class="btn btn-sm" data-a="dayGo" data-k="${addDays(T, 1)}">Demain</button>`);
  }
  const body = isWide()
    ? `<div class="grid2"><div class="col">${cards.match}${cards.coups}${cards.routine}${cards.ft}${cards.tomorrow}</div><div class="col">${cards.brief}${cards.agent}${cards.focus}${cards.mood}${cards.cap}${cards.side}</div></div>`
    : `<div class="col">${cards.match}${cards.coups}${cards.focus}${cards.routine}${cards.side}${cards.brief}${cards.agent}${cards.mood}${cards.cap}${cards.ft}${cards.tomorrow}</div>`;
  return `<div class="view-top">${ns}${k === T ? startCard() : ''}</div>${body}`;
};

function journeeNumber(k) {
  const s = seasonAt(k);
  return s ? daysBetween(s.start, k) + 1 : null;
}
function partsLine(r) {
  if (!r.parts) return '';
  const p = r.parts, f = x => Math.round(x);
  const bits = [];
  if (p.coups) bits.push(`Coups ${f(p.coups.got)}/${f(p.coups.max)}`);
  if (p.routine) bits.push(`Routine ${f(p.routine.got)}/${f(p.routine.max)}`);
  bits.push(`Clôture ${f(p.close.got)}/${f(p.close.max)}`);
  return bits.join(' · ');
}
function matchCard(k, day, r) {
  const T = ctx.today, isToday = k === T, isFuture = k > T, isPast = k < T;
  const res = RES[r.t] || RES.live;
  const type = dayType(getDay(k));
  const sc = R().score;
  const jn = journeeNumber(k);
  const cls = r.t === 'live' ? RES[r.prov].c : res.c;
  const scoreTxt = r.t === 'T' || isFuture || r.score == null ? '–' : r.score;
  const xpDay = xpOn(k);
  // sélecteur de type
  const trevesUsed = trevesInWeek(k, k);
  const restMax = Number((seasonAt(k) || {}).restPerWeek);
  const restCap = Number.isFinite(restMax) ? restMax : 1;
  let typeCtl;
  if (isPast) {
    typeCtl = `<span class="chip strong">${DAY_TYPES[type].label}</span>${type !== 'imprevu' && type !== 'treve' && seasonAt(k) ? `<button type="button" class="btn btn-xs btn-ghost" data-a="markImprevu" data-k="${k}">Déclarer un imprévu</button>` : ''}`;
  } else {
    typeCtl = `<label class="sr" for="dt-${k}">Type de match</label><select id="dt-${k}" class="sel-type" data-c="dayType" data-k="${k}">${Object.keys(DAY_TYPES).map(t => {
      const dis = t === 'treve' && type !== 'treve' && trevesUsed >= restCap;
      return `<option value="${t}"${t === type ? ' selected' : ''}${dis ? ' disabled' : ''}>${DAY_TYPES[t].label}${dis ? ' (quota atteint)' : ''}</option>`;
    }).join('')}</select><span class="muted small">${esc(DAY_TYPES[type].hint)}</span>`;
  }
  let lower = '';
  if (isPast) lower = postMatchReport(k, day, r);
  else if (type !== 'treve') lower = preMatch(k, day);
  const outOfSeason = !seasonAt(k) ? `<p class="small muted">Hors saison : ce jour ne compte pas au bilan.</p>` : '';
  return `<section class="card match" id="match">
    <div class="match-date">
      <button type="button" class="iconbtn" data-a="dayNav" data-n="-1" aria-label="Jour précédent">${ICON.left}</button>
      <div class="grow"><div class="eyebrow">${isToday ? "Aujourd'hui" : isFuture ? 'Demain' : 'Match passé'}${jn ? ` · journée ${jn}` : ''} · semaine ${isoWeek(k).week}</div><h1 class="match-title">${esc(cap1(fmtDay(k)))}</h1></div>
      <button type="button" class="iconbtn" data-a="dayNav" data-n="1" aria-label="Jour suivant" ${k >= addDays(T, 1) ? 'disabled' : ''}>${ICON.right}</button>
      ${isToday ? '' : `<button type="button" class="btn btn-sm" data-a="dayGo" data-k="${T}">Aujourd'hui</button>`}
    </div>
    <div class="type-row">${typeCtl}</div>
    <div class="match-score">
      <div class="score-num ${cls}" ${typeof scoreTxt === 'number' ? `data-count="score-${k}" data-to="${scoreTxt}" data-pulse="1"` : ''} aria-label="Score ${scoreTxt} sur 100">${typeof scoreTxt === 'number' ? fmt(scoreTxt) : scoreTxt}</div>
      <div class="score-meta">
        <div class="row-wrap">${pill(r.t === 'live' ? 'En cours' : res.l, res.c)}${r.t === 'live' ? `<span class="small muted">Tendance : ${RES[r.prov].l.toLowerCase()}</span>` : ''}${r.edited ? pill('Corrigé', 'pre') : ''}</div>
        ${r.t === 'T' ? '<p class="small muted">Match neutre : ni victoire ni défaite, la série continue.</p>' : `<div class="scale" aria-hidden="true"><i style="width:${isFuture ? 0 : clamp(Number(r.score) || 0, 0, 100)}%"></i><u style="left:${sc.draw}%"></u><u style="left:${sc.win}%"></u></div>
        <div class="scale-lg"><span>0</span><span>Nul ${sc.draw}</span><span>Victoire ${sc.win}</span><span>100</span></div>
        <div class="small muted">${partsLine(r)} · <span class="xp">+${fmt(xpDay)} XP</span></div>`}
      </div>
    </div>
    ${outOfSeason}
    ${lower}
  </section>`;
}
function preMatch(k, day) {
  const ko = day.ko;
  if (ko && ko.ts) {
    return `<div class="ko-done"><span class="pill pill-live">Coup d'envoi ${timeOf(ko.ts)}</span><span class="small muted">Plan figé : ${plural((ko.coups || []).length, 'coup')}${ko.energy ? ` · énergie prévue ${ko.energy}/5` : ''}${ko.goal && S.goals[ko.goal] ? ` · objectif : ${esc(S.goals[ko.goal].title)}` : ''}</span>${k === ctx.today ? `<button type="button" class="btn btn-xs btn-ghost" data-a="koUndo" data-k="${k}">Annuler</button>` : ''}</div>`;
  }
  const pre = day.pre || {};
  return `<div class="prematch">
    <div class="eyebrow">Avant-match</div>
    <div class="pm-grid">
      <div><span class="lbl">Énergie prévue</span><div class="seg" role="group" aria-label="Énergie prévue">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="${pre.energy === v ? 'on' : ''}" aria-pressed="${pre.energy === v}" data-a="preEnergy" data-v="${v}" data-k="${k}">${v}</button>`).join('')}</div></div>
      <div class="grow"><label class="lbl" for="pg-${k}">Objectif prioritaire</label><select id="pg-${k}" data-c="preGoal" data-k="${k}">${goalOptions(pre.goal)}</select></div>
    </div>
    <div class="row-wrap"><button type="button" class="btn btn-primary" data-a="kickoff" data-k="${k}">Coup d'envoi</button><span class="small muted">Fige le plan (coups, type, énergie) pour mesurer ensuite prévu contre réalisé. Facultatif.</span></div>
  </div>`;
}
function postMatchReport(k, day, r) {
  if (!seasonAt(k)) return '';
  const ev = ctx.xpEv.filter(e => e.d === k && e.xp > 0).sort((a, b) => b.xp - a.xp);
  const best = ev[0];
  let reason = '';
  if (r.t === 'F') reason = 'Aucune saisie ce jour-là : forfait.';
  else if (r.t === 'D' || r.t === 'N') {
    const p = r.parts || {};
    const gaps = [];
    if (p.coups && p.coups.got < p.coups.max) gaps.push([p.coups.max - p.coups.got, `coups ${r.pDone}/${r.req}`]);
    if (p.routine && p.routine.got < p.routine.max) gaps.push([p.routine.max - p.routine.got, `routine ${r.hDone}/${r.hDue}`]);
    if (p.close && p.close.got < p.close.max) gaps.push([p.close.max - p.close.got, 'match non clôturé']);
    gaps.sort((a, b) => b[0] - a[0]);
    if (gaps.length) reason = `Points perdus surtout sur : ${gaps.map(g => g[1]).join(', ')}.`;
  }
  const ft = day.ft || {};
  const pl = r.planned;
  return `<div class="report">
    <div class="eyebrow">Rapport d'après-match</div>
    <div class="rep-grid">
      ${kpi(r.t === 'T' ? '–' : `${r.score}/100`, 'score')}
      ${kpi('+' + fmt(xpOn(k)), 'XP', 'gold')}
      ${r.t === 'T' ? '' : kpi(`${r.pDone || 0}/${r.req || 0}`, 'coups')}
      ${r.hDue ? kpi(`${r.hDone}/${r.hDue}`, 'routine') : ''}
      ${pl ? kpi(`${pl.done}/${pl.n}`, 'plan tenu') : ''}
    </div>
    ${best ? `<p class="small"><b>Meilleure action :</b> ${esc(best.label)} (+${fmt(best.xp)} XP)</p>` : ''}
    ${reason ? `<p class="small"><b>Analyse :</b> ${esc(reason)}</p>` : ''}
    ${ft.shipped ? `<p class="small"><b>Victoire du jour :</b> ${esc(ft.shipped)}</p>` : ''}
    ${ft.block ? `<p class="small"><b>Blocage :</b> ${esc(ft.block)}</p>` : ''}
    ${ft.adjust ? `<p class="small"><b>Ajustement :</b> ${esc(ft.adjust)}</p>` : ''}
    ${day.type === 'imprevu' && day.imprevu ? `<p class="small"><b>Imprévu :</b> ${esc(day.imprevu)}</p>` : ''}
    ${r.frozen ? `<p class="small muted">Match figé avec les règles v${(day.snap && day.snap.v) || 1}${r.edited ? ' · corrigé après coup' : ''}.</p>` : ''}
  </div>`;
}

function coupsCard(k, day, r) {
  const T = ctx.today, isFuture = k > T;
  const type = dayType(getDay(k));
  if (type === 'treve') return sectionCard('3 Coups du jour', `<p class="empty">Trêve : aucun coup exigé. Tu peux quand même avancer une quête depuis Quêtes.</p>`, '', 'coups');
  const req = typeCfg(type).coups;
  const ids = (day.coups || []).filter(id => S.quests[id]).slice(0, 3);
  const koSet = day.ko && Array.isArray(day.ko.coups) ? day.ko.coups : null;
  const slots = [0, 1, 2].map(i => (ids[i] ? slotHtml(k, ids[i], i, isFuture, koSet, i < req) : emptySlot(k, i, ids, i < req))).join('');
  const hat = (type === 'normal' || type === 'intense');
  const allDone = ids.length === 3 && ids.every(id => S.quests[id].done && S.quests[id].doneDate === k);
  let hier = '';
  if (k === T) {
    const y = getDay(addDays(T, -1));
    const left = ((y && y.coups) || []).filter(id => S.quests[id] && !S.quests[id].done && !ids.includes(id));
    if (left.length) hier = `<div class="hr"></div><div class="eyebrow">Pas terminés hier</div><ul class="rows">${left.map(id => `<li><div class="grow1"><div class="title">${esc(S.quests[id].title)}</div><div class="meta">${areaChip(S.quests[id].area)} ${kindChip(S.quests[id].kind)}</div></div><button type="button" class="btn btn-sm" data-a="pickTo" data-id="${id}" data-k="${k}" ${ids.length >= 3 ? 'disabled' : ''}>Reprendre</button></li>`).join('')}</ul>`;
  }
  const body = `<ul class="slots">${slots}</ul>
    ${hat ? `<div class="hat">${allDone ? `<b>Coup du chapeau validé · +${xpv('hat')} XP</b>` : `Les 3 coups terminés le jour même : <b>coup du chapeau +${xpv('hat')} XP</b>`}</div>` : `<div class="hat">${DAY_TYPES[type].label} : ${plural(req, 'coup requis', 'coups requis')}, les autres sont du bonus.</div>`}
    <form class="formbox" data-f="quickQuest" data-k="${k}">
      <div class="form-row">
        <div class="grow"><label class="lbl" for="qq-title">Nouvelle quête pour ce jour</label><input type="text" id="qq-title" class="draft" name="title" maxlength="160" placeholder="Un verbe et un résultat vérifiable"></div>
        <div class="fix"><label class="lbl" for="qq-area">Domaine</label><select id="qq-area" class="draft" name="area">${areaOptions(defaultArea())}</select></div>
        <div class="fix"><label class="lbl" for="qq-kind">Type</label><select id="qq-kind" class="draft" name="kind">${kindOptions(R().quests.defaultKind)}</select></div>
        <button type="submit" class="btn">Ajouter</button>
      </div>
    </form>${hier}`;
  return sectionCard('3 Coups du jour', body, `${r.pDone || 0}/${req} requis · ${Math.round(Number(R().score.wCoups) || 0)} pts`, 'coups', 'coups');
}
function slotHtml(k, id, i, isFuture, koSet, required) {
  const q = S.quests[id];
  const doneHere = questDoneBy(id, k);
  const doneLater = q.done && isKey(q.doneDate) && q.doneDate > k;
  const sub = koSet && !koSet.includes(id);
  return `<li class="slot ${doneHere ? 'is-done' : ''} ${required ? '' : 'bonus'}">
    <span class="slot-n">${i + 1}</span>
    ${checkBtn(doneHere, `data-a="slotToggle" data-id="${id}" data-k="${k}"`, q.title, isFuture || doneLater)}
    <div class="slot-body"><div class="slot-title">${esc(q.title)}</div><div class="meta">${areaChip(q.area)} ${kindChip(q.kind)} ${prioChip(q.prio)}<span class="muted small">poids ${fmt1(kindW(q.kind))}</span><span class="xp">+${doneHere ? fmt((findEv('q:' + id) || { e: { xp: 0 } }).e.xp) : questXpCalc(q, id, k, true).xp} XP</span>${sub ? pill('Remplaçant', 'pre') : ''}${required ? '' : pill('Bonus', 'pre')}${doneLater ? `<span class="due">Terminée le ${fmtShort(q.doneDate)}</span>` : ''}</div></div>
    <button type="button" class="iconbtn sm" data-a="unpick" data-id="${id}" data-k="${k}" aria-label="Retirer des coups du jour">${ICON.x}</button>
  </li>`;
}
function emptySlot(k, i, ids, required) {
  const open = questArr().filter(q => !q.done && !ids.includes(q.id))
    .sort((a, b) => areaInfo(b.area).mult - areaInfo(a.area).mult || (PRIO_RANK[a.prio] ?? 2) - (PRIO_RANK[b.prio] ?? 2) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
  if (!open.length) return `<li class="slot empty"><span class="slot-n">${i + 1}</span><span class="muted small">Aucune quête ouverte : ajoute-en une ci-dessous.</span></li>`;
  const groups = {};
  open.forEach(q => { const a = areaInfo(q.area).label; (groups[a] = groups[a] || []).push(q); });
  const opts = Object.keys(groups).map(g => `<optgroup label="${esc(g)}">${groups[g].map(q => `<option value="${q.id}">${esc(q.title)} · ${KIND[q.kind] || 'Fond'}${q.due ? ' · ' + fmtShort(q.due) : ''}</option>`).join('')}</optgroup>`).join('');
  return `<li class="slot empty ${required ? '' : 'bonus'}"><span class="slot-n">${i + 1}</span><select id="pick-${k}-${i}" data-c="pickQuest" data-k="${k}" aria-label="Choisir le coup n° ${i + 1}"><option value="">${required ? 'Choisir une quête…' : 'Coup bonus (facultatif)…'}</option>${opts}</select></li>`;
}
