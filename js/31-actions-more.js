/* =========================================================
   Actions : quêtes, compo, Cups, Savoir, Réseau, réglages, saisons, ajout rapide
   ========================================================= */
ACT.qView = b => { ui.q.view = b.dataset.v; render(); };
ACT.qDone = () => { ui.q.showDone = !ui.q.showDone; render(); };
CHG.qFilter = el => { const f = el.dataset.field; if (['area', 'kind', 'prio'].includes(f)) { ui.q[f] = el.value; render(); } };
ACT.goQuests = b => { ui.q.view = b.dataset.v || 'toutes'; goTab('quetes'); };
ACT.goQuest = b => { const q = S.quests[b.dataset.id]; if (!q) return; ui.q = Object.assign(ui.q, { view: 'toutes', area: 'all', kind: 'all', prio: 'all', text: q.title, showDone: !!q.done }); goTab('quetes'); };
ACT.qEdit = b => { ui.editQuest = b.dataset.id; ['qf-title', 'qf-a', 'qf-k', 'qf-p', 'qf-d', 'qf-g'].forEach(x => dirty.delete(x)); render(); const el = document.getElementById('qf-title'); if (el) { el.scrollIntoView({ block: 'center' }); try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } };
ACT.qEditCancel = () => { ui.editQuest = null; ['qf-title', 'qf-a', 'qf-k', 'qf-p', 'qf-d', 'qf-g'].forEach(x => dirty.delete(x)); render(); };
FORM.quest = f => {
  const title = f.elements.title.value.trim(); if (!title) { toast('Donne un intitulé à la quête.'); return; }
  const id = f.dataset.id;
  const base = id && S.quests[id] ? clone(S.quests[id]) : newQuest({});
  base.title = title.slice(0, 160); base.area = f.elements.area.value; base.kind = KIND[f.elements.kind.value] ? f.elements.kind.value : 'fond';
  base.prio = PRIO[f.elements.prio.value] ? f.elements.prio.value : 'normale';
  base.due = isKey(f.elements.due.value) ? f.elements.due.value : null;
  base.goal = S.goals[f.elements.goal.value] ? f.elements.goal.value : null;
  base.repeat = f.elements.repeat && REPEATS[f.elements.repeat.value] ? f.elements.repeat.value : null;
  if (!put('quests', id || uid('q'), base)) return;
  clearDirty(f);
  if (id) { ui.editQuest = null; toast('Quête modifiée.'); }
};
ACT.qPostponeOpen = b => { ui.postpone = ui.postpone === b.dataset.id ? null : b.dataset.id; render(); };
ACT.qPostponeCancel = () => { ui.postpone = null; render(); };
function postponeQuest(id, to) {
  const q = clone(S.quests[id]); if (!q || !isKey(to)) return;
  if (to < ctx.today) { toast('Date passée.'); return; }
  q.history = (Array.isArray(q.history) ? q.history : []).concat({ ts: nowTs(), from: q.due || null, to }).slice(-30);
  q.postponed = (Number(q.postponed) || 0) + 1; q.due = to;
  if (put('quests', id, q)) {
    ui.postpone = null;
    if (isBlocked(q)) toast(`Reportée ${q.postponed} fois : elle semble bloquée ou mal définie.`, 'bad'); else toast(`Reportée au ${withDot(fmtDayShort(to))}`);
  }
}
ACT.qPostpone = b => { const q = S.quests[b.dataset.id]; if (!q) return; const base = isKey(q.due) && q.due > ctx.today ? q.due : ctx.today; postponeQuest(b.dataset.id, addDays(base, Number(b.dataset.v))); };
CHG.qPostponeDate = el => { if (isKey(el.value)) postponeQuest(el.dataset.id, el.value); };

/* ---------- compo (mercato) */
function applyStatusChange(pid, to) {
  const E = mercatoDate();
  const line = lineupAt(E);
  if (line[pid] === to) { toast(`Déjà ${STATUS[to].toLowerCase()} à partir du ${withDot(fmtShort(E))}`); return false; }
  const changes = { [pid]: to };
  if (to === 'capitaine') ctx.projects.forEach(p => { if (p.id !== pid && line[p.id] === 'capitaine') changes[p.id] = 'titulaire'; });
  const after = Object.assign({}, line, changes);
  const vals = Object.values(after);
  if (vals.filter(v => v === 'capitaine').length > 1 || vals.filter(v => v === 'capitaine' || v === 'titulaire').length > 3) {
    toast('Compo pleine : 3 projets actifs maximum. Passe d’abord un titulaire sur le banc.', 'bad'); return false;
  }
  for (const id of Object.keys(changes)) {
    const p = clone(S.projects[id]); if (!p) continue;
    const before = statusAt(Object.assign({ id }, p), addDays(E, -1));
    let log = statusLogOf(p).filter(e => e.from < E);
    if (!log.length) log = [{ from: '2000-01-01', status: before }];
    log.push({ from: E, status: changes[id] });
    p.statusLog = log; delete p.status;
    if (!put('projects', id, p)) return false;
    addLog('compo', `${p.name} : ${STATUS[line[id]]} → ${STATUS[changes[id]]}${E === ctx.today ? '' : ` (effet le ${fmtShort(E)})`}`);
  }
  toast(E === ctx.today ? 'Compo modifiée.' : `Changement effectif le ${withDot(fmtDayShort(E))}`);
  return true;
}
CHG.projStatus = el => { if (!STATUS[el.value] || !applyStatusChange(el.dataset.id, el.value)) render(); };
CHG.projField = el => {
  const id = el.dataset.id, f = el.dataset.field, p = clone(S.projects[id]); if (!p || !['name', 'why'].includes(f)) return;
  const v = el.value.trim();
  if (f === 'name' && !v) { toast('Le projet doit avoir un nom.'); render(); return; }
  if ((p[f] || '') === v) return;
  p[f] = v.slice(0, f === 'name' ? 60 : 600); put('projects', id, p);
};
ACT.projEdit = b => { ui.editProj = ui.editProj === b.dataset.id ? null : b.dataset.id; render(); };
FORM.project = f => {
  const name = f.elements.name.value.trim(); if (!name) { toast('Donne un nom au projet.'); return; }
  let id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'projet';
  if (S.projects[id] || LIFE[id] || id === 'all') id = id + '-' + Math.random().toString(36).slice(2, 5);
  const order = Math.max(0, ...ctx.projects.map(p => Number(p.order) || 0)) + 1;
  if (put('projects', id, { name: name.slice(0, 60), why: f.elements.why.value.trim().slice(0, 600), order, statusLog: [{ from: '2000-01-01', status: 'banc' }] })) { addLog('compo', `${name} rejoint le banc`); clearDirty(f); }
};

/* ---------- Cups */
FORM.cup = f => {
  const name = f.elements.name.value.trim(); if (!name) { toast('Donne un nom à la Cup.'); return; }
  const n = arr('cups').length;
  if (put('cups', uid('cup'), { name: name.slice(0, 60), area: f.elements.area.value, season: f.dataset.s || null, milestones: [], done: false, doneDate: null, order: n + 1 })) clearDirty(f);
};
FORM.cupStepAdd = f => {
  const c = clone(S.cups[f.dataset.id]); if (!c) return;
  const t = f.elements.title.value.trim(); if (!t) { toast('Intitulé de l’étape ?'); return; }
  c.milestones = (Array.isArray(c.milestones) ? c.milestones : []).concat({ id: uid('m'), title: t.slice(0, 120), due: null, done: false, doneDate: null });
  if (c.done) { c.done = false; c.doneDate = null; xpRevoke('cup:' + f.dataset.id); }
  if (put('cups', f.dataset.id, c)) clearDirty(f);
};
ACT.cupStep = b => {
  const cid = b.dataset.id, mid = b.dataset.m, c = clone(S.cups[cid]); if (!c) return;
  const m = (c.milestones || []).find(x => x.id === mid); if (!m) return;
  m.done = !m.done; m.doneDate = m.done ? ctx.today : null;
  const all = c.milestones.length > 0 && c.milestones.every(x => x.done);
  const was = !!c.done;
  c.done = all; c.doneDate = all ? (c.doneDate || ctx.today) : null;
  if (!put('cups', cid, c)) return;
  if (m.done) xpAward(`cupm:${cid}:${mid}`, ctx.today, xpv('cupStep'), 'cup', `${c.name} : ${m.title}`, { area: c.area || null }); else xpRevoke(`cupm:${cid}:${mid}`);
  if (all && !was) { xpAward('cup:' + cid, ctx.today, xpv('cup'), 'cup', `Cup remportée : ${c.name}`, { area: c.area || null }); toast(`${c.name} remportée !`, 'xp big'); }
  if (!all && was) xpRevoke('cup:' + cid);
};

/* ---------- Savoir */
ACT.libArea = b => { ui.lib.area = b.dataset.v; render(); };
ACT.libStart = b => { const x = clone(S.knowledge_items[b.dataset.id]); if (!x) return; x.status = 'en_cours'; x.startedDate = ctx.today; put('knowledge_items', b.dataset.id, x); };
CHG.libProgress = el => { const x = clone(S.knowledge_items[el.dataset.id]); if (!x) return; const v = clamp(Math.round(num(el.value, 0)), 0, 100); if (Number(x.progress) === v) return; x.progress = v; x.progressDate = ctx.today; put('knowledge_items', el.dataset.id, x); };
ACT.libFinishOpen = b => { ui.lib.finishing = b.dataset.id; render(); focusSoon('lf-t-' + b.dataset.id); };
ACT.libFinishCancel = () => { ui.lib.finishing = null; render(); };
ACT.libReopen = b => { const x = clone(S.knowledge_items[b.dataset.id]); if (!x) return; x.status = 'en_cours'; put('knowledge_items', b.dataset.id, x); };
FORM.libFinish = f => {
  const id = f.dataset.id, x = clone(S.knowledge_items[id]); if (!x) return;
  const t = f.elements.takeaway.value.trim(); if (!t) { toast('Écris l’idée clé : c’est elle qui rapporte l’XP.'); return; }
  x.status = 'termine'; x.takeaway = t.slice(0, 600); x.action = f.elements.action.value.trim().slice(0, 200); x.finishedDate = ctx.today; x.progress = 100;
  if (!put('knowledge_items', id, x)) return;
  xpAward('k:' + id, ctx.today, xpv('book'), 'savoir', `Terminé : ${x.title}`, { area: x.area || null });
  clearDirty(f); ui.lib.finishing = null;
};
function markApplied(kid, date) {
  const x = clone(S.knowledge_items[kid]); if (!x || x.applied) return;
  x.applied = true; x.appliedDate = date || ctx.today;
  if (put('knowledge_items', kid, x)) xpAward('ka:' + kid, x.appliedDate, xpv('applied'), 'savoir', `Appliqué : ${x.title}`, { area: x.area || null });
}
ACT.libApplied = b => {
  const id = b.dataset.id, x = clone(S.knowledge_items[id]); if (!x) return;
  if (!x.applied) { markApplied(id, ctx.today); return; }
  x.applied = false; x.appliedDate = null;
  if (put('knowledge_items', id, x)) xpRevoke('ka:' + id);
};
ACT.libToQuest = b => {
  const id = b.dataset.id, x = clone(S.knowledge_items[id]); if (!x) return;
  const qid = uid('q');
  if (!put('quests', qid, newQuest({ title: x.action || `Appliquer : ${x.takeaway || x.title}`, area: x.area || defaultArea(), kind: 'terrain', source: { type: 'knowledge', id } }))) return;
  x.questId = qid; put('knowledge_items', id, x);
  toast('Quête Terrain créée : sa réussite marquera l’idée comme appliquée.');
};

/* ---------- Réseau */
ACT.netFilter = b => { ui.net.filter = b.dataset.v; render(); };
ACT.netTag = b => { ui.net.tag = ui.net.tag === b.dataset.v ? '' : b.dataset.v; render(); };
ACT.netOpen = b => {
  const id = b.dataset.id;
  ui.net.open = ui.tab === 'reseau' && ui.net.open === id ? null : id;
  if (ui.tab !== 'reseau') { ui.net.filter = 'all'; ui.net.tag = ''; goTab('reseau'); } else render();
  setTimeout(() => { const el = document.getElementById('contact-' + id); if (el) el.scrollIntoView({ block: 'center' }); }, 40);
};
ACT.netNote = b => { ui.net.note = b.dataset.id; if (ui.tab !== 'reseau') goTab('reseau'); else render(); focusSoon('cn-' + b.dataset.id); };
ACT.netNoteCancel = () => { ui.net.note = null; render(); };
function logContact(cid, note, date) {
  const c = clone(S.contacts[cid]); if (!c) return false;
  const ts = nowTs();
  c.log = (Array.isArray(c.log) ? c.log : []).concat({ date: date || ctx.today, note: String(note || '').slice(0, 240), ts }).slice(-200);
  if (!put('contacts', cid, c)) return false;
  xpAward(`c:${cid}:${ts}`, date || ctx.today, xpv('contact'), 'reseau', `Échange : ${c.name}`, { area: 'liens' });
  return true;
}
FORM.netLog = f => { if (logContact(f.dataset.id, f.elements.note.value.trim(), ctx.today)) { clearDirty(f); ui.net.note = null; } };
CHG.netField = el => {
  const id = el.dataset.id, f = el.dataset.field, c = clone(S.contacts[id]); if (!c) return;
  if (f === 'cadence') { const n = Number(el.value); if (![7, 14, 30, 60, 90].includes(n) || c.cadence === n) return; c.cadence = n; }
  else if (f === 'role') { if (!ROLES[el.value] || c.role === el.value) return; c.role = el.value; }
  else if (f === 'tags') { const t = Array.from(new Set(el.value.split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean).map(x => x.slice(0, 24)))).slice(0, 8); if (JSON.stringify(t) === JSON.stringify(c.tags || [])) return; c.tags = t; }
  else if (['next', 'org', 'notes'].includes(f)) { const v = el.value.trim().slice(0, f === 'notes' ? 500 : 200); if ((c[f] || '') === v) return; c[f] = v; }
  else return;
  put('contacts', id, c);
};
ACT.netToQuest = b => {
  const id = b.dataset.id, c = clone(S.contacts[id]); if (!c || !c.next) return;
  const qid = uid('q');
  if (!put('quests', qid, newQuest({ title: `${c.next} — ${c.name}`, area: 'liens', kind: 'terrain', due: ctx.today, source: { type: 'contact', id } }))) return;
  c.questId = qid; put('contacts', id, c);
  toast('Quête Terrain créée pour aujourd’hui : la terminer enregistre l’échange.');
};

/* ---------- réglages */
CHG.set = el => {
  const path = el.dataset.path, type = el.dataset.type;
  let v;
  if (type === 'bool') v = !!el.checked;
  else if (type === 'num') {
    v = num(el.value, NaN);
    if (!Number.isFinite(v)) { toast('Valeur invalide.', 'bad'); render(); return; }
    const mn = Number(el.min), mx = Number(el.max);
    if (Number.isFinite(mn)) v = Math.max(mn, v); if (Number.isFinite(mx)) v = Math.min(mx, v);
  } else v = String(el.value || '').slice(0, 1500);
  const cur = R();
  if (path === 'score.win' && v <= Number(cur.score.draw)) { toast('Le seuil de victoire doit dépasser celui du nul.', 'bad'); render(); return; }
  if (path === 'score.draw' && v >= Number(cur.score.win)) { toast('Le seuil du nul doit rester sous celui de la victoire.', 'bad'); render(); return; }
  if (['score.wCoups', 'score.wRoutine', 'score.wClose'].includes(path)) { const t = Object.assign({}, cur.score, { [path.slice(6)]: v }); if (Number(t.wCoups) + Number(t.wRoutine) + Number(t.wClose) <= 0) { toast('Au moins un poids doit être positif.', 'bad'); render(); return; } }
  if (JSON.stringify(getPath(cur, path)) === JSON.stringify(v)) return;
  const rules = path.startsWith('score.') || path.startsWith('dayTypes.');
  saveSettings(s => {
    setPath(s, path, v);
    if (rules) { s.rulesVersion = (Number(cur.rulesVersion) || 1) + 1; s.rulesLog = (Array.isArray(s.rulesLog) ? s.rulesLog : []).concat({ v: s.rulesVersion, from: ctx.today, what: path }).slice(-50); }
  }, rules ? `Règles de score v${(Number(cur.rulesVersion) || 1) + 1} : ${path}` : null);
};
ACT.setRestore = b => {
  const sec = b.dataset.sec;
  const map = { score: ['score', 'dayTypes'], xp: ['xp', 'mult'], match: ['match', 'focus'], quetes: ['quests'], compo: ['mercato'], objectifs: ['goals'], notifications: ['notif'], apparence: ['look', 'clubName'] };
  const keys = map[sec]; if (!keys) return;
  const rules = sec === 'score';
  saveSettings(s => { keys.forEach(k => { delete s[k]; }); if (rules) { s.rulesVersion = (Number(R().rulesVersion) || 1) + 1; s.rulesLog = (Array.isArray(s.rulesLog) ? s.rulesLog : []).concat({ v: s.rulesVersion, from: ctx.today, what: 'valeurs par défaut' }).slice(-50); } }, rules ? 'Règles de score remises par défaut' : null);
  toast('Valeurs par défaut restaurées.');
};
CHG.habitField = el => {
  const id = el.dataset.id, f = el.dataset.field, h = clone(S.habits[id]); if (!h) return;
  if (f === 'name') { const v = el.value.trim().slice(0, 80); if (!v) { toast('Une habitude doit avoir un nom.'); render(); return; } if (h.name === v) return; h.name = v; }
  else if (f === 'block') { if (!BLOCKS[el.value] || h.block === el.value) return; h.block = el.value; }
  else if (f === 'xp') { const n = Number(el.value); if (![5, 10, 15, 20, 25].includes(n) || Number(h.xp) === n) return; h.xp = n; }
  else if (f === 'area') { const v = el.value || null; if ((h.area || null) === v) return; h.area = v; }
  else return;
  put('habits', id, h);
};
ACT.habitDay = b => {
  const id = b.dataset.id, dn = Number(b.dataset.d), h = clone(S.habits[id]); if (!h) return;
  const cur = daysFor(h, ctx.today).slice();
  const next = cur.includes(dn) ? cur.filter(x => x !== dn) : cur.concat(dn).sort((x, y) => x - y);
  if (!next.length) { toast('Au moins un jour. Pour arrêter l’habitude, archive-la.'); return; }
  let sched = Array.isArray(h.sched) && h.sched.length ? h.sched.slice() : [{ from: h.createdAt || ctx.today, days: Array.isArray(h.days) ? h.days : [] }];
  sched = sched.filter(s => s.from !== ctx.today).concat({ from: ctx.today, days: next }).sort((x, y) => String(x.from).localeCompare(String(y.from)));
  h.sched = sched.slice(-40); delete h.days;
  put('habits', id, h);
};
FORM.habit = f => {
  const name = f.elements.name.value.trim(); if (!name) { toast('Donne un nom à l’habitude.'); return; }
  const xp = Number(f.elements.xp.value);
  const order = Math.max(0, ...ctx.habits.map(h => Number(h.order) || 0)) + 1;
  if (put('habits', uid('h'), { name: name.slice(0, 80), block: BLOCKS[f.elements.block.value] ? f.elements.block.value : 'journee', sched: [{ from: ctx.today, days: [1, 2, 3, 4, 5] }], xp: [5, 10, 15, 20, 25].includes(xp) ? xp : 10, area: null, order, createdAt: ctx.today })) clearDirty(f);
};

/* ---------- saisons */
FORM.season = f => {
  const g = n => (f.elements[n] ? f.elements[n].value.trim() : '');
  const name = g('name'), start = g('start'), end = g('end'), capStart = g('capStart'), capDeadline = g('capDeadline');
  if (!isKey(start) || !isKey(end) || start > end) { toast('Dates de saison invalides : le début doit précéder la fin.', 'bad'); return; }
  if (capDeadline && (!isKey(capDeadline) || (isKey(capStart) && capDeadline < capStart))) { toast('Échéance du cap invalide.', 'bad'); return; }
  const id0 = f.dataset.id;
  const overlap = seasonList().find(s => s.id !== id0 && !(end < s.start || start > s.end));
  if (overlap) { toast(`Chevauche la ${overlap.name || overlap.id} : ajuste les dates.`, 'bad'); return; }
  const base = id0 && S.seasons[id0] ? clone(S.seasons[id0]) : { capMilestones: [] };
  Object.assign(base, { name: (name || `Saison ${start.slice(0, 4)}`).slice(0, 40), start, end, vision: g('vision').slice(0, 400), cap: g('cap').slice(0, 400), capStart: isKey(capStart) ? capStart : start, capDeadline: isKey(capDeadline) ? capDeadline : null, restPerWeek: clamp(Math.round(num(g('restPerWeek'), 1)), 0, 3) });
  const id = id0 || ('s-' + start.slice(0, 4) + '-' + Math.random().toString(36).slice(2, 5));
  if (put('seasons', id, base)) {
    clearDirty(f); toast(id0 ? 'Saison enregistrée.' : 'Saison créée.');
    if (!(S.settings.main && S.settings.main.lang)) saveSettings(s => { s.lang = LANG; });
  }
};

/* ---------- ajout rapide */
FORM.quickAdd = f => {
  const kind = f.dataset.kind, e = f.elements;
  if (kind === 'quete') {
    const title = e.title.value.trim(); if (!title) { toast('Intitulé ?'); return; }
    const id = uid('q');
    if (!put('quests', id, newQuest({ title, area: e.area.value, kind: e.kind.value, prio: e.prio.value, due: e.due.value }))) return;
    if (e.today.checked) pickInto(ctx.today, id);
  } else if (kind === 'contact') {
    const name = e.name.value.trim(); if (!name) { toast('Nom ?'); return; }
    const cad = Number(e.cadence.value);
    const tags = Array.from(new Set(e.tags.value.split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean).map(x => x.slice(0, 24)))).slice(0, 8);
    if (!put('contacts', uid('c'), { name: name.slice(0, 80), role: ROLES[e.role.value] ? e.role.value : 'autre', org: e.org.value.trim().slice(0, 80), tags, next: e.next.value.trim().slice(0, 200), notes: '', cadence: [7, 14, 30, 60, 90].includes(cad) ? cad : 30, log: [], createdAt: ctx.today })) return;
  } else if (kind === 'savoir') {
    const title = e.title.value.trim(); if (!title) { toast('Titre ?'); return; }
    if (!put('knowledge_items', uid('k'), { title: title.slice(0, 160), author: e.author.value.trim().slice(0, 100), kind: LIB_KINDS[e.kind.value] ? e.kind.value : 'livre', area: e.area.value, status: 'a_lire', progress: 0, note: '', takeaway: '', action: '', applied: false, createdAt: ctx.today })) return;
  } else {
    const text = e.text.value.trim(); if (!text) { toast('Note vide.'); return; }
    if (!setDay(ctx.today, d => { d.notes = d.notes.concat({ ts: nowTs(), text: text.slice(0, 400) }).slice(-50); }, 'note')) return;
  }
  clearDirty(f);
  ui.overlay = null;
  toast('Ajouté.');
  render();
};
