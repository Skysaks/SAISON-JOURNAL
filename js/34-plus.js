/* =========================================================
   Compléments : quêtes récurrentes, découpage d'une quête,
   plan du lendemain, sauvegardes locales (mode fichier).
   ========================================================= */

/* ---------- répétition d'une quête */
const REPEATS = {
  j1: { l: 'Chaque jour', n: 1, u: 'j' },
  j7: { l: 'Chaque semaine', n: 7, u: 'j' },
  j14: { l: 'Toutes les 2 semaines', n: 14, u: 'j' },
  m1: { l: 'Chaque mois', n: 1, u: 'm' }
};
function addMonthsKey(k, n) {
  const d = parseKey(k), day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return dkey(new Date(t.getFullYear(), t.getMonth(), Math.min(day, last)));
}
function nextRepeatDue(from, rep) {
  const r = REPEATS[rep];
  if (!r) return null;
  const base = isKey(from) ? from : todayKey();
  return r.u === 'm' ? addMonthsKey(base, r.n) : addDays(base, r.n);
}
const repeatOptions = sel => `<option value="">${NT('—')}</option>` + Object.keys(REPEATS).map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${REPEATS[k].l}</option>`).join('');
/* une quête terminée engendre sa prochaine occurrence (une seule fois) */
function spawnRepeat(id, q, k) {
  const rep = REPEATS[q.repeat] ? q.repeat : null;
  if (!rep) return;
  if (q.nextId && S.quests[q.nextId]) return;
  const due = nextRepeatDue(isKey(q.due) && q.due >= k ? q.due : k, rep);
  const nid = uid('q');
  if (!put('quests', nid, newQuest({ title: q.title, area: q.area, kind: q.kind, prio: q.prio, due, goal: q.goal, repeat: rep, source: q.source }))) return;
  const cur = clone(S.quests[id]);
  if (cur) { cur.nextId = nid; put('quests', id, cur, { system: true, silent: true }); }
  toast(`Quête répétée : la prochaine est au ${withDot(fmtDayShort(due))}`);
}
function dropRepeat(id, q) {
  const nid = q.nextId;
  if (nid && S.quests[nid] && !S.quests[nid].done) del('quests', nid, { system: true, silent: true });
  const cur = clone(S.quests[id]);
  if (cur && cur.nextId) { cur.nextId = null; put('quests', id, cur, { system: true, silent: true }); }
}

/* ---------- découper une quête bloquée en deux ou trois */
ACT.qSplitOpen = b => { ui.split = ui.split === b.dataset.id ? null : b.dataset.id; ui.postpone = null; render(); };
ACT.qSplitCancel = () => { ui.split = null; render(); };
function splitForm(q) {
  return `<form class="split" data-f="qSplit" data-id="${esc(q.id)}">
    <p class="small muted">Trois morceaux au maximum, chacun terminable en une fois. La quête d'origine est remplacée.</p>
    ${['a', 'b', 'c'].map((n, i) => `<div><label class="sr" for="sp-${n}-${esc(q.id)}">Morceau ${i + 1}</label><input type="text" id="sp-${n}-${esc(q.id)}" class="draft" name="t${n}" maxlength="160" placeholder="${i < 2 ? 'Un verbe et un résultat vérifiable' : 'Facultatif'}"></div>`).join('')}
    <div class="row-wrap"><button type="submit" class="btn btn-sm btn-primary">Découper</button><button type="button" class="btn btn-sm btn-ghost" data-a="qSplitCancel">Annuler</button></div>
  </form>`;
}
FORM.qSplit = f => {
  const id = f.dataset.id, q = S.quests[id];
  if (!q) return;
  const titles = ['a', 'b', 'c'].map(n => (f.elements['t' + n] ? f.elements['t' + n].value.trim() : '')).filter(Boolean);
  if (titles.length < 2) { toast('Écris au moins deux morceaux.'); return; }
  const made = [];
  titles.forEach((t, i) => {
    const nid = uid('q');
    if (put('quests', nid, newQuest({ title: t, area: q.area, kind: q.kind, prio: q.prio, due: i === 0 ? q.due : null, goal: q.goal, source: q.source }))) made.push(nid);
  });
  if (!made.length) return;
  [ctx.today, addDays(ctx.today, 1)].forEach(kk => {
    const d = getDay(kk);
    if (d && (d.coups || []).includes(id)) setDay(kk, dd => { dd.coups = dd.coups.filter(x => x !== id); }, 'coup retiré');
  });
  del('quests', id);
  addLog('correction', `Quête découpée : ${q.title}`);
  clearDirty(f);
  ui.split = null;
  toast(`Découpée en ${plural(made.length, 'quête')}.`);
  render();
};

/* ---------- plan du lendemain, proposé une fois le match clôturé */
function tomorrowCard(k) {
  const T2 = addDays(k, 1);
  const d2 = getDay(T2) || {};
  const ids = (d2.coups || []).filter(id => S.quests[id]);
  const left = ((getDay(k) || {}).coups || []).filter(id => S.quests[id] && !S.quests[id].done && !ids.includes(id));
  const chosen = ids.length ? `<ul class="rows">${ids.map(id => `<li><span class="slot-n">${ids.indexOf(id) + 1}</span><div class="grow1"><div class="title n">${esc(S.quests[id].title)}</div><div class="meta">${areaChip(S.quests[id].area)} ${kindChip(S.quests[id].kind)}${dueLabel(Object.assign({ id }, S.quests[id]))}</div></div><button type="button" class="iconbtn sm" data-a="unpick" data-id="${esc(id)}" data-k="${T2}" aria-label="Retirer du plan de demain">${ICON.x}</button></li>`).join('')}</ul>` : '';
  let sel = '';
  if (ids.length < 3) {
    const open = questArr().filter(q => !q.done && !ids.includes(q.id))
      .sort((a, b) => areaInfo(b.area).mult - areaInfo(a.area).mult || (PRIO_RANK[a.prio] ?? 2) - (PRIO_RANK[b.prio] ?? 2) || String(a.due || '9999').localeCompare(String(b.due || '9999')));
    const groups = {};
    open.slice(0, 60).forEach(q => { const a = areaInfo(q.area).label; (groups[a] = groups[a] || []).push(q); });
    const opts = Object.keys(groups).map(g => `<optgroup label="${esc(g)}">${groups[g].map(q => `<option value="${esc(q.id)}">${esc(q.title)}${q.due ? ' · ' + fmtShort(q.due) : ''}</option>`).join('')}</optgroup>`).join('');
    sel = open.length
      ? `<div><label class="sr" for="tm-pick">Choisir un coup pour demain</label><select id="tm-pick" data-c="pickQuest" data-k="${T2}"><option value="">Ajouter un coup pour demain…</option>${opts}</select></div>`
      : `<p class="small muted">Aucune quête ouverte à programmer.</p>`;
  }
  const acts = `<div class="row-wrap">${left.length ? `<button type="button" class="btn btn-sm" data-a="pickLeft" data-k="${T2}">Reprendre les non terminés (${left.length})</button>` : ''}<button type="button" class="btn btn-sm btn-ghost" data-a="dayGo" data-k="${T2}">Ouvrir demain</button></div>`;
  return sectionCard('Plan de demain', `<p class="small muted">${esc(cap1(fmtDay(T2)))} · ${ids.length}/3 choisis. Deux minutes ce soir valent une heure demain matin.</p>${chosen}${sel}${acts}`, '', 'tomorrow', 'tomorrow');
}
ACT.pickLeft = b => {
  const k = b.dataset.k;
  const from = addDays(k, -1);
  const left = ((getDay(from) || {}).coups || []).filter(id => S.quests[id] && !S.quests[id].done);
  left.forEach(id => pickInto(k, id));
};

/* ---------- sauvegardes locales (mode fichier : rien dans la base) */
const LBAK = () => APP_KEY + ':bak';
const LBAK_MAX = 1800000;
function localBackups() {
  try { const a = JSON.parse(LS.get(LBAK()) || '[]'); return Array.isArray(a) ? a.filter(b => b && typeof b.data === 'string') : []; } catch (e) { return []; }
}
function localBackupSave(kind) {
  const json = JSON.stringify(allData());
  if (json.length > LBAK_MAX) { toast('Données trop lourdes pour une sauvegarde locale : exporte un JSON.', 'bad'); return false; }
  const next = [{ at: todayKey(), ts: nowTs(), kind, size: json.length, data: json }].concat(localBackups()).slice(0, 2);
  if (!LS.set(LBAK(), JSON.stringify(next))) { toast('Stockage du navigateur plein : sauvegarde locale impossible.', 'bad'); return false; }
  return true;
}
ACT.localBackupNow = () => { if (localBackupSave('manuel')) { toast('Sauvegarde locale faite.'); saveSettings(s => { s.lastLocalBackup = todayKey(); }); } };
function localBackupAuto() {
  if (mode !== 'local') return;
  const last = R().lastLocalBackup;
  if (isKey(last) && daysBetween(last, todayKey()) < 7) return;
  if (sum(COLLS.map(c => Object.keys(S[c]).length)) < 3) return;
  if (localBackupSave('auto')) saveSettings(s => { s.lastLocalBackup = todayKey(); });
}
function localBackupsCard() {
  const l = localBackups();
  const rows = l.length
    ? `<ul class="rows">${l.map((b, i) => `<li><div class="grow1"><div class="title n">${b.kind === 'auto' ? 'Automatique' : 'Manuelle'} · ${fmtShort(b.at)} ${b.ts ? timeOf(b.ts) : ''}</div><div class="meta"><span class="muted small">${fmt(Math.round((b.size || 0) / 1024))} Ko</span></div></div><button type="button" class="btn btn-xs" data-a="restoreAsk" data-id="local:${i}">Restaurer</button></li>`).join('')}</ul>`
    : '<p class="small muted">Aucune sauvegarde locale pour l’instant.</p>';
  return sectionCard('Sauvegardes locales', `<div class="row-wrap"><button type="button" class="btn" data-a="localBackupNow" ${dataBusy ? 'disabled' : ''}>Sauvegarder maintenant</button></div>
    <p class="small muted" style="margin-top:8px">Deux sauvegardes gardées dans ce navigateur, dont une automatique chaque semaine. Elles disparaissent si tu effaces les données du navigateur : exporte aussi un JSON de temps en temps.</p>
    ${rows}
    ${ui.restoreId ? `<form class="form-row" data-f="restoreConfirm" data-id="${esc(ui.restoreId)}" style="margin-top:10px"><div class="grow"><label class="lbl" for="rs-ok">Tape RESTAURER pour remplacer les données actuelles</label><input type="text" id="rs-ok" class="draft" name="ok" autocomplete="off"></div><button type="submit" class="btn danger" ${dataBusy ? 'disabled' : ''}>Restaurer</button><button type="button" class="btn btn-ghost" data-a="restoreCancel">Annuler</button></form>` : ''}`);
}
