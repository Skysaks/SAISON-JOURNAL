/* =========================================================
   Surcouches : ajout rapide, recherche globale, menu « Plus », imprévu
   ========================================================= */
function overlayHtml() {
  const o = ui.overlay;
  if (!o) return '';
  let inner = '';
  if (o.type === 'more') inner = `<div class="sheet-h"><h2>Plus</h2><button type="button" class="iconbtn" data-a="ovlClose" aria-label="Fermer">${ICON.x}</button></div>
    <div class="more-grid">${[['compo', 'Compo'], ['savoir', 'Bibliothèque'], ['reseau', 'Réseau'], ['mood', 'Moodboard'], ['reglages', 'Réglages'], ['guide', 'Guide']].map(([t, l]) => `<button type="button" class="more-b" data-a="go" data-tab="${t}">${l}${tabBadge(t)}</button>`).join('')}
    <button type="button" class="more-b" data-a="perf" data-v="carriere">Carrière</button><button type="button" class="more-b" data-a="perf" data-v="analytics">Analyses</button><button type="button" class="more-b" data-a="search">Rechercher</button></div>`;
  else if (o.type === 'quick') inner = quickHtml(o);
  else if (o.type === 'search') inner = searchHtml(o);
  else if (o.type === 'imprevu') inner = `<div class="sheet-h"><h2>Déclarer un imprévu</h2><button type="button" class="iconbtn" data-a="ovlClose" aria-label="Fermer">${ICON.x}</button></div>
    <p class="small">${esc(cap1(fmtDay(o.k)))} passe en match « Imprévu » : 1 coup requis au lieu de 3. Le match est recalculé avec ses propres règles et marqué « corrigé ». À réserver aux vraies urgences, pas aux journées abandonnées.</p>
    <form class="stack" data-f="imprevu" data-k="${o.k}"><div><label class="lbl" for="imp-reason">Ce qui s'est passé (obligatoire)</label><input type="text" id="imp-reason" class="draft" name="reason" maxlength="200" autocomplete="off"></div><div class="row-wrap"><button type="submit" class="btn btn-primary">Confirmer</button><button type="button" class="btn btn-ghost" data-a="ovlClose">Annuler</button></div></form>`;
  return `<div class="ovl-back" data-a="ovlClose"></div><div class="sheet ${o.type}" role="dialog" aria-modal="true" aria-label="${o.type === 'search' ? 'Recherche' : o.type === 'quick' ? 'Ajout rapide' : 'Menu'}">${inner}</div>`;
}
function quickHtml(o) {
  const kinds = [['quete', 'Quête'], ['contact', 'Contact'], ['savoir', 'Savoir'], ['note', 'Note']];
  const k = o.kind || 'quete';
  let form = '';
  if (k === 'quete') form = `<form class="stack" data-f="quickAdd" data-kind="quete">
      <div><label class="lbl" for="qa-title">Quête</label><input type="text" id="qa-title" class="draft" name="title" maxlength="160" placeholder="Un verbe et un résultat" autocomplete="off"></div>
      <div class="form-row"><div class="grow"><label class="lbl" for="qa-area">Domaine</label><select id="qa-area" class="draft" name="area">${areaOptions(defaultArea())}</select></div><div class="grow"><label class="lbl" for="qa-kind">Type</label><select id="qa-kind" class="draft" name="kind">${kindOptions(R().quests.defaultKind)}</select></div></div>
      <div class="form-row"><div class="grow"><label class="lbl" for="qa-prio">Priorité</label><select id="qa-prio" class="draft" name="prio">${prioOptions(R().quests.defaultPrio)}</select></div><div class="grow"><label class="lbl" for="qa-due">Échéance</label><input type="date" id="qa-due" class="draft" name="due"></div></div>
      <label class="switch"><input type="checkbox" id="qa-today" class="draft" name="today"><span>Ajouter aux coups du jour</span></label>
      <button type="submit" class="btn btn-primary">Ajouter</button></form>`;
  else if (k === 'contact') form = `<form class="stack" data-f="quickAdd" data-kind="contact">
      <div><label class="lbl" for="qa-name">Nom</label><input type="text" id="qa-name" class="draft" name="name" maxlength="80" autocomplete="off"></div>
      <div class="form-row"><div class="grow"><label class="lbl" for="qa-role">Rôle</label><select id="qa-role" class="draft" name="role">${Object.keys(ROLES).map(r => `<option value="${r}">${ROLES[r]}</option>`).join('')}</select></div><div class="grow"><label class="lbl" for="qa-cad">Relancer tous les</label><select id="qa-cad" class="draft" name="cadence">${[7, 14, 30, 60, 90].map(n => `<option value="${n}"${n === 30 ? ' selected' : ''}>${n} jours</option>`).join('')}</select></div></div>
      <div class="form-row"><div class="grow"><label class="lbl" for="qa-org">Club ou structure</label><input type="text" id="qa-org" class="draft" name="org" maxlength="80"></div><div class="grow"><label class="lbl" for="qa-tags">Tags</label><input type="text" id="qa-tags" class="draft" name="tags" maxlength="120" placeholder="jeunes, régional"></div></div>
      <div><label class="lbl" for="qa-next">Prochaine action</label><input type="text" id="qa-next" class="draft" name="next" maxlength="200"></div>
      <button type="submit" class="btn btn-primary">Ajouter</button></form>`;
  else if (k === 'savoir') form = `<form class="stack" data-f="quickAdd" data-kind="savoir">
      <div><label class="lbl" for="qa-lt">Titre</label><input type="text" id="qa-lt" class="draft" name="title" maxlength="160" autocomplete="off"></div>
      <div class="form-row"><div class="grow"><label class="lbl" for="qa-la">Auteur ou source</label><input type="text" id="qa-la" class="draft" name="author" maxlength="100"></div><div class="grow"><label class="lbl" for="qa-lk">Type</label><select id="qa-lk" class="draft" name="kind">${Object.keys(LIB_KINDS).map(x => `<option value="${x}">${LIB_KINDS[x]}</option>`).join('')}</select></div></div>
      <div><label class="lbl" for="qa-lr">Domaine</label><select id="qa-lr" class="draft" name="area">${areaOptions('esprit')}</select></div>
      <button type="submit" class="btn btn-primary">Ajouter à lire</button></form>`;
  else form = `<form class="stack" data-f="quickAdd" data-kind="note">
      <div><label class="lbl" for="qa-note">Note du jour</label><textarea id="qa-note" class="draft" name="text" maxlength="400" rows="3" placeholder="Rangée dans le Full Time d'aujourd'hui"></textarea></div>
      <button type="submit" class="btn btn-primary">Noter</button></form>`;
  return `<div class="sheet-h"><h2>Ajout rapide</h2><button type="button" class="iconbtn" data-a="ovlClose" aria-label="Fermer">${ICON.x}</button></div>
    <div class="seg-nav sm" role="tablist">${kinds.map(([id, l]) => `<button type="button" role="tab" aria-selected="${k === id}" data-a="quickKind" data-v="${id}">${l}</button>`).join('')}</div>${form}`;
}
function searchIndex() {
  const out = [];
  questArr().forEach(q => out.push({ t: 'Quête', l: q.title, s: `${areaInfo(q.area).label}${q.done ? ' · faite' : ''}`, go: { a: 'goQuest', id: q.id }, txt: q.title }));
  ctx.projects.forEach(p => out.push({ t: 'Projet', l: p.name, s: STATUS[statusAt(p, ctx.today)], go: { a: 'go', tab: 'compo' }, txt: `${p.name} ${p.why || ''}` }));
  contactArr().forEach(c => out.push({ t: 'Contact', l: c.name, s: `${ROLES[c.role] || ''}${c.org ? ' · ' + c.org : ''}`, go: { a: 'netOpen', id: c.id }, txt: `${c.name} ${c.org || ''} ${c.tags.join(' ')} ${c.notes || ''} ${c.next || ''}` }));
  libArr().forEach(x => {
    out.push({ t: 'Lecture', l: x.title, s: LIB_STATUS[x.status] || '', go: { a: 'libOpen', id: x.id }, txt: `${x.title} ${x.author || ''} ${x.takeaway || ''} ${x.action || ''}` });
    libNotesOf(x).forEach(n => out.push({ t: NOTE_KINDS[n.type].l, l: String(n.text).slice(0, 90), s: x.title, go: { a: 'libOpen', id: x.id }, txt: n.text }));
  });
  goalArr().forEach(g => out.push({ t: 'Objectif', l: g.title, s: HORIZON[g.horizon] || '', go: { a: 'perf', v: g.horizon === 'semaine' ? 'semaine' : g.horizon === 'mois' ? 'mois' : 'saison' }, txt: g.title }));
  moodArr().forEach(t => out.push({ t: 'Moodboard', l: t.title || t.text || t.url || MOOD_KINDS[t.kind], s: MOOD_KINDS[t.kind], go: { a: 'go', tab: 'mood' }, txt: `${t.title || ''} ${t.text || ''} ${t.author || ''} ${t.url || ''}` }));
  rewardArr().forEach(r => out.push({ t: 'Récompense', l: r.title, s: REWARD_TYPES[r.type], go: { a: 'perf', v: 'carriere' }, txt: r.title }));
  Object.keys(S.matches).forEach(mk => { const days = (S.matches[mk] && S.matches[mk].days) || {}; Object.keys(days).forEach(k => { const d = days[k] || {}; const ft = d.ft || {}; const notes = (d.notes || []).map(n => n.text).join(' '); const blob = `${fmtDay(k)} ${ft.shipped || ''} ${ft.block || ''} ${ft.adjust || ''} ${ft.lesson || ''} ${notes}`; out.push({ t: 'Match', l: cap1(fmtDay(k)), s: ft.lesson || ft.shipped || notes || '', go: { a: 'dayGo', k }, txt: blob }); }); });
  return out;
}
function searchHtml(o) {
  const q = String(o.q || '').trim().toLowerCase();
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q);
  const res = nq.length >= 2 ? searchIndex().filter(x => norm(x.txt).includes(nq)).slice(0, 30) : [];
  const attrs = g => Object.keys(g).map(k2 => `data-${k2 === 'a' ? 'a' : k2}="${esc(g[k2])}"`).join(' ');
  return `<div class="sheet-h"><h2>Rechercher</h2><button type="button" class="iconbtn" data-a="ovlClose" aria-label="Fermer">${ICON.x}</button></div>
    <label class="sr" for="srch">Rechercher</label><input type="search" id="srch" data-live="search" value="${esc(o.q || '')}" placeholder="Quête, projet, contact, leçon, match…" autocomplete="off">
    <ul class="srch">${nq.length < 2 ? '<li class="muted small">Tape au moins 2 lettres.</li>' : res.length ? res.map(x => `<li><button type="button" ${attrs(x.go)} data-close="1"><span class="st">${x.t}</span><span class="sl">${esc(x.l)}</span><span class="ss">${esc(String(x.s).slice(0, 90))}</span></button></li>`).join('') : '<li class="muted small">Aucun résultat.</li>'}</ul>`;
}
