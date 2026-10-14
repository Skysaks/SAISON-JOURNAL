/* =========================================================
   Bibliothèque : lectures (livres, articles, cours…), notes liées
   à chacune, et la boucle qui compte — l'idée appliquée.
   Les notes ne rapportent pas d'XP : c'est l'application qui en donne.
   ========================================================= */
const libArr = () => arr('knowledge_items').filter(x => x.title);
const libStatus = x => (LIB_STATUS[x.status] ? x.status : 'a_lire');
function libNotesOf(x) {
  return (Array.isArray(x.notes) ? x.notes : []).filter(n => n && n.text)
    .map(n => Object.assign({ type: NOTE_KINDS[n.type] ? n.type : 'idee' }, n))
    .sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')) || (b.ts || 0) - (a.ts || 0));
}
/* toutes les notes de la bibliothèque, avec leur lecture d'origine */
function libNotes() {
  const out = [];
  libArr().forEach(x => libNotesOf(x).forEach(n => out.push(Object.assign({}, n, { item: x, itemId: x.id }))));
  return out.sort((a, b) => String(b.d || '').localeCompare(String(a.d || '')) || (b.ts || 0) - (a.ts || 0));
}
/* dernier signe de vie d'une lecture : note, progression, démarrage */
function libLastTouch(x) {
  const ns = libNotesOf(x);
  const dates = [x.startedDate, x.progressDate, x.finishedDate].filter(isKey).concat(ns.map(n => n.d).filter(isKey));
  return dates.length ? dates.sort()[dates.length - 1] : null;
}
function libProgress(x) {
  const tot = Number(x.pages) || 0, cur = Number(x.page) || 0;
  if (tot > 0) return clamp(Math.round(cur / tot * 100), 0, 100);
  return clamp(Math.round(Number(x.progress) || 0), 0, 100);
}
const LIB_TABS = [['lectures', 'Lectures'], ['notes', 'Notes'], ['lecons', 'Leçons du terrain']];

VIEWS.savoir = () => {
  const sub = LIB_TABS.some(t => t[0] === ui.lib.tab) ? ui.lib.tab : 'lectures';
  const items = libArr();
  const Y = ctx.today.slice(0, 4);
  const finishedY = items.filter(x => x.status === 'termine' && String(x.finishedDate || '').startsWith(Y));
  const notes = libNotes();
  const goal = Number(R().lib.goalYear) || 0;
  const enCours = items.filter(x => x.status === 'en_cours');
  const toApply = items.filter(x => x.status === 'termine' && !x.applied);
  const ns = toApply.length
    ? nextStep(`Idée à appliquer : « ${esc(toApply[0].takeaway || toApply[0].title)} »`, !toApply[0].questId ? `<button type="button" class="btn btn-sm" data-a="libToQuest" data-id="${toApply[0].id}">Transformer en action</button>` : '')
    : enCours.length ? nextStep(`En cours : ${esc(enCours[0].title)}${libProgress(enCours[0]) ? ` (${libProgress(enCours[0])} %)` : ''}`, `<button type="button" class="btn btn-sm" data-a="libOpen" data-id="${enCours[0].id}">Prendre une note</button>`)
      : nextStep('Commence une ressource de la liste « À lire ».');
  const body = sub === 'notes' ? libNotesView(notes) : sub === 'lecons' ? libLessonsView() : libShelfView(items);
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">${plural(items.length, 'ressource')} · ${plural(notes.length, 'note')}</div><h1>Bibliothèque</h1></div><button type="button" class="btn btn-primary" data-a="quick" data-kind="savoir">Ajouter</button></div>
  <div class="kpis top">${kpi(enCours.length, 'en cours')}${kpi(finishedY.length + (goal ? `<span class="muted">/${goal}</span>` : ''), `terminés en ${Y}`)}${kpi(notes.length, 'notes')}${kpi(items.filter(x => x.applied).length, 'idées appliquées', 'gold')}</div>
  <div class="view-top">${ns}</div>
  <div class="seg-nav" role="tablist" aria-label="Bibliothèque">${LIB_TABS.map(([id, l]) => `<button type="button" role="tab" aria-selected="${sub === id}" data-a="libTab" data-v="${id}">${l}${id === 'notes' && notes.length ? ` <span class="cnt">${notes.length}</span>` : ''}</button>`).join('')}</div>
  ${body}`;
};

/* ---------- étagère : trois colonnes, une fiche dépliable par ressource */
function libShelfView(items) {
  const fa = ui.lib.area;
  const fk = ui.lib.kind || 'all';
  const shown = items.filter(x => (fa === 'all' || x.area === fa) && (fk === 'all' || x.kind === fk));
  const col = st => shown.filter(x => libStatus(x) === st)
    .sort((a, b) => st === 'termine' ? String(b.finishedDate || '').localeCompare(String(a.finishedDate || '')) : String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const cols = ['a_lire', 'en_cours', 'termine'].map(st => {
    const a = col(st);
    return `<div class="lib-col"><h3>${LIB_STATUS[st]} <span class="muted small">${a.length}</span></h3>${a.length ? a.map(libItem).join('') : `<p class="small muted">${st === 'a_lire' ? 'Rien en attente.' : st === 'en_cours' ? 'Rien en cours.' : 'Rien de terminé pour l’instant.'}</p>`}</div>`;
  }).join('');
  const areas = ['all'].concat(ctx.projects.filter(p => statusAt(p, ctx.today) !== 'tribune').map(p => p.id), Object.keys(LIFE));
  const kinds = ['all'].concat(Object.keys(LIB_KINDS));
  const open = ui.lib.open && S.knowledge_items[ui.lib.open] ? Object.assign({ id: ui.lib.open }, S.knowledge_items[ui.lib.open]) : null;
  return `${open ? libSheet(open) : ''}<section class="card">
    <div class="chips" style="margin-bottom:8px">${areas.map(a => `<button type="button" class="chipbtn ${fa === a ? 'on' : ''}" data-a="libArea" data-v="${esc(a)}">${a === 'all' ? 'Tout' : esc(areaInfo(a).label)}</button>`).join('')}</div>
    <div class="chips" style="margin-bottom:14px"><span class="muted small">Type :</span>${kinds.map(k => `<button type="button" class="chipbtn sm ${fk === k ? 'on' : ''}" data-a="libKind" data-v="${k}">${k === 'all' ? 'Tous' : LIB_KINDS[k]}</button>`).join('')}</div>
    <div class="lib">${cols}</div>
    <p class="small muted" style="margin-top:12px">Terminer avec l'idée clé : +${xpv('book')} XP. L'appliquer (la quête liée est faite, ou tu le déclares) : +${xpv('applied')} XP. Les notes ne rapportent rien : elles servent à retrouver, pas à marquer des points.</p>
  </section>`;
}

/* ---------- la fiche ouverte : pleine largeur, au-dessus des colonnes */
function libSheet(x) {
  const ns = libNotesOf(x), pr = libProgress(x), tot = Number(x.pages) || 0;
  const st = libStatus(x);
  const q = x.questId && S.quests[x.questId] ? S.quests[x.questId] : null;
  const acts = st === 'a_lire' ? `<button type="button" class="btn btn-sm" data-a="libStart" data-id="${x.id}">Commencer</button>`
    : st === 'en_cours' ? `<button type="button" class="btn btn-sm" data-a="libFinishOpen" data-id="${x.id}">Terminer</button>`
      : `<button type="button" class="btn btn-sm btn-ghost" data-a="libReopen" data-id="${x.id}">Rouvrir</button>`;
  const nk = ui.lib.noteKind || 'idee';
  return `<section class="card lib-sheet" id="lib-${esc(x.id)}">
    <div class="card-h"><h2>${esc(x.title)}</h2><button type="button" class="iconbtn" data-a="libOpen" data-id="${x.id}" aria-label="Fermer la fiche">${ICON.x}</button></div>
    <div class="meta">${x.author ? `<span class="small muted">${esc(x.author)}</span>` : ''}<span class="chip">${esc(LIB_KINDS[x.kind] || 'Contenu')}</span>${areaChip(x.area)}<span class="chip">${LIB_STATUS[st]}</span>${ns.length ? `<span class="tag">${plural(ns.length, 'note')}</span>` : ''}${x.finishedDate ? `<span class="due">terminé le ${fmtShort(x.finishedDate)}</span>` : ''}</div>
    ${st !== 'a_lire' ? `<div class="form-row lib-prog">
      ${tot ? `<div class="tiny"><label class="lbl" for="lpg-${x.id}">Page sur ${tot}</label><input type="number" id="lpg-${x.id}" data-c="libPage" data-id="${x.id}" min="0" max="${tot}" step="1" value="${Number(x.page) || 0}"></div>`
      : `<div class="tiny"><label class="lbl" for="lp-${x.id}">Progression %</label><input type="number" id="lp-${x.id}" data-c="libProgress" data-id="${x.id}" min="0" max="100" step="5" value="${pr}"></div>`}
      <div class="grow"><span class="lbl">${pr} %</span><div class="prog thin"><i style="width:${pr}%"></i></div></div>
      <div class="fix">${acts}</div></div>` : `<div class="row-wrap">${acts}</div>`}
    ${st === 'termine' ? `${x.takeaway ? `<div class="quote">${esc(x.takeaway)}</div>` : ''}${x.action ? `<p class="small"><b>Action :</b> ${esc(x.action)}</p>` : ''}${libStars(x)}
      <div class="row-wrap">${q ? `<span class="small">${q.done ? '✓ Quête liée faite' : 'Quête liée ouverte'} : ${esc(q.title)}</span>` : `<button type="button" class="btn btn-sm" data-a="libToQuest" data-id="${x.id}">Transformer en action</button>`}${checkBtn(!!x.applied, `data-a="libApplied" data-id="${x.id}"`, 'Idée appliquée')}<span class="small">Idée appliquée <span class="xp">+${xpv('applied')} XP</span></span></div>` : ''}
    <div class="hr"></div>
    <div class="lib-two">
      <form class="stack note-form" data-f="libNote" data-id="${x.id}">
        <div class="eyebrow">Nouvelle note</div>
        <div class="chips">${Object.keys(NOTE_KINDS).map(k => `<button type="button" class="chipbtn sm ${nk === k ? 'on' : ''}" data-a="libNoteKind" data-v="${k}">${NOTE_KINDS[k].l}</button>`).join('')}</div>
        <div class="form-row">
          <div class="grow"><label class="sr" for="ln-t-${x.id}">Note</label><textarea id="ln-t-${x.id}" class="draft" name="text" maxlength="1200" rows="3" placeholder="${esc(NOTE_KINDS[nk].hint)}"></textarea></div>
          ${tot ? `<div class="tiny"><label class="lbl" for="ln-p-${x.id}">Page</label><input type="number" id="ln-p-${x.id}" class="draft" name="page" min="0" max="${tot}" step="1" value="${Number(x.page) || ''}"></div>` : ''}
        </div>
        <div class="row-wrap"><button type="submit" class="btn btn-sm btn-primary">Enregistrer la note</button><span class="small muted">Aucune XP : les notes servent à retrouver, pas à marquer des points.</span></div>
        <div class="hr"></div>
        <div class="eyebrow">Fiche</div>
        <div class="form-row">
          <div class="grow"><label class="lbl" for="lm-a-${x.id}">Auteur ou source</label><input type="text" id="lm-a-${x.id}" data-c="libField" data-field="author" data-id="${x.id}" maxlength="100" value="${esc(x.author || '')}"></div>
          <div class="fix"><label class="lbl" for="lm-k-${x.id}">Type</label><select id="lm-k-${x.id}" data-c="libField" data-field="kind" data-id="${x.id}">${Object.keys(LIB_KINDS).map(k => `<option value="${k}"${x.kind === k ? ' selected' : ''}>${LIB_KINDS[k]}</option>`).join('')}</select></div>
          <div class="tiny"><label class="lbl" for="lm-p-${x.id}">Pages</label><input type="number" id="lm-p-${x.id}" data-c="libField" data-field="pages" data-id="${x.id}" min="0" max="20000" step="1" value="${tot || ''}"></div>
        </div>
        <div class="form-row">
          <div class="fix"><label class="lbl" for="lm-r-${x.id}">Domaine</label><select id="lm-r-${x.id}" data-c="libField" data-field="area" data-id="${x.id}">${areaOptions(x.area)}</select></div>
          <div class="grow"><label class="lbl" for="lm-u-${x.id}">Lien${safeUrl(x.url) ? ` · <a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener noreferrer">ouvrir</a>` : ''}</label><input type="url" id="lm-u-${x.id}" data-c="libField" data-field="url" data-id="${x.id}" maxlength="400" placeholder="https://" value="${esc(x.url || '')}"></div>
        </div>
        <div class="row-wrap">${delBtn('knowledge_items', x.id, 'Supprimer la ressource')}</div>
      </form>
      <div class="lib-notes">
        <div class="eyebrow">${ns.length ? plural(ns.length, 'note') : 'Notes'}</div>
        ${ns.length ? `<ul class="notes">${ns.map(n => libNoteRow(n, x)).join('')}</ul>` : '<p class="small muted">Aucune note pour l’instant. Une note est toujours rattachée à ce que tu lisais : c’est ce qui permet de la retrouver six mois plus tard.</p>'}
      </div>
    </div>
  </section>`;
}

function libItem(x) {
  const fin = ui.lib.finishing === x.id, open = ui.lib.open === x.id;
  const q = x.questId && S.quests[x.questId] ? S.quests[x.questId] : null;
  const ns = libNotesOf(x);
  const pr = libProgress(x);
  let body = '';
  if (fin) {
    body = `<form class="stack" data-f="libFinish" data-id="${x.id}">
      <div><label class="lbl" for="lf-t-${x.id}">Idée clé (obligatoire)</label><textarea id="lf-t-${x.id}" class="draft" name="takeaway" maxlength="600" rows="2" placeholder="Ce que tu retiens, en une ou deux phrases">${esc(x.takeaway || '')}</textarea></div>
      <div><label class="lbl" for="lf-a-${x.id}">Action concrète tirée de cette idée</label><input type="text" id="lf-a-${x.id}" class="draft" name="action" maxlength="200" placeholder="Une action vérifiable" value="${esc(x.action || '')}"></div>
      <div class="row-wrap"><button type="submit" class="btn btn-primary btn-sm">Terminer · +${xpv('book')} XP</button><button type="button" class="btn btn-sm btn-ghost" data-a="libFinishCancel">Annuler</button></div></form>`;
  } else if (x.status === 'termine') {
    body = `${x.takeaway ? `<div class="quote">${esc(x.takeaway)}</div>` : ''}${x.action ? `<p class="small"><b>Action :</b> ${esc(x.action)}</p>` : ''}
      ${libStars(x)}
      <div class="row-wrap">${q ? `<span class="small">${q.done ? '✓ Quête liée faite' : 'Quête liée ouverte'} : ${esc(q.title)}</span>` : `<button type="button" class="btn btn-sm" data-a="libToQuest" data-id="${x.id}">Transformer en action</button>`}</div>
      <div class="row-wrap">${checkBtn(!!x.applied, `data-a="libApplied" data-id="${x.id}"`, 'Idée appliquée')}<span class="small">Appliquée dans la vraie vie <span class="xp">+${xpv('applied')} XP</span></span></div>`;
  } else if (x.status === 'en_cours') {
    body = libProgressRow(x, pr);
  }
  const acts = x.status === 'a_lire' ? `<button type="button" class="btn btn-xs" data-a="libStart" data-id="${x.id}">Commencer</button>`
    : x.status === 'en_cours' && !fin ? `<button type="button" class="btn btn-xs" data-a="libFinishOpen" data-id="${x.id}">Terminer</button>`
      : x.status === 'termine' ? `<button type="button" class="btn btn-xs btn-ghost" data-a="libReopen" data-id="${x.id}">Rouvrir</button>` : '';
  return `<div class="litem ${open ? 'is-open' : ''}">
    <div><div class="title">${esc(x.title)}</div><div class="meta">${x.author ? `<span class="small muted">${esc(x.author)}</span>` : ''}<span class="chip">${esc(LIB_KINDS[x.kind] || 'Contenu')}</span>${areaChip(x.area)}${ns.length ? `<span class="tag">${plural(ns.length, 'note')}</span>` : ''}${x.finishedDate ? `<span class="due">${fmtShort(x.finishedDate)}</span>` : ''}</div></div>
    ${x.note && x.status !== 'termine' ? `<p class="small muted">${esc(x.note)}</p>` : ''}${body}
    <div class="row-wrap">${acts}<button type="button" class="btn btn-xs ${open ? '' : 'btn-ghost'}" data-a="libOpen" data-id="${x.id}">${open ? 'Fermer la fiche' : `Ouvrir${ns.length ? ` · ${plural(ns.length, 'note')}` : ''}`}</button>${open ? '' : delBtn('knowledge_items', x.id)}</div></div>`;
}
function libProgressRow(x, pr) {
  const tot = Number(x.pages) || 0;
  return `<div class="form-row lib-prog">
    ${tot ? `<div class="tiny"><label class="lbl" for="lpgc-${x.id}">Page sur ${tot}</label><input type="number" id="lpgc-${x.id}" data-c="libPage" data-id="${x.id}" min="0" max="${tot}" step="1" value="${Number(x.page) || 0}"></div>`
      : `<div class="tiny"><label class="lbl" for="lpc-${x.id}">Progression %</label><input type="number" id="lpc-${x.id}" data-c="libProgress" data-id="${x.id}" min="0" max="100" step="5" value="${pr}"></div>`}
    <div class="grow"><div class="prog thin" style="margin-top:22px"><i style="width:${pr}%"></i></div></div></div>`;
}
function libStars(x) {
  const v = Number(x.rating) || 0;
  return `<div class="stars" role="group" aria-label="Note de la ressource">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star ${n <= v ? 'on' : ''}" data-a="libRate" data-id="${x.id}" data-v="${n}" aria-label="${n} sur 5" aria-pressed="${n <= v}">${ICON.star}</button>`).join('')}<span class="small muted">${v ? `${v}/5` : 'Pas encore notée'}</span></div>`;
}

function libNoteRow(n, x, withSource) {
  const q = n.questId && S.quests[n.questId] ? S.quests[n.questId] : null;
  return `<li class="note n-${n.type}">
    <div class="n-head"><span class="kind kind-${n.type === 'action' ? 'terrain' : n.type === 'citation' ? 'livrer' : 'fond'}">${NOTE_KINDS[n.type].l}</span>${Number(n.page) ? `<span class="tag">p. ${Number(n.page)}</span>` : ''}<span class="due">${fmtShort(n.d)}</span>${withSource ? `<button type="button" class="btn btn-xs btn-ghost" data-a="libOpen" data-id="${esc(x.id)}">${esc(x.title)}</button>` : ''}<span class="grow1"></span>
      <button type="button" class="iconbtn sm ${n.fav ? 'on' : ''}" data-a="libNoteFav" data-id="${esc(x.id)}" data-n="${esc(n.id)}" aria-label="Épingler la note" aria-pressed="${!!n.fav}">${ICON.star}</button></div>
    <div class="${n.type === 'citation' ? 'quote' : 'n-text'}">${esc(n.text)}</div>
    <div class="row-wrap">${q ? `<span class="small">${q.done ? '✓' : '→'} ${esc(q.title)}</span>` : `<button type="button" class="btn btn-xs btn-ghost" data-a="libNoteToQuest" data-id="${esc(x.id)}" data-n="${esc(n.id)}">En faire une quête</button>`}<button type="button" class="btn btn-xs btn-ghost" data-a="libNoteDel" data-id="${esc(x.id)}" data-n="${esc(n.id)}">${ui.confirm === 'note:' + n.id ? 'Confirmer' : 'Supprimer'}</button></div>
  </li>`;
}

/* ---------- toutes les notes, tous supports confondus */
function libNotesView(notes) {
  const f = ui.lib.nFilter || 'all';
  const txt = String(ui.lib.nText || '').trim().toLowerCase();
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nq = norm(txt);
  let shown = notes;
  if (f === 'fav') shown = shown.filter(n => n.fav);
  else if (NOTE_KINDS[f]) shown = shown.filter(n => n.type === f);
  if (nq.length >= 2) shown = shown.filter(n => norm(n.text + ' ' + n.item.title + ' ' + (n.item.author || '')).includes(nq));
  const fb = (id, l, n) => `<button type="button" class="chipbtn ${f === id ? 'on' : ''}" data-a="libNFilter" data-v="${id}">${l}${n != null ? ` <span>${n}</span>` : ''}</button>`;
  return `<section class="card">
    <div class="filters">
      <div class="chips">${fb('all', 'Toutes', notes.length)}${fb('fav', 'Épinglées', notes.filter(n => n.fav).length)}${Object.keys(NOTE_KINDS).map(k => fb(k, NOTE_KINDS[k].l, notes.filter(n => n.type === k).length)).join('')}</div>
      <div class="form-row"><div class="grow"><label class="sr" for="ln-search">Chercher dans les notes</label><input type="search" id="ln-search" data-c="libNText" value="${esc(ui.lib.nText || '')}" placeholder="Chercher dans les notes…" autocomplete="off"></div></div>
    </div>
    ${shown.length ? `<ul class="notes">${shown.slice(0, 200).map(n => libNoteRow(n, n.item, true)).join('')}</ul>${shown.length > 200 ? `<p class="small muted">200 notes affichées sur ${shown.length}.</p>` : ''}`
    : emptyState(notes.length ? 'Aucune note dans ce filtre.' : 'Aucune note. Ouvre une lecture et écris ce que tu veux en retenir : une idée, une citation, une question, une action.', `<button type="button" class="btn btn-sm" data-a="libTab" data-v="lectures">Voir les lectures</button>`)}
  </section>`;
}

/* ---------- leçons du Full Time : la même matière, écrite le soir */
function libLessonsView() {
  const lessons = [];
  Object.keys(S.matches).forEach(mk => {
    const days = (S.matches[mk] && S.matches[mk].days) || {};
    Object.keys(days).forEach(k => { const l = days[k] && days[k].ft && days[k].ft.lesson; if (l) lessons.push([k, l]); });
  });
  lessons.sort((a, b) => b[0].localeCompare(a[0]));
  return sectionCard('Leçons du terrain', lessons.length
    ? `<ul class="rows">${lessons.slice(0, 60).map(([k, l]) => `<li><div class="grow1"><div class="quote">${esc(l)}</div><div class="meta"><button type="button" class="btn btn-xs btn-ghost" data-a="dayGo" data-k="${k}">${esc(cap1(fmtDay(k)))}</button></div></div></li>`).join('')}</ul>`
    : '<p class="small muted">La « leçon du jour » du Full Time s’accumule ici.</p>', `${lessons.length} au total`, '', 'lessons');
}
