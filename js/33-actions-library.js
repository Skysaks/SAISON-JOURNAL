/* =========================================================
   Actions de la bibliothèque : fiches, progression, notes
   ========================================================= */
ACT.libTab = b => { ui.lib.tab = b.dataset.v; render(); };
ACT.libKind = b => { ui.lib.kind = b.dataset.v; render(); };
ACT.libNFilter = b => { ui.lib.nFilter = b.dataset.v; render(); };
ACT.libNoteKind = b => { ui.lib.noteKind = NOTE_KINDS[b.dataset.v] ? b.dataset.v : 'idee'; render(); };
CHG.libNText = el => { ui.lib.nText = el.value; scheduleRender(); };
ACT.libOpen = b => {
  const id = b.dataset.id;
  const same = ui.lib.open === id && ui.tab === 'savoir' && ui.lib.tab !== 'notes';
  ui.lib.open = same ? null : id;
  if (ui.tab !== 'savoir' || ui.lib.tab === 'notes') { ui.lib.tab = 'lectures'; goTab('savoir'); } else render();
  if (!same) setTimeout(() => { const el = document.getElementById('lib-' + id); if (el) el.scrollIntoView({ block: 'center' }); }, 40);
};
CHG.libField = el => {
  const id = el.dataset.id, f = el.dataset.field, x = clone(S.knowledge_items[id]);
  if (!x) return;
  let v = el.value;
  if (f === 'pages') v = clamp(Math.round(num(v, 0)), 0, 20000);
  else if (f === 'kind') v = LIB_KINDS[v] ? v : 'livre';
  else if (f === 'url') v = /^https?:\/\//i.test(String(v).trim()) ? String(v).trim().slice(0, 400) : '';
  else v = String(v).slice(0, 160);
  if (x[f] === v) return;
  x[f] = v;
  put('knowledge_items', id, x);
};
CHG.libPage = el => {
  const id = el.dataset.id, x = clone(S.knowledge_items[id]);
  if (!x) return;
  const tot = Number(x.pages) || 0;
  const v = clamp(Math.round(num(el.value, 0)), 0, tot || 20000);
  if (Number(x.page) === v) return;
  x.page = v; x.progressDate = ctx.today;
  if (tot) x.progress = clamp(Math.round(v / tot * 100), 0, 100);
  put('knowledge_items', id, x);
};
ACT.libRate = b => {
  const id = b.dataset.id, x = clone(S.knowledge_items[id]);
  if (!x) return;
  const v = clamp(Math.round(num(b.dataset.v, 0)), 0, 5);
  x.rating = Number(x.rating) === v ? 0 : v;
  put('knowledge_items', id, x);
};

/* ---------- notes */
FORM.libNote = f => {
  const id = f.dataset.id, x = clone(S.knowledge_items[id]);
  if (!x) return;
  const text = String(f.elements.text.value || '').trim();
  if (!text) { toast('Écris la note avant d’enregistrer.'); return; }
  if (!Array.isArray(x.notes)) x.notes = [];
  if (x.notes.length >= 300) { toast('300 notes sur cette ressource : c’est le maximum.', 'bad'); return; }
  const page = f.elements.page ? clamp(Math.round(num(f.elements.page.value, 0)), 0, Number(x.pages) || 20000) : 0;
  x.notes.push({ id: uid('n'), d: ctx.today, ts: nowTs(), type: NOTE_KINDS[ui.lib.noteKind] ? ui.lib.noteKind : 'idee', page: page || null, text: text.slice(0, 1200), fav: false, questId: null });
  if (x.status === 'a_lire') { x.status = 'en_cours'; if (!x.startedDate) x.startedDate = ctx.today; }
  if (!put('knowledge_items', id, x)) return;
  clearDirty(f);
  toast('Note enregistrée.');
};
function libNoteEdit(id, nid, mut) {
  const x = clone(S.knowledge_items[id]);
  if (!x || !Array.isArray(x.notes)) return false;
  const i = x.notes.findIndex(n => n && n.id === nid);
  if (i < 0) return false;
  if (mut(x.notes, i) === false) return false;
  return put('knowledge_items', id, x);
}
ACT.libNoteFav = b => { libNoteEdit(b.dataset.id, b.dataset.n, (ns, i) => { ns[i].fav = !ns[i].fav; }); };
ACT.libNoteDel = b => {
  const key = 'note:' + b.dataset.n;
  if (ui.confirm !== key) { ui.confirm = key; render(); return; }
  ui.confirm = null;
  libNoteEdit(b.dataset.id, b.dataset.n, (ns, i) => { ns.splice(i, 1); });
};
ACT.libNoteToQuest = b => {
  const id = b.dataset.id, nid = b.dataset.n, x = S.knowledge_items[id];
  if (!x) return;
  const n = (Array.isArray(x.notes) ? x.notes : []).find(y => y && y.id === nid);
  if (!n) return;
  const qid = uid('q');
  if (!put('quests', qid, newQuest({ title: String(n.text).slice(0, 160), area: x.area || defaultArea(), kind: n.type === 'action' ? 'terrain' : 'fond', source: { type: 'knowledge', id } }))) return;
  libNoteEdit(id, nid, (ns, i) => { ns[i].questId = qid; });
  toast('Quête créée depuis la note.');
};
