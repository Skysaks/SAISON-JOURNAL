/* =========================================================
   Réglages › Données et Avancé : export, import, sauvegardes, remise à zéro
   ========================================================= */
let importPending = null, backupList = null, dataBusy = false;
SETV.donnees = () => {
  const counts = COLLS.map(c => `${c} ${Object.keys(S[c]).length}`).join(' · ');
  const total = sum(COLLS.map(c => Object.keys(S[c]).length));
  const bl = backupList;
  return `${sectionCard('Où vivent tes données', `<p class="small">${mode === 'db' ? 'Dans la base privée de cette page : mêmes chiffres sur téléphone et ordinateur. Dans une conversation, Claude peut les lire (bilan, analyse) ou y ajouter des quêtes.' : 'Base de la page indisponible ici : les données restent dans ce navigateur.'}</p><p class="small muted" style="margin-top:6px">${total} documents · ${esc(counts)}</p>`, mode === 'db' ? pill('Synchronisées', 'win') : pill('Ce navigateur', 'pre'))}
  ${sectionCard('Exporter', downloadsApi || STANDALONE ? `<div class="row-wrap"><button type="button" class="btn" data-a="exportJson">Tout en JSON</button><button type="button" class="btn" data-a="exportCsv" data-v="quetes">Quêtes en CSV</button><button type="button" class="btn" data-a="exportCsv" data-v="matchs">Matchs en CSV</button></div><p class="small muted" style="margin-top:8px">Le JSON est une sauvegarde complète, réimportable ici.</p>` : '<p class="small muted">L’export est disponible quand la page est ouverte dans Claude.</p>')}
  ${sectionCard('Importer un JSON', `<div class="form-row"><div class="grow"><label class="lbl" for="imp-file">Fichier exporté depuis ce tableau de bord</label><input type="file" id="imp-file" accept="application/json,.json" data-c="importFile"></div></div>
    ${importPending ? `<div class="alert">Fichier prêt : ${sum(COLLS.map(c => Object.keys(importPending[c] || {}).length))} documents. L'import <b>remplace toutes les données actuelles</b>${mode === 'db' ? ' (une sauvegarde de sécurité est faite avant)' : ''}.</div>
    <form class="form-row" data-f="importConfirm"><div class="grow"><label class="lbl" for="imp-ok">Tape REMPLACER pour confirmer</label><input type="text" id="imp-ok" class="draft" name="ok" autocomplete="off"></div><button type="submit" class="btn danger" ${dataBusy ? 'disabled' : ''}>Importer</button><button type="button" class="btn btn-ghost" data-a="importCancel">Annuler</button></form>` : ''}`)}
  ${sectionCard('Sauvegardes', mode === 'db' ? `<div class="row-wrap"><button type="button" class="btn" data-a="backupNow" ${dataBusy ? 'disabled' : ''}>Sauvegarder maintenant</button><button type="button" class="btn btn-ghost" data-a="backupList">${bl ? 'Actualiser la liste' : 'Voir les sauvegardes'}</button></div>
    <p class="small muted" style="margin-top:8px">Sauvegarde automatique chaque semaine (4 conservées)${R().lastAutoBackup ? `, dernière le ${fmtShort(R().lastAutoBackup)}` : ''}. Les sauvegardes manuelles : 6 conservées.</p>
    ${bl ? (bl.length ? `<ul class="rows">${bl.map(b => `<li><div class="grow1"><div class="title n">${b.kind === 'auto' ? 'Automatique' : b.kind === 'securite' ? 'Sécurité (avant remplacement)' : 'Manuelle'} · ${fmtShort(b.at)} ${b.ts ? timeOf(b.ts) : ''}</div><div class="meta"><span class="muted small">${fmt(Math.round((b.size || 0) / 1024))} Ko</span></div></div><button type="button" class="btn btn-xs" data-a="restoreAsk" data-id="${esc(b.id)}">Restaurer</button></li>`).join('')}</ul>` : '<p class="small muted">Aucune sauvegarde.</p>') : ''}
    ${ui.restoreId ? `<form class="form-row" data-f="restoreConfirm" data-id="${esc(ui.restoreId)}" style="margin-top:10px"><div class="grow"><label class="lbl" for="rs-ok">Tape RESTAURER pour remplacer les données actuelles</label><input type="text" id="rs-ok" class="draft" name="ok" autocomplete="off"></div><button type="submit" class="btn danger" ${dataBusy ? 'disabled' : ''}>Restaurer</button><button type="button" class="btn btn-ghost" data-a="restoreCancel">Annuler</button></form>` : ''}` : '')}
  ${mode === 'db' ? '' : localBackupsCard()}
  ${restartCard()}
  ${sectionCard('Tout supprimer', `<p class="small">Efface toutes les données de ce tableau de bord${mode === 'db' ? ' (une sauvegarde de sécurité est faite avant)' : ''}. Irréversible sans sauvegarde.</p>
    <form class="form-row" data-f="wipeConfirm" style="margin-top:8px"><div class="grow"><label class="lbl" for="wipe-ok">Tape SUPPRIMER pour confirmer</label><input type="text" id="wipe-ok" class="draft" name="ok" autocomplete="off"></div><button type="submit" class="btn danger" ${dataBusy ? 'disabled' : ''}>Tout supprimer</button></form>`, '', 'danger-zone')}`;
};
SETV.avance = () => {
  const ev = ctx.xpEv.slice(-40).reverse();
  const edits = logItems('2000-01-01', '2999-12-31').filter(l => l.type === 'correction' || l.type === 'regles').reverse().slice(0, 20);
  return `${sectionCard('Contexte pour le coach', `<p class="small muted">Texte lu par Claude avant chaque interprétation : qui tu es, ce que tu vises, tes points de vigilance. Stocké dans ta base, jamais dans le code de la page.</p><label class="sr" for="set-profile">Contexte</label><textarea id="set-profile" data-c="set" data-path="profile" data-type="str" rows="5" maxlength="1500">${esc(R().profile || '')}</textarea>`)}
  ${sectionCard('Journal XP', `<p class="small muted">Chaque gain est tracé : le total se recalcule et s'explique à partir de ces lignes.</p>${ev.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Gain</th><th>Source</th><th>XP</th></tr></thead><tbody>${ev.map(e => `<tr><td>${fmtShort(e.d)}</td><td>${esc(e.label)}${e.note ? ` <span class="muted small">(${esc(e.note)})</span>` : ''}</td><td class="muted small">${esc(XP_SRC[e.src] || e.src)}</td><td class="xp">+${fmt(e.xp)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Aucun gain pour l’instant.</p>'}`, `${fmt(ctx.careerXp)} XP au total`)}
  ${sectionCard('Règles et corrections', `<p class="small">Règles de score : v${R().rulesVersion}. Les matchs terminés sont figés avec leurs règles ; un match corrigé après coup est recalculé avec ses propres règles et marqué « corrigé ».</p>${edits.length ? `<ul class="clog">${edits.map(l => `<li><b>${fmtShort(l.date)}</b>${esc(l.text)}</li>`).join('')}</ul>` : ''}<div class="row-wrap" style="margin-top:8px"><button type="button" class="btn btn-sm" data-a="finalizeNow">Figer les matchs passés maintenant</button></div>`)}`;
};

/* ---------- export */
function allData() { const d = { app: 'ma-saison', version: 2, exportedAt: new Date().toISOString() }; COLLS.forEach(c => { d[c] = S[c]; }); return d; }
const csvSep = () => (LANG === 'en' ? ',' : ';');
const csvCell = v => { const s = v == null ? '' : String(v); return /[";,\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvRows = rows => '﻿' + rows.map(r => r.map(csvCell).join(csvSep())).join('\r\n');
const STANDALONE = !window.claude;
const fileSlug = () => String(R().clubName || thBrand()).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ma-saison';
async function saveFile(filename, data) {
  if (!downloadsApi && STANDALONE) {
    try {
      const url = URL.createObjectURL(new Blob([data], { type: /\.csv$/.test(filename) ? 'text/csv;charset=utf-8' : 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      toast('Fichier téléchargé.');
    } catch (e) { toast('Téléchargement impossible dans ce navigateur.', 'bad'); }
    return;
  }
  if (!downloadsApi) { toast('Export indisponible ici.', 'bad'); return; }
  try { await downloadsApi.save({ filename, data }); toast('Fichier prêt.'); }
  catch (e) {
    const code = e && e.code;
    if (code === 'declined') return;
    if (code === 'rate_limited') toast('Une fenêtre d’enregistrement est déjà ouverte.');
    else { toast('Export impossible ici.', 'bad'); }
  }
}
ACT.exportJson = () => saveFile(`${fileSlug()}-${ctx.today}.json`, JSON.stringify(allData(), null, 2));
ACT.exportCsv = b => {
  if (b.dataset.v === 'quetes') {
    const rows = [TX(['id', 'titre', 'domaine', 'type', 'priorité', 'échéance', 'faite', 'date', 'xp', 'planifiée', 'reports', 'objectif'])];
    questArr().forEach(q => { const e = findEv('q:' + q.id); rows.push([q.id, q.title, areaInfo(q.area).label, KIND[q.kind] || '', PRIO[q.prio] || 'Normale', q.due || '', q.done ? TX('oui') : TX('non'), q.doneDate || '', e ? e.e.xp : '', q.planned === false ? 'non' : q.done ? 'oui' : '', q.postponed || 0, q.goal && S.goals[q.goal] ? S.goals[q.goal].title : '']); });
    saveFile(`${fileSlug()}-quetes-${ctx.today}.csv`, csvRows(rows));
  } else {
    const rows = [TX(['date', 'saison', 'type', 'résultat', 'score', 'coups faits', 'coups requis', 'routine faite', 'routine prévue', 'clôturé', 'xp', 'corrigé'])];
    const l = seasonList();
    if (l.length) for (const k of dayRange(l[0].start, minKey(l[l.length - 1].end, ctx.today))) {
      const r = dayResult(k); const s = seasonAt(k);
      if (!s) continue;
      rows.push([k, s.name || s.id, DAY_TYPES[r.type] ? DAY_TYPES[r.type].label : '', r.t === 'live' ? 'En cours' : RES[r.t].l, r.score == null ? '' : r.score, r.pDone || 0, r.req || 0, r.hDone || 0, r.hDue || 0, r.closed ? TX('oui') : TX('non'), ctx.xpByDay[k] || 0, r.edited ? TX('oui') : TX('non')]);
    }
    saveFile(`${fileSlug()}-matchs-${ctx.today}.csv`, csvRows(rows));
  }
};

/* ---------- import */
CHG.importFile = el => {
  const file = el.files && el.files[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(String(rd.result || ''));
      if (!isObj(d) || !COLLS.some(c => isObj(d[c]))) throw new Error('format');
      const clean = {};
      COLLS.forEach(c => { clean[c] = isObj(d[c]) ? d[c] : {}; });
      importPending = clean;
      toast('Fichier lu : confirme l’import.');
    } catch (e) { importPending = null; toast('Fichier illisible : il faut un export JSON de ce tableau de bord.', 'bad'); }
    render();
  };
  rd.onerror = () => toast('Lecture du fichier impossible.', 'bad');
  rd.readAsText(file);
};
ACT.importCancel = () => { importPending = null; render(); };
FORM.importConfirm = async f => {
  if (f.elements.ok.value.trim() !== 'REMPLACER') { toast('Tape REMPLACER en majuscules pour confirmer.'); return; }
  if (!importPending || !canWrite()) return;
  const data = importPending;
  clearDirty(f);
  await replaceAll(data, 'Import terminé.');
  importPending = null; render();
};

/* ---------- sauvegardes dans la base */
async function createBackup(kind) {
  if (mode !== 'db' || !dbApi) return false;
  const json = JSON.stringify(allData());
  const size = 90000, n = Math.max(1, Math.ceil(json.length / size));
  const bid = 'b-' + ctx.today.replace(/-/g, '') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    for (let i = 0; i < n; i++) { await dbApi.doc(`backups/${bid}~${i}`).set({ type: 'chunk', i, data: json.slice(i * size, (i + 1) * size) }); await sleep(40); }
    await dbApi.doc(`backups/${bid}`).set({ type: 'index', kind, at: ctx.today, ts: nowTs(), chunks: n, size: json.length });
    await pruneBackups(kind, kind === 'auto' ? 4 : kind === 'securite' ? 3 : 6);
    return true;
  } catch (e) { writeError(e); return false; }
}
async function listBackups() {
  if (mode !== 'db' || !dbApi) return [];
  const snap = await dbApi.collection('backups').where('type', '==', 'index').limit(200).get();
  return snap.docs.filter(d => d.exists).map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}
async function pruneBackups(kind, keep) {
  const l = (await listBackups()).filter(b => b.kind === kind);
  for (const b of l.slice(keep)) {
    for (let i = 0; i < (Number(b.chunks) || 1); i++) { await dbApi.doc(`backups/${b.id}~${i}`).delete(); await sleep(30); }
    await dbApi.doc(`backups/${b.id}`).delete();
  }
}
ACT.backupNow = async () => {
  if (dataBusy || !canWrite()) return;
  dataBusy = true; render();
  const ok = await createBackup('manuel');
  dataBusy = false;
  if (ok) { toast('Sauvegarde faite.'); backupList = await listBackups().catch(() => backupList); }
  render();
};
ACT.backupList = async () => { try { backupList = await listBackups(); } catch (e) { toast('Liste des sauvegardes indisponible.', 'bad'); } render(); };
ACT.restoreAsk = b => { ui.restoreId = b.dataset.id; render(); };
ACT.restoreCancel = () => { ui.restoreId = null; render(); };
FORM.restoreConfirm = async f => {
  if (f.elements.ok.value.trim() !== 'RESTAURER') { toast('Tape RESTAURER en majuscules pour confirmer.'); return; }
  const bid = f.dataset.id;
  if (!canWrite() || dataBusy) return;
  clearDirty(f);
  if (bid.indexOf('local:') === 0) {
    const b = localBackups()[Number(bid.slice(6))];
    ui.restoreId = null;
    try { await replaceAll(JSON.parse(b.data), 'Sauvegarde restaurée.'); }
    catch (e) { toast('Sauvegarde locale illisible.', 'bad'); }
    render();
    return;
  }
  dataBusy = true; render();
  try {
    const idx = await dbApi.doc(`backups/${bid}`).get();
    if (!idx.exists) throw new Error('absent');
    const n = Number(idx.data().chunks) || 1;
    let json = '';
    for (let i = 0; i < n; i++) { const c = await dbApi.doc(`backups/${bid}~${i}`).get(); if (!c.exists) throw new Error('morceau manquant'); json += c.data().data; }
    const d = JSON.parse(json);
    dataBusy = false;
    await replaceAll(d, 'Sauvegarde restaurée.');
  } catch (e) { dataBusy = false; toast('Restauration impossible : sauvegarde incomplète ou illisible.', 'bad'); }
  ui.restoreId = null; render();
};
FORM.wipeConfirm = async f => {
  if (f.elements.ok.value.trim() !== 'SUPPRIMER') { toast('Tape SUPPRIMER en majuscules pour confirmer.'); return; }
  if (!canWrite()) return;
  clearDirty(f);
  const empty = {}; COLLS.forEach(c => { empty[c] = {}; });
  await replaceAll(empty, 'Toutes les données ont été supprimées.');
};
async function replaceAll(data, doneMsg) {
  if (dataBusy) return;
  dataBusy = true; render();
  try {
    if (mode === 'db') {
      await createBackup('securite');
      for (const c of COLLS) {
        const next = isObj(data[c]) ? data[c] : {};
        for (const id of Object.keys(S[c])) { if (!(id in next)) { await dbApi.doc(`${c}/${id}`).delete(); await sleep(25); } }
        for (const id of Object.keys(next)) { if (isObj(next[id])) { await dbApi.doc(`${c}/${id}`).set(next[id]); await sleep(25); } }
      }
    }
    COLLS.forEach(c => { S[c] = isObj(data[c]) ? clone(data[c]) : {}; });
    saveCache();
    toast(doneMsg);
  } catch (e) { writeError(e); }
  dataBusy = false;
  render();
}
ACT.finalizeNow = () => { const n = finalizePast(true); toast(n ? `${plural(n, 'match figé', 'matchs figés')}.` : 'Tous les matchs passés sont déjà figés.'); };

/* =========================================================
   Nouveau départ : décaler la saison à une date propre sans
   perdre la structure (projets, routine, quêtes, bibliothèque).
   ========================================================= */
function nextMondayKey() { const m = mondayOf(ctx.today); return m > ctx.today ? m : addDays(m, 7); }
function restartPlan(from) {
  const s = ctx.seasonRef;
  if (!s || !isKey(from)) return null;
  const shift = daysBetween(s.start, from);
  const days = [];
  Object.keys(S.matches).forEach(mk => { const d = (S.matches[mk] && S.matches[mk].days) || {}; Object.keys(d).forEach(k => { if (k >= s.start && k < from) days.push(k); }); });
  const quests = questArr().filter(q => !q.done && isKey(q.due) && q.due < from);
  const goals = goalArr().filter(g => !g.done && ((g.horizon === 'semaine' && g.period < weekKeyOf(from)) || (g.horizon === 'mois' && g.period < monthOf(from))));
  const xp = ctx.xpEv.filter(e => e.d >= s.start && e.d < from);
  return { s, from, shift, days, quests, goals, xp };
}
function restartCard() {
  const s = ctx.seasonRef;
  if (!s) return '';
  const from = isKey(ui.restartFrom) ? ui.restartFrom : nextMondayKey();
  const p = restartPlan(from);
  const ok = p && p.shift !== 0;
  const lines = p ? [
    `Début de la saison : ${fmtLong(s.start)} → <b>${fmtLong(from)}</b>${isKey(s.capStart) ? ` (le cap suit : ${fmtShort(s.capStart)} → ${fmtShort(from)})` : ''}`,
    p.days.length ? `${plural(p.days.length, 'journée effacée', 'journées effacées')} : scores, forfaits et saisies entre les deux dates` : 'Aucune journée à effacer',
    p.xp.length ? `${plural(p.xp.length, 'gain d’XP annulé', 'gains d’XP annulés')} (${fmt(sum(p.xp.map(e => e.xp)))} XP)` : 'Aucune XP à annuler',
    p.quests.length ? `${plural(p.quests.length, 'échéance décalée', 'échéances décalées')} de ${plural(Math.abs(p.shift), 'jour')}` : 'Aucune échéance à décaler',
    p.goals.length ? `${plural(p.goals.length, 'objectif de semaine ou de mois reporté', 'objectifs de semaine ou de mois reportés')} sur la période qui commence` : 'Aucun objectif à reporter'
  ] : [];
  return sectionCard('Nouveau départ', `<p class="small">Recale la saison sur une date propre — un lundi, le début d'un mois — et efface les journées de rodage qui la précèdent. Les projets, la compo, la routine, les quêtes, la bibliothèque et le réseau sont conservés : seule l'histoire jouée est remise à zéro.</p>
    <div class="form-row" style="margin-top:10px">
      <div class="fix"><label class="lbl" for="rst-from">Nouveau début de saison</label><input type="date" id="rst-from" data-c="restartFrom" value="${esc(from)}"></div>
      <div class="grow"><span class="lbl">Raccourcis</span><div class="row-wrap"><button type="button" class="btn btn-sm btn-ghost" data-a="restartPick" data-v="${nextMondayKey()}">Lundi prochain</button><button type="button" class="btn btn-sm btn-ghost" data-a="restartPick" data-v="${firstOfMonth(shiftMonth(monthOf(ctx.today), 1))}">Début du mois prochain</button><button type="button" class="btn btn-sm btn-ghost" data-a="restartPick" data-v="${ctx.today}">Aujourd'hui</button></div></div>
    </div>
    ${ok ? `<ul class="facts" style="margin-top:10px">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
    ${p.shift < 0 ? '<div class="alert">La date choisie est avant le début actuel : la saison sera rallongée et rien ne sera effacé.</div>' : ''}
    <form class="form-row" data-f="restartConfirm" data-from="${esc(from)}" style="margin-top:10px"><div class="grow"><label class="lbl" for="rst-ok">Tape REDÉMARRER pour confirmer</label><input type="text" id="rst-ok" class="draft" name="ok" autocomplete="off"></div><button type="submit" class="btn danger" ${dataBusy ? 'disabled' : ''}>Redémarrer la saison</button></form>`
    : '<p class="small muted" style="margin-top:10px">Choisis une date différente du début actuel de la saison.</p>'}`, `${esc(s.name || s.id)}`, 'restart');
}
CHG.restartFrom = el => { if (isKey(el.value)) { ui.restartFrom = el.value; render(); } };
ACT.restartPick = b => { ui.restartFrom = b.dataset.v; render(); };
FORM.restartConfirm = f => {
  if (f.elements.ok.value.trim() !== 'REDÉMARRER') { toast('Tape REDÉMARRER en majuscules pour confirmer.'); return; }
  const p = restartPlan(f.dataset.from);
  if (!p || !canWrite()) return;
  clearDirty(f);
  const { s, from, shift } = p;
  /* 1. journées effacées */
  const touched = {};
  p.days.forEach(k => { const mk = monthOf(k); const m = touched[mk] || (touched[mk] = clone(S.matches[mk]) || { days: {} }); delete m.days[k]; });
  Object.keys(touched).forEach(mk => { const m = touched[mk]; if (!Object.keys(m.days || {}).length) del('matches', mk, { system: true, silent: true }); else put('matches', mk, m, { system: true, silent: true }); });
  /* 2. XP de la période annulée */
  p.xp.forEach(e => xpRevoke(e.id));
  /* 3. saison recalée */
  const sd = clone(S.seasons[s.id]);
  sd.start = from;
  if (isKey(sd.capStart) && sd.capStart < from) sd.capStart = from;
  if (isKey(sd.end) && sd.end <= from) sd.end = addDays(from, 280);
  put('seasons', s.id, sd);
  /* 4. échéances et objectifs décalés */
  p.quests.forEach(q => { const d = clone(S.quests[q.id]); d.due = addDays(q.due, shift); put('quests', q.id, d, { silent: true }); });
  p.goals.forEach(g => { const d = clone(S.goals[g.id]); d.period = g.horizon === 'semaine' ? weekKeyOf(from) : monthOf(from); put('goals', g.id, d, { silent: true }); });
  /* 5. l'agent repart d'une page blanche */
  agRuns().forEach(r => del('agent', r.id, { system: true, silent: true }));
  if (S.agent.state) del('agent', 'state', { system: true, silent: true });
  addLog('regles', `Nouveau départ : saison recalée au ${fmtLong(from)}, ${p.days.length} journées effacées, ${p.quests.length} échéances et ${p.goals.length} objectifs décalés.`);
  ui.restartFrom = null; ui.day = ctx.today;
  toast('Saison redémarrée.');
  render();
};
