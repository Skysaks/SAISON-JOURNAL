/* =========================================================
   Actions : navigation, match, routine, Full Time, cap, objectifs, bilans
   ========================================================= */
function goTab(tab, extra) {
  ui.tab = tab; ui.confirm = null; ui.overlay = null;
  LS.set(APP_KEY + ':tab', tab);
  if (extra) Object.assign(ui, extra);
  render();
  try { window.scrollTo({ top: 0 }); } catch (e) { /* ignore */ }
}
ACT.go = b => {
  const tab = b.dataset.tab;
  if (b.dataset.today) ui.day = ctx.today;
  if (b.dataset.set) ui.set = b.dataset.set;
  goTab(tab === 'perf' || VIEWS[tab] ? tab : 'match');
};
ACT.perf = b => { const v = b.dataset.v; if (PERF[v]) { ui.perf = v; LS.set(APP_KEY + ':perf', v); } goTab('perf'); };
ACT.more = () => { ui.overlay = { type: 'more' }; render(); };
ACT.search = () => { ui.overlay = { type: 'search', q: '' }; render(); focusSoon('srch'); };
ACT.quick = b => { ui.overlay = { type: 'quick', kind: (b && b.dataset.kind) || 'quete' }; render(); focusSoon({ quete: 'qa-title', contact: 'qa-name', savoir: 'qa-lt', note: 'qa-note' }[ui.overlay.kind]); };
ACT.quickKind = b => { ui.overlay = { type: 'quick', kind: b.dataset.v }; render(); focusSoon({ quete: 'qa-title', contact: 'qa-name', savoir: 'qa-lt', note: 'qa-note' }[b.dataset.v]); };
ACT.ovlClose = () => { ui.overlay = null; render(); };
ACT.scrollTo = b => { const el = document.getElementById(b.dataset.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
function focusSoon(id) { setTimeout(() => { const el = id && document.getElementById(id); if (el) { try { el.focus(); } catch (e) { /* ignore */ } } }, 30); }
ACT.dayNav = b => { const k = addDays(ui.day, Number(b.dataset.n)); if (k > addDays(ctx.today, 1)) return; ui.day = k; render(); };
ACT.dayGo = b => { const k = b.dataset.k; if (!isKey(k) || k > addDays(ctx.today, 1)) return; ui.day = k; goTab('match'); };
ACT.weekNav = b => { ui.week = addDays(mondayOf(ui.week), 7 * Number(b.dataset.n)); render(); };
ACT.weekNow = () => { ui.week = ctx.today; render(); };
ACT.monthNav = b => { ui.month = shiftMonth(ui.month, Number(b.dataset.n)); render(); };
ACT.monthNow = () => { ui.month = monthOf(ctx.today); render(); };
ACT.seasonNav = b => { const l = seasonList(); const cur = viewedSeason(); const i = l.findIndex(x => x.id === (cur && cur.id)); const n = l[i + Number(b.dataset.n)]; if (n) { ui.seasonId = n.id; ui.heatSel = null; render(); } };
ACT.seasonView = b => { ui.seasonId = b.dataset.id; ui.perf = 'saison'; goTab('perf'); };
ACT.heatSel = b => { ui.heatSel = ui.heatSel === b.dataset.k ? null : b.dataset.k; render(); };
ACT.setSec = b => { ui.set = b.dataset.v; render(); };

/* ---------- suppression en deux temps */
let confirmT = null;
ACT.del = b => {
  const coll = b.dataset.coll, id = b.dataset.id, key = coll + ':' + id;
  if (ui.confirm !== key) {
    ui.confirm = key; render();
    clearTimeout(confirmT);
    confirmT = setTimeout(() => { if (ui.confirm === key) { ui.confirm = null; render(); } }, 3500);
    return;
  }
  ui.confirm = null;
  if (coll === 'habitArchive') { const h = clone(S.habits[id]); if (h) { h.archivedAt = ctx.today; put('habits', id, h); } return; }
  if (coll === 'projects' && (questArr().some(q => q.area === id) || goalArr().some(g => g.area === id))) { toast('Ce projet a des quêtes ou des objectifs : passe-le en tribune.'); render(); return; }
  if (!COLLS.includes(coll)) return;
  if (coll === 'quests' && ui.editQuest === id) ui.editQuest = null;
  del(coll, id);
};

/* ---------- quêtes : terminer / annuler (effets en cascade) */
function setQuestDone(id, done, kIn) {
  const q0 = S.quests[id];
  if (!q0) return;
  const q = clone(q0);
  const k = isKey(kIn) && kIn <= ctx.today ? kIn : ctx.today;
  const prevDate = q.doneDate;
  if (done) {
    const planned = isPlanned(q, id, k);
    const c = questXpCalc(q, id, k, planned);
    q.done = true; q.doneDate = k; q.doneTs = nowTs(); q.planned = planned; q.xp = c.xp;
    if (!put('quests', id, q)) return;
    xpAward('q:' + id, k, c.xp, 'quete', q.title, { area: q.area || null, kind: q.kind || 'fond', unplanned: !planned, note: c.note || '' });
    if (c.xp === 0 && c.note) toast(c.note + ' : 0 XP.');
    if (q.source && q.source.type === 'contact' && S.contacts[q.source.id]) logContact(q.source.id, `Quête faite : ${q.title}`, k);
    if (q.source && q.source.type === 'knowledge' && S.knowledge_items[q.source.id]) markApplied(q.source.id, k);
    syncHat(k); refreshSnap(k, 'quête terminée');
    spawnRepeat(id, q, k);
  } else {
    q.done = false; q.doneDate = null; q.doneTs = null; q.planned = null; q.xp = 0;
    if (!put('quests', id, q)) return;
    xpRevoke('q:' + id);
    dropRepeat(id, q0);
    if (isKey(prevDate)) { syncHat(prevDate); refreshSnap(prevDate, 'quête décochée'); }
  }
}
ACT.questToggle = b => { const q = S.quests[b.dataset.id]; if (q) setQuestDone(b.dataset.id, !q.done, b.dataset.k || ctx.today); };
ACT.slotToggle = b => {
  const id = b.dataset.id, k = b.dataset.k, q = S.quests[id];
  if (!q || k > ctx.today) return;
  if (q.done && isKey(q.doneDate) && q.doneDate > k) return;
  setQuestDone(id, !q.done, k);
};
function pickInto(k, id) {
  const ok = setDay(k, d => {
    const p = d.coups.filter(x => S.quests[x]);
    if (p.includes(id)) { toast('Déjà dans les coups du jour.'); return false; }
    if (p.length >= 3) { toast('Les 3 coups sont déjà choisis.'); return false; }
    p.push(id); d.coups = p;
  }, 'coup ajouté');
  if (ok) syncHat(k);
  return ok;
}
ACT.pickTo = b => pickInto(b.dataset.k || ctx.today, b.dataset.id);
CHG.pickQuest = el => { if (el.value) pickInto(el.dataset.k, el.value); };
ACT.unpick = b => { const id = b.dataset.id, k = b.dataset.k; if (setDay(k, d => { d.coups = d.coups.filter(x => x !== id); }, 'coup retiré')) syncHat(k); };
FORM.quickQuest = f => {
  const title = f.elements.title.value.trim();
  if (!title) { toast('Donne un intitulé à la quête.'); return; }
  const k = f.dataset.k, id = uid('q');
  const ok = put('quests', id, newQuest({ title, area: f.elements.area.value, kind: f.elements.kind.value, due: k }));
  if (!ok) return;
  clearDirty(f);
  const n = ((getDay(k) || {}).coups || []).filter(x => S.quests[x]).length;
  if (n < 3) pickInto(k, id); else toast('Les 3 coups sont pris : quête rangée dans Quêtes.');
};
function newQuest(o) {
  return { title: String(o.title || '').slice(0, 160), area: o.area || defaultArea(), kind: KIND[o.kind] ? o.kind : 'fond', prio: PRIO[o.prio] ? o.prio : 'normale', due: isKey(o.due) ? o.due : null, goal: o.goal && S.goals[o.goal] ? o.goal : null, done: false, doneDate: null, doneTs: null, planned: null, xp: 0, createdAt: ctx.today, createdTs: nowTs(), postponed: 0, history: [], source: o.source || null, repeat: REPEATS[o.repeat] ? o.repeat : null, nextId: null };
}

/* ---------- routine */
ACT.habit = b => {
  const k = b.dataset.k, hid = b.dataset.id, h = S.habits[hid];
  if (!h || k > ctx.today) return;
  const on = !!((getDay(k) || {}).h || {})[hid];
  const xp = Number(h.xp) || 10;
  if (!on) xpAward(`h:${k}:${hid}`, k, xp, 'routine', h.name, { area: h.area || null }); else xpRevoke(`h:${k}:${hid}`);
  setDay(k, d => { d.h[hid] = on ? 0 : xp; }, 'routine');
};

/* ---------- avant-match, coup d'envoi, type de match */
ACT.preEnergy = b => { const v = Number(b.dataset.v); setDay(b.dataset.k, d => { d.pre.energy = d.pre.energy === v ? null : v; }); };
CHG.preGoal = el => setDay(el.dataset.k, d => { d.pre.goal = el.value || null; });
ACT.kickoff = b => {
  const k = b.dataset.k;
  if (k !== ctx.today) { toast('Le coup d’envoi se donne le jour du match.'); return; }
  setDay(k, d => {
    d.ko = { ts: nowTs(), coups: d.coups.filter(id => S.quests[id]).slice(0, 3), type: dayType(d), habits: habitsDue(k).map(h => h.id), energy: d.pre.energy || null, goal: d.pre.goal || null };
    if (!d.type) d.type = dayType(d);
  });
  toast('Coup d’envoi : plan figé.');
};
ACT.koUndo = b => setDay(b.dataset.k, d => { delete d.ko; });
CHG.dayType = el => {
  const k = el.dataset.k, v = el.value;
  if (!DAY_TYPES[v] || k < ctx.today) return;
  if (v === 'treve') {
    const s = seasonAt(k);
    const cap = s && Number.isFinite(Number(s.restPerWeek)) ? Number(s.restPerWeek) : 1;
    if (trevesInWeek(k, k) >= cap) { toast(`Quota de trêve atteint cette semaine (${cap}).`, 'bad'); render(); return; }
  }
  if (setDay(k, d => { d.type = v; })) syncHat(k);
};
ACT.markImprevu = b => { ui.overlay = { type: 'imprevu', k: b.dataset.k }; render(); focusSoon('imp-reason'); };
FORM.imprevu = f => {
  const k = f.dataset.k, reason = f.elements.reason.value.trim();
  if (!reason) { toast('Écris ce qui s’est passé.'); return; }
  if (setDay(k, d => { d.type = 'imprevu'; d.imprevu = reason.slice(0, 200); }, 'imprévu déclaré')) {
    addLog('correction', `Imprévu déclaré pour le ${fmtShort(k)} : ${reason.slice(0, 120)}`);
    syncHat(k); clearDirty(f); ui.overlay = null; render();
  }
};

/* ---------- Full Time */
CHG.ft = el => {
  const f = el.dataset.field;
  if (!['shipped', 'block', 'adjust', 'lesson'].includes(f)) return;
  const v = el.value.trim().slice(0, 300);
  setDay(el.dataset.k, d => { if ((d.ft[f] || '') === v) return false; d.ft[f] = v; }, 'Full Time');
};
ACT.ftEnergy = b => { const v = Number(b.dataset.v); setDay(b.dataset.k, d => { d.ft.energy = d.ft.energy === v ? null : v; }, 'Full Time'); };
ACT.ftClose = b => {
  const k = b.dataset.k;
  const val = n => { const el = document.getElementById(`ft-${n}-${k}`); return el ? el.value.trim().slice(0, 300) : ''; };
  const vals = { shipped: val('shipped'), block: val('block'), adjust: val('adjust'), lesson: val('lesson') };
  const cur = (getDay(k) || {}).ft || {};
  if (!(vals.shipped || cur.shipped || vals.block || cur.block)) { toast('Écris au moins la victoire du jour ou le blocage principal.'); return; }
  if (setDay(k, d => { Object.keys(vals).forEach(x => { if (vals[x]) d.ft[x] = vals[x]; }); d.ft.closedTs = nowTs(); }, 'clôture')) {
    xpAward('ft:' + k, k, xpv('close'), 'cloture', 'Clôture du match');
    toast('Coup de sifflet final.');
  }
};
ACT.ftReopen = b => setDay(b.dataset.k, d => { d.ft.closedTs = null; }, 'match rouvert');

/* ---------- cap des 90 jours */
ACT.capStep = b => {
  const sid = b.dataset.s, mid = b.dataset.id;
  const s = clone(S.seasons[sid]); if (!s || !Array.isArray(s.capMilestones)) return;
  const m = s.capMilestones.find(x => x.id === mid); if (!m) return;
  m.done = !m.done; m.doneDate = m.done ? ctx.today : null;
  if (!put('seasons', sid, s)) return;
  if (m.done) xpAward(`cm:${sid}:${mid}`, ctx.today, xpv('capStep'), 'cap', `Étape du cap : ${m.title}`); else xpRevoke(`cm:${sid}:${mid}`);
};
FORM.capStepAdd = f => {
  const sid = f.dataset.s, s = clone(S.seasons[sid]); if (!s) return;
  const t = f.elements.title.value.trim(); if (!t) { toast('Intitulé de l’étape ?'); return; }
  s.capMilestones = (Array.isArray(s.capMilestones) ? s.capMilestones : []).concat({ id: uid('m'), title: t.slice(0, 120), due: isKey(f.elements.due.value) ? f.elements.due.value : null, done: false, doneDate: null });
  if (put('seasons', sid, s)) clearDirty(f);
};
ACT.capStepDel = b => { const s = clone(S.seasons[b.dataset.s]); if (!s) return; s.capMilestones = (s.capMilestones || []).filter(m => m.id !== b.dataset.id); put('seasons', b.dataset.s, s); };

/* ---------- objectifs */
ACT.goalStep = b => {
  const id = b.dataset.id, g = clone(S.goals[id]); if (!g) return;
  const n = Math.max(0, (Number(g.current) || 0) + Number(b.dataset.n));
  const target = Math.max(1, Number(g.target) || 1);
  g.current = n;
  const was = !!g.done;
  if (n >= target && !was) { g.done = true; g.doneDate = ctx.today; }
  else if (n < target && was) { g.done = false; g.doneDate = null; }
  if (!put('goals', id, g)) return;
  if (g.done && !was) xpAward('g:' + id, ctx.today, xpv(goalXpKey(g.horizon)), 'objectif', `Objectif atteint : ${g.title}`, { area: g.area || null });
  if (!g.done && was) xpRevoke('g:' + id);
};
ACT.goalCarry = b => {
  const id = b.dataset.id, to = b.dataset.to, g = clone(S.goals[id]); if (!g) return;
  if (goalsFor(g.horizon, to).length >= goalMax(g.horizon)) { toast('Maximum atteint pour cette période.'); return; }
  const nid = uid('g');
  if (!put('goals', nid, { title: g.title, horizon: g.horizon, period: to, area: g.area, parent: g.parent || null, target: g.target, current: g.current || 0, unit: g.unit || '', due: null, done: false, doneDate: null, createdAt: ctx.today, carriedFrom: id })) return;
  g.carriedTo = nid; put('goals', id, g);
};
FORM.goal = f => {
  const title = f.elements.title.value.trim(); if (!title) { toast('Donne un intitulé à l’objectif.'); return; }
  const h = f.dataset.h, p = f.dataset.p;
  if (goalsFor(h, p).length >= goalMax(h)) { toast('Maximum atteint pour cette période.'); return; }
  const target = clamp(Math.round(num(f.elements.target.value, 1)), 1, 100000);
  const due = f.elements.due && isKey(f.elements.due.value) ? f.elements.due.value : null;
  const parent = f.elements.parent && S.goals[f.elements.parent.value] ? f.elements.parent.value : null;
  if (put('goals', uid('g'), { title: title.slice(0, 140), horizon: h, period: p, area: f.elements.area.value, parent, target, current: 0, unit: f.elements.unit.value.trim().slice(0, 24), due, done: false, doneDate: null, createdAt: ctx.today })) clearDirty(f);
};

/* ---------- bilans */
ACT.proof = b => { const id = b.dataset.id, v = b.dataset.v === '1'; ui.proof[id] = ui.proof[id] === v ? null : v; render(); };
FORM.review = f => {
  const id = f.dataset.id, kind = f.dataset.kind, a = f.dataset.start, e = f.dataset.end;
  const r = S.reviews[id] ? clone(S.reviews[id]) : {};
  const answers = {};
  REVIEW_Q[kind].forEach(([q]) => { answers[q] = (f.elements[q] ? f.elements[q].value : '').trim().slice(0, 800); });
  Object.assign(r, { kind, period: f.dataset.period, start: a, end: e, answers, auto: autoMetrics(kind, a, e) });
  if (kind === 'S') {
    const pv = id in ui.proof && ui.proof[id] !== null ? ui.proof[id] : (r.proof === true || r.proof === false ? r.proof : null);
    if (pv !== true && pv !== false) { toast('Réponds d’abord : preuve terrain, oui ou non ?'); return; }
    const rev = num(f.elements.revenue.value === '' ? 0 : f.elements.revenue.value, NaN);
    if (!Number.isFinite(rev) || rev < 0) { toast('Montant encaissé invalide.'); return; }
    r.proof = pv; r.revenue = Math.round(rev * 100) / 100;
  }
  const first = !r.done;
  r.done = true; if (!r.doneDate) r.doneDate = ctx.today;
  if (!put('reviews', id, r)) return;
  if (first) xpAward('r:' + id, ctx.today, xpv(REVIEW_XP[kind]), 'bilan', kind === 'S' ? 'Bilan de la semaine' : kind === 'M' ? 'Bilan du mois' : 'Bilan de la saison');
  clearDirty(f); delete ui.proof[id];
  if (!first) toast('Bilan mis à jour.');
};
ACT.coachFacts = b => {
  const id = b.dataset.id, kind = b.dataset.kind, a = b.dataset.a1, e = b.dataset.b1;
  const [pa, pb] = prevPeriodOf(kind, a, e);
  const facts = coachFacts(a, e, pa, pb);
  ui.coach[id] = { facts, text: '', status: 'facts' };
  const r = S.reviews[id] ? clone(S.reviews[id]) : { kind, period: id.slice(2), start: a, end: e, answers: {}, done: false };
  r.coach = { facts, interp: '', date: ctx.today };
  put('reviews', id, r);
};
let coachCtl = null;
ACT.coachStop = () => { if (coachCtl) coachCtl.abort(); };
ACT.coachInterp = async b => {
  const id = b.dataset.id;
  const saved = (S.reviews[id] && S.reviews[id].coach) || {};
  const facts = (ui.coach[id] && ui.coach[id].facts) || saved.facts;
  if (!facts || !sampleFn || sampleOff) return;
  const profile = String(R().profile || '').trim();
  const prompt = `${profile ? 'Contexte fourni par l’utilisateur :\n' + profile + '\n\n' : ''}Tu es l'analyste de performance d'un tableau de bord personnel conçu comme une saison de football. Réponds en français, dense et structuré, sans encouragement ni formule motivante, sans conseil générique. Appuie-toi exclusivement sur les chiffres ci-dessous ; n'invente aucun chiffre et signale quand une donnée manque.

Format exact (150 mots maximum) :
LECTURE : 2 ou 3 puces sur ce que montrent les chiffres.
HYPOTHÈSES : 1 ou 2 puces d'interprétation, présentées comme des hypothèses.
AJUSTEMENT : une seule action vérifiable pour la période suivante.

Chiffres de la période :
${facts.map(x => '- ' + x).join('\n')}`;
  const ctl = new AbortController();
  coachCtl = ctl;
  ui.coach[id] = { facts, text: '', status: 'thinking', note: '' };
  render();
  try {
    const res = await sampleFn(prompt, { signal: ctl.signal, cache: false, onText: ({ text }) => { if (ui.coach[id]) ui.coach[id].text = text; const el = document.getElementById('coach-out-' + id); if (el) el.textContent = text; } });
    ui.coach[id] = { facts, text: res.text, status: 'done', note: res.truncated ? 'Réponse coupée avant la fin.' : '' };
    const r = S.reviews[id] ? clone(S.reviews[id]) : { answers: {}, done: false };
    r.coach = { facts, interp: res.text, date: ctx.today };
    put('reviews', id, r);
  } catch (e) {
    const code = e && e.code;
    const st = { facts, status: 'error', text: (e && e.text) || '', note: '' };
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { sampleOff = true; st.text = ''; }
    else if (code === 'cancelled') st.note = 'Interprétation arrêtée.';
    else if (code === 'rate_limited') st.note = 'Limite d’utilisation atteinte : réessaie plus tard.';
    else if (code === 'refused') { st.text = ''; st.note = 'Claude n’a pas pu produire cette interprétation.'; }
    else if (code === 'session_expired') st.note = 'Session expirée : reconnecte-toi à Claude.';
    else st.note = 'Interprétation interrompue. Réessaie.';
    ui.coach[id] = st;
  } finally {
    if (coachCtl === ctl) coachCtl = null;
    render();
  }
};
