/* =========================================================
   Écran Agent de revue : constats du jour, suivi des recommandations,
   historique des revues figées, interprétation par Claude.
   ========================================================= */
const AG_TABS = [['revue', 'Revue'], ['suivi', 'Suivi'], ['historique', 'Historique']];

VIEWS.agent = () => {
  const sub = AG_TABS.some(t => t[0] === ui.agent.view) ? ui.agent.view : 'revue';
  if (!seasonList().length) return onboardingHtml();
  agentTouch();
  const F = agentScan({ withSnoozed: true });
  const live = F.filter(f => !f.snoozed);
  const st = agState();
  const crit = live.filter(f => f.sev === 'critique').length;
  const corr = live.filter(f => f.sev === 'corriger').length;
  const surv = live.filter(f => f.sev === 'surveiller').length;
  const body = sub === 'suivi' ? agFollowView() : sub === 'historique' ? agHistoryView() : agReviewView(F, live);
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">${st.lastSnap ? `Dernière revue figée le ${fmtShort(st.lastSnap)}` : 'Aucune revue figée'} · analyse recalculée à chaque ouverture</div><h1>Agent de revue</h1></div>
    <button type="button" class="btn btn-primary" data-a="agSnap">Figer la revue</button></div>
  <div class="kpis top">${kpi(crit, 'urgents', crit ? 'bad' : '')}${kpi(corr, 'à corriger')}${kpi(surv, 'à surveiller')}${kpi(agRuns().length, 'revues')}</div>
  <div class="seg-nav" role="tablist" aria-label="Agent de revue">${AG_TABS.map(([id, l]) => `<button type="button" role="tab" aria-selected="${sub === id}" data-a="agView" data-v="${id}">${l}</button>`).join('')}</div>
  ${body}`;
};

function agReviewView(F, live) {
  const good = agentGood();
  const snoozed = F.filter(f => f.snoozed);
  const prev = agLastRun();
  const now = new Set(live.map(f => f.key));
  const fixed = prev && Array.isArray(prev.findings) ? prev.findings.filter(f => !now.has(f.key)) : [];
  const groups = ['critique', 'corriger', 'surveiller'].map(sev => {
    const l = live.filter(f => f.sev === sev);
    if (!l.length) return '';
    return `<div class="eyebrow ag-h">${AG_SEV[sev].l} <span class="muted">${l.length}</span></div>${l.map(agCard).join('')}`;
  }).join('');
  const played = ctx.seasonRef ? agCounted(ctx.seasonRef.start, ctx.today).length : 0;
  const min = Number(R().agent.minMatches) || 0;
  const tooEarly = played < min;
  const head = live.length
    ? nextStep(`${esc(live[0].title)}`, live[0].fix ? agFixBtn(live[0]) : '')
    : tooEarly ? nextStep(`Encore ${plural(min - played, 'match')} à jouer avant que l’agent se prononce.`)
      : nextStep('Rien à corriger : l’agent n’a trouvé aucun écart dans les données.');
  const left = `${live.length ? `<section class="card ag-list">${groups}</section>`
    : sectionCard('Constats', emptyState(tooEarly
      ? `L’agent compare ta semaine à la précédente et tes projets à ta compo : il lui faut ${plural(min, 'match')} pour que ses seuils veuillent dire quelque chose, et il y en a ${played} pour l’instant.`
      : 'Aucun écart détecté. Soit tout est tenu, soit aucun seuil n’est franchi.'), '', 'ag-list')}
    ${fixed.length ? sectionCard('Réglé depuis la dernière revue', `<ul class="rows">${fixed.map(f => `<li><span class="st-i ok" aria-hidden="true">${ICON.check}</span><div class="grow1"><div class="title n">${esc(f.title)}</div><div class="meta"><span class="due">vu le ${fmtShort(f.since || prev.at)}</span></div></div></li>`).join('')}</ul>`, `${fixed.length}`, 'ag-fixed') : ''}
    ${snoozed.length ? sectionCard('Mis de côté', `<ul class="rows">${snoozed.map(f => `<li><div class="grow1"><div class="title n">${esc(f.title)}</div><div class="meta"><span class="due">revient le ${fmtShort(f.snoozed)}</span></div></div><button type="button" class="btn btn-xs btn-ghost" data-a="agWake" data-key="${esc(f.key)}">Remettre</button></li>`).join('')}</ul>`, `${snoozed.length}`) : ''}`;
  const right = `${sectionCard('Ce qui tient', good.length ? `<ul class="facts good">${good.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : '<p class="small muted">Pas encore de signal positif mesurable : il en faut quelques semaines.</p>', '', 'ag-good')}
    ${agInterpCard(live)}
    ${sectionCard('Comment l’agent travaille', `<p class="small">${AG_DETECTORS.length} détecteurs passent sur tes données à chaque ouverture : exécution quotidienne, projets, quêtes, objectifs, bilans, bibliothèque, réseau. Chacun a un seuil chiffré et ne se déclenche qu'au-dessus.</p>
      <p class="small muted">Il ne lit que ce qui est enregistré et n'invente aucun chiffre. « Figer la revue » garde une photo de l'état du jour : c'est elle qui permet de savoir, la fois suivante, ce qui a été réglé et ce qui traîne.</p>
      <div class="row-wrap"><button type="button" class="btn btn-sm btn-ghost" data-a="go" data-tab="reglages" data-set="agent">Réglages de l'agent</button></div>`, '', 'ag-how')}`;
  /* sans constat, la colonne de gauche serait vide : une seule colonne */
  return `<div class="view-top">${head}</div>` + (live.length || fixed.length || snoozed.length
    ? `<div class="grid2"><div class="col">${left}</div><div class="col">${right}</div></div>`
    : `<div class="col">${left}${right}</div>`);
}

function agFixBtn(f) {
  if (!f.fix) return '';
  if (f.fix.type === 'quest') return `<button type="button" class="btn btn-sm" data-a="agQuest" data-key="${esc(f.key)}">${esc(f.fix.label)}</button>`;
  const d = f.fix;
  if (d.perf) return `<button type="button" class="btn btn-sm" data-a="perf" data-v="${esc(d.perf)}">${esc(d.label)}</button>`;
  return `<button type="button" class="btn btn-sm" data-a="go" data-tab="${esc(d.tab)}"${d.set ? ` data-set="${esc(d.set)}"` : ''}>${esc(d.label)}</button>`;
}
function agCard(f) {
  const q = agQuestOf(f.key);
  return `<div class="ag-item sev-${f.sev}">
    <div class="ag-t"><span class="pill pill-${AG_SEV[f.sev].c}">${AG_SEV[f.sev].l}</span><b>${esc(f.title)}</b>${f.age >= 14 ? `<span class="due late">ouvert depuis ${plural(f.age, 'jour')}</span>` : f.age >= 3 ? `<span class="due">depuis ${plural(f.age, 'jour')}</span>` : `<span class="due">nouveau</span>`}</div>
    <p class="small">${esc(f.detail)}</p>
    <div class="row-wrap">${q ? `<span class="small">${q.done ? '✓ Quête faite' : '→ Quête ouverte'} : ${esc(q.title)}</span>` : agFixBtn(f)}<button type="button" class="btn btn-xs btn-ghost" data-a="agSnooze" data-key="${esc(f.key)}">Mettre de côté ${Number(R().agent.snoozeDays) || 14} j</button></div>
  </div>`;
}
/* quête déjà créée pour ce constat, quelle que soit la revue */
function agQuestOf(key) {
  const runs = agRuns();
  for (const r of runs) {
    const a = isObj(r.actions) ? r.actions[key] : null;
    if (a && a.questId && S.quests[a.questId]) return Object.assign({ id: a.questId }, S.quests[a.questId]);
  }
  return null;
}

/* ---------- suivi : ce que l'agent a recommandé, ce qui a été fait */
function agFollowView() {
  const runs = agRuns();
  const rows = [];
  runs.forEach(r => {
    Object.keys(isObj(r.actions) ? r.actions : {}).forEach(key => {
      const a = r.actions[key], q = a && a.questId ? S.quests[a.questId] : null;
      rows.push({ at: a.at || r.at, key, title: a.title || key, q, qid: a.questId });
    });
  });
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const done = rows.filter(x => x.q && x.q.done).length;
  const live = agentScan();
  const open = new Set(live.map(f => f.key));
  const persist = live.filter(f => f.age >= 14);
  return `<div class="grid2"><div class="col">
    ${sectionCard('Recommandations suivies', rows.length ? `<ul class="rows">${rows.slice(0, 40).map(x => `<li>
      <span class="st-i ${x.q && x.q.done ? 'ok' : ''}" aria-hidden="true">${x.q && x.q.done ? ICON.check : ''}</span>
      <div class="grow1"><div class="title n">${esc(x.q ? x.q.title : x.title)}</div><div class="meta"><span class="due">proposée le ${fmtShort(x.at)}</span>${x.q ? (x.q.done ? pill('Faite', 'win') : open.has(x.key) ? pill('Constat toujours ouvert', 'risk') : pill('En cours', 'live')) : pill('Quête supprimée', 'pre')}</div></div>
      ${x.q && !x.q.done ? `<button type="button" class="btn btn-xs" data-a="goQuest" data-id="${esc(x.qid)}">Voir</button>` : ''}</li>`).join('')}</ul>
      <p class="small muted" style="margin-top:10px">${done}/${rows.length} recommandations transformées en quête puis terminées.</p>`
    : emptyState('Aucune recommandation transformée en quête pour l’instant. Depuis l’onglet Revue, un constat peut devenir une quête en un clic : c’est ce qui permet de vérifier ensuite s’il a été traité.'), rows.length ? `${done}/${rows.length}` : '')}
  </div><div class="col">
    ${sectionCard('Constats qui s’installent', persist.length ? `<ul class="rows">${persist.map(f => `<li><div class="grow1"><div class="title n">${esc(f.title)}</div><div class="meta"><span class="due late">ouvert depuis ${plural(f.age, 'jour')}</span>${pill(AG_SEV[f.sev].l, AG_SEV[f.sev].c)}</div></div></li>`).join('')}</ul>
      <p class="small muted" style="margin-top:10px">Un constat ouvert depuis plus de deux semaines n'est plus un accident : soit la règle qui le produit ne te convient pas, soit le problème est réel et personne ne le traite.</p>`
      : '<p class="small muted">Aucun constat ne traîne depuis plus de deux semaines.</p>', persist.length ? `${persist.length}` : '')}
  </div></div>`;
}

/* ---------- historique des revues figées */
function agHistoryView() {
  const runs = agRuns();
  if (!runs.length) return sectionCard('Historique', emptyState('Aucune revue figée. « Figer la revue » garde une photo de l’état du jour ; une revue automatique est aussi enregistrée chaque semaine si le réglage est actif.', `<button type="button" class="btn btn-sm btn-primary" data-a="agSnap">Figer la revue</button>`));
  const openId = ui.agent.run && runs.some(r => r.id === ui.agent.run) ? ui.agent.run : runs[0].id;
  const r = runs.find(x => x.id === openId);
  return `<section class="card">
    <div class="chips" style="margin-bottom:14px">${runs.slice(0, 20).map(x => `<button type="button" class="chipbtn ${x.id === openId ? 'on' : ''}" data-a="agRun" data-id="${esc(x.id)}">${fmtShort(x.at)}${x.kind === 'auto' ? ' ·' : ''} <span>${(x.findings || []).length}</span></button>`).join('')}</div>
    <div class="ag-run">
      <div class="eyebrow">Revue ${r.kind === 'auto' ? 'automatique' : 'manuelle'} du ${fmtLong(r.at)}</div>
      ${(r.findings || []).length ? (r.findings || []).map(f => `<div class="ag-item sev-${f.sev}"><div class="ag-t"><span class="pill pill-${(AG_SEV[f.sev] || AG_SEV.surveiller).c}">${(AG_SEV[f.sev] || AG_SEV.surveiller).l}</span><b>${esc(f.title)}</b></div><p class="small">${esc(f.detail)}</p></div>`).join('') : '<p class="small muted">Aucun constat ce jour-là.</p>'}
      ${(r.resolved || []).length ? `<div class="hr"></div><div class="eyebrow">Réglé depuis la revue précédente</div><ul class="facts good">${r.resolved.map(f => `<li>${esc(f.title)}</li>`).join('')}</ul>` : ''}
      ${(r.good || []).length ? `<div class="hr"></div><div class="eyebrow">Ce qui tenait</div><ul class="facts good">${r.good.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
      ${r.interp ? `<div class="hr"></div><div class="eyebrow">Interprétation (Claude)</div><div class="debrief">${esc(r.interp)}</div>` : ''}
      <div class="row-wrap" style="margin-top:12px">${delBtn('agent', r.id, 'Supprimer cette revue')}</div>
    </div>
  </section>`;
}

/* ---------- interprétation par Claude, à partir des chiffres seulement */
function agInterpCard(live) {
  const st = ui.coach['agent'] || null;
  const last = agLastRun();
  const text = st && st.text ? st.text : (last && last.interp) || '';
  const running = st && st.status === 'thinking';
  const canAsk = !!sampleFn && !sampleOff;
  return sectionCard('Lecture par Claude', `
    <p class="small muted">Claude reçoit les chiffres de la période et les constats ci-contre, rien d'autre. Il ne voit ni tes textes de quêtes ni tes notes.</p>
    <div class="row-wrap">${canAsk ? (running ? '<button type="button" class="btn btn-sm" data-a="coachStop">Arrêter</button>' : `<button type="button" class="btn btn-sm" data-a="agInterp">${text ? 'Nouvelle lecture' : 'Demander une lecture'}</button>`) : ''}</div>
    ${text || running ? `<div class="debrief" id="coach-out-agent" style="margin-top:10px">${esc(text || 'Réflexion…')}</div>` : ''}
    ${st && st.note ? `<p class="small muted">${esc(st.note)}</p>` : ''}
    ${!canAsk ? '<p class="small muted">Disponible quand la page est ouverte dans Claude.</p>' : ''}`, '', 'ag-interp');
}

/* =========================================================
   Actions
   ========================================================= */
ACT.agView = b => { ui.agent.view = b.dataset.v; render(); };
ACT.agRun = b => { ui.agent.run = b.dataset.id; render(); };
ACT.agSnap = () => { const r = agentSnapshot('manuelle'); if (r) { ui.agent.view = 'historique'; ui.agent.run = r.id; toast('Revue figée.'); render(); } };
ACT.agSnooze = b => {
  const key = b.dataset.key, d = Number(R().agent.snoozeDays) || 14;
  agSaveState(s => { s.snooze = Object.assign({}, s.snooze, { [key]: addDays(ctx.today, d) }); });
  toast(`Constat mis de côté ${d} jours.`);
};
ACT.agWake = b => {
  const key = b.dataset.key;
  agSaveState(s => { const o = Object.assign({}, s.snooze); delete o[key]; s.snooze = o; });
};
ACT.agQuest = b => {
  const key = b.dataset.key;
  const f = agentScan({ withSnoozed: true }).find(x => x.key === key);
  if (!f || !f.fix || f.fix.type !== 'quest') return;
  const qid = uid('q');
  if (!put('quests', qid, newQuest({ title: f.fix.title, area: f.fix.area, kind: f.fix.kind, prio: f.fix.prio, due: addDays(ctx.today, 7) }))) return;
  let run = agLastRun();
  if (!run || run.at !== ctx.today) run = agentSnapshot('manuelle');
  if (run) {
    const doc = clone(S.agent[run.id]);
    if (doc) { doc.actions = Object.assign({}, doc.actions, { [key]: { questId: qid, at: ctx.today, title: f.fix.title } }); put('agent', run.id, doc, { silent: true }); }
  }
  toast('Quête créée : elle apparaîtra dans le suivi.');
};
ACT.agInterp = async () => {
  const live = agentScan();
  if (!sampleFn || sampleOff) return;
  const facts = agentFacts(live);
  const profile = String(R().profile || '').trim();
  const prompt = `${profile ? 'Contexte fourni par l’utilisateur :\n' + profile + '\n\n' : ''}Tu es l'agent de revue d'un tableau de bord personnel conçu comme une saison de football. Réponds en français, dense et structuré, sans encouragement ni formule motivante, sans conseil générique. Appuie-toi exclusivement sur les éléments ci-dessous ; n'invente aucun chiffre et signale quand une donnée manque.

Format exact (180 mots maximum) :
LECTURE : 2 ou 3 puces sur ce que montrent les chiffres, en reliant les constats entre eux plutôt qu'en les répétant.
CAUSE PROBABLE : 1 ou 2 puces, présentées comme des hypothèses à vérifier.
UNE SEULE CHOSE : l'action unique à faire cette semaine, vérifiable, et ce qu'elle devrait déplacer dans les chiffres.

Chiffres et constats :
${facts.map(x => '- ' + x).join('\n')}`;
  const ctl = new AbortController();
  coachCtl = ctl;
  ui.coach['agent'] = { text: '', status: 'thinking', note: '' };
  render();
  try {
    const res = await sampleFn(prompt, { signal: ctl.signal, cache: false, onText: ({ text }) => { if (ui.coach['agent']) ui.coach['agent'].text = text; const el = document.getElementById('coach-out-agent'); if (el) el.textContent = text; } });
    ui.coach['agent'] = { text: res.text, status: 'done', note: res.truncated ? 'Réponse coupée avant la fin.' : '' };
    let run = agLastRun();
    if (!run || run.at !== ctx.today) run = agentSnapshot('manuelle');
    if (run) { const doc = clone(S.agent[run.id]); if (doc) { doc.interp = res.text; put('agent', run.id, doc, { silent: true }); } }
  } catch (e) {
    const code = e && e.code;
    const s = { status: 'error', text: (e && e.text) || '', note: '' };
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { sampleOff = true; s.text = ''; }
    else if (code === 'cancelled') s.note = 'Lecture arrêtée.';
    else if (code === 'rate_limited') s.note = 'Limite d’utilisation atteinte : réessaie plus tard.';
    else if (code === 'refused') { s.text = ''; s.note = 'Claude n’a pas pu produire cette lecture.'; }
    else if (code === 'session_expired') s.note = 'Session expirée : reconnecte-toi à Claude.';
    else s.note = 'Lecture interrompue. Réessaie.';
    ui.coach['agent'] = s;
  } finally {
    if (coachCtl === ctl) coachCtl = null;
    render();
  }
};

/* ---------- carte de l'agent sur l'écran Match */
function agentCard() {
  if (!R().agent.onMatch) return '';
  let live = [];
  try { live = agentScan(); } catch (e) { live = []; }
  const top = live.filter(f => f.sev !== 'surveiller').slice(0, 2);
  if (!top.length) return '';
  return `<section class="card ag-mini">
    <div class="card-h"><h2 class="h3">${ICON.radar}<span>Agent de revue</span></h2><span class="card-r">${live.length}</span></div>
    ${top.map(f => `<div class="ag-line sev-${f.sev}"><span class="pill pill-${AG_SEV[f.sev].c}">${AG_SEV[f.sev].l}</span><span class="grow1">${esc(f.title)}</span></div>`).join('')}
    <div class="row-wrap"><button type="button" class="btn btn-sm" data-a="go" data-tab="agent">Ouvrir la revue</button></div>
  </section>`;
}
