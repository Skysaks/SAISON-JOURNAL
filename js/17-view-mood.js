/* =========================================================
   Moodboard : images, citations, couleurs, notes et liens.
   Un élément épinglé revient chaque jour sur l'écran du jour.
   ========================================================= */
const MOOD_KINDS = { image: 'Image', citation: 'Citation', couleur: 'Couleur', note: 'Note', lien: 'Lien' };
const MOOD_MAX_CHARS = 190000; // image réduite : ~140 Ko au maximum
const moodArr = () => arr('mood').filter(t => MOOD_KINDS[t.kind]).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
const safeImg = s => (typeof s === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '');
function safeUrl(u) {
  const s = String(u || '').trim();
  try { const x = new URL(s); return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; }
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
function inkOn(hex) { const c = validHex(hex) || '#888888'; return contrastOf(c, '#FFFFFF') >= contrastOf(c, '#111111') ? '#FFFFFF' : '#111111'; }

function moodBody(t, compact) {
  if (t.kind === 'image') { const src = safeImg(t.img); return src ? `<img class="mimg${compact ? ' sm' : ''}" src="${src}" alt="${esc(t.title || 'Image du moodboard')}" loading="lazy">` : `<p class="small muted">Image indisponible.</p>`; }
  if (t.kind === 'citation') return `<blockquote class="mq">${esc(t.text)}${t.author ? `<cite>${esc(t.author)}</cite>` : ''}</blockquote>`;
  if (t.kind === 'couleur') { const c = validHex(t.color) || '#888888'; return `<div class="msw${compact ? ' sm' : ''}" style="background:${c};color:${inkOn(c)}"><b>${esc(t.title || '')}</b><span>${c}</span></div>`; }
  if (t.kind === 'note') return `<p class="mn">${esc(t.text)}</p>`;
  const u = safeUrl(t.url);
  return u ? `<a class="ml" href="${esc(u)}" target="_blank" rel="noopener noreferrer"><b>${esc(t.title || hostOf(u))}</b><span>${esc(hostOf(u))}</span></a>` : `<p class="small muted">Lien invalide.</p>`;
}
function moodTile(t, i, n) {
  const editing = ui.mood.edit === t.id;
  const caption = t.kind !== 'couleur' && t.kind !== 'lien' && t.title ? `<div class="mt">${esc(t.title)}</div>` : '';
  const area = t.area ? areaChip(t.area) : `<span class="chip">Vision</span>`;
  const edit = editing ? `<form class="stack mform" data-f="moodEdit" data-id="${esc(t.id)}">
      <div><label class="lbl" for="me-t-${esc(t.id)}">${t.kind === 'couleur' ? 'Nom de la couleur' : t.kind === 'lien' ? 'Titre du lien' : 'Légende'}</label><input type="text" id="me-t-${esc(t.id)}" class="draft" name="title" maxlength="120" value="${esc(t.title || '')}"></div>
      ${t.kind === 'citation' || t.kind === 'note' ? `<div><label class="lbl" for="me-x-${esc(t.id)}">Texte</label><textarea id="me-x-${esc(t.id)}" class="draft" name="text" maxlength="600" rows="3">${esc(t.text || '')}</textarea></div>` : ''}
      ${t.kind === 'citation' ? `<div><label class="lbl" for="me-a-${esc(t.id)}">Auteur</label><input type="text" id="me-a-${esc(t.id)}" class="draft" name="author" maxlength="80" value="${esc(t.author || '')}"></div>` : ''}
      <div><label class="lbl" for="me-r-${esc(t.id)}">Projet ou domaine</label><select id="me-r-${esc(t.id)}" class="draft" name="area"><option value="">Vision (général)</option>${areaOptions(t.area || '__none')}</select></div>
      <div class="row-wrap"><button type="submit" class="btn btn-sm btn-primary">Enregistrer</button><button type="button" class="btn btn-sm btn-ghost" data-a="moodEditCancel">Annuler</button></div></form>` : '';
  return `<figure class="tile ${t.pinned ? 'pinned' : ''}">${moodBody(t)}${caption}
    ${edit}
    <figcaption class="tile-f"><span class="tile-m">${area}<span class="muted small">${MOOD_KINDS[t.kind]}</span></span>
      <span class="acts"><button type="button" class="iconbtn sm pin ${t.pinned ? 'on' : ''}" data-a="moodPin" data-id="${esc(t.id)}" aria-pressed="${!!t.pinned}" aria-label="${t.pinned ? 'Retirer de l’écran du jour' : 'Épingler sur l’écran du jour'}" title="${t.pinned ? 'Épinglé sur l’écran du jour' : 'Épingler sur l’écran du jour'}">★</button><button type="button" class="iconbtn sm" data-a="moodMove" data-id="${esc(t.id)}" data-n="-1" aria-label="Avancer" ${i === 0 ? 'disabled' : ''}>${ICON.left}</button><button type="button" class="iconbtn sm" data-a="moodMove" data-id="${esc(t.id)}" data-n="1" aria-label="Reculer" ${i === n - 1 ? 'disabled' : ''}>${ICON.right}</button><button type="button" class="btn btn-xs btn-ghost" data-a="moodEdit" data-id="${esc(t.id)}">${editing ? 'Fermer' : 'Modifier'}</button>${delBtn('mood', t.id)}</span></figcaption>
  </figure>`;
}
function moodForm() {
  const k = MOOD_KINDS[ui.mood.kind] ? ui.mood.kind : 'image';
  const seg = `<div class="seg-nav sm" role="tablist" aria-label="Type d’élément">${Object.keys(MOOD_KINDS).map(x => `<button type="button" role="tab" aria-selected="${k === x}" data-a="moodKind" data-v="${x}">${MOOD_KINDS[x]}</button>`).join('')}</div>`;
  let fields = '';
  if (k === 'image') fields = `<div><label class="lbl" for="mf-file">Image (JPG, PNG ou WebP)</label><input type="file" id="mf-file" accept="image/*" data-c="moodImage"></div>
    ${ui.mood.busy ? '<p class="small muted">Réduction de l’image…</p>' : ui.mood.img ? `<img class="mimg sm" src="${safeImg(ui.mood.img)}" alt="Aperçu">` : ''}
    <div><label class="lbl" for="mf-title">Légende (facultatif)</label><input type="text" id="mf-title" class="draft" name="title" maxlength="120"></div>`;
  else if (k === 'citation') fields = `<div><label class="lbl" for="mf-text">Citation</label><textarea id="mf-text" class="draft" name="text" maxlength="600" rows="3"></textarea></div>
    <div><label class="lbl" for="mf-author">Auteur (facultatif)</label><input type="text" id="mf-author" class="draft" name="author" maxlength="80"></div>`;
  else if (k === 'couleur') fields = `<div class="form-row"><div class="tiny"><label class="lbl" for="mf-color">Couleur</label><input type="color" id="mf-color" class="draft" name="color" value="#D9A21B"></div><div class="grow"><label class="lbl" for="mf-title">Nom (facultatif)</label><input type="text" id="mf-title" class="draft" name="title" maxlength="60" placeholder="Ex. : l’or du podium"></div></div>`;
  else if (k === 'note') fields = `<div><label class="lbl" for="mf-text">Note</label><textarea id="mf-text" class="draft" name="text" maxlength="600" rows="3" placeholder="Une idée, une image mentale, une scène à atteindre"></textarea></div>`;
  else fields = `<div><label class="lbl" for="mf-url">Adresse (https://…)</label><input type="text" id="mf-url" class="draft" name="url" maxlength="400" inputmode="url" autocomplete="off"></div>
    <div><label class="lbl" for="mf-title">Titre (facultatif)</label><input type="text" id="mf-title" class="draft" name="title" maxlength="120"></div>`;
  return sectionCard('Ajouter', `${seg}<form class="stack" data-f="mood" data-kind="${k}">${fields}
    <div><label class="lbl" for="mf-area">Projet ou domaine</label><select id="mf-area" class="draft" name="area"><option value="">Vision (général)</option>${areaOptions('__none')}</select></div>
    <label class="switch"><input type="checkbox" id="mf-pin" class="draft" name="pinned"><span>Épingler sur l’écran du jour</span></label>
    <button type="submit" class="btn btn-primary" ${k === 'image' && (!ui.mood.img || ui.mood.busy) ? 'disabled' : ''}>Ajouter au moodboard</button></form>`);
}
function moodShown() { const f = ui.mood.filter; return moodArr().filter(t => f === 'all' || (f === 'pin' ? t.pinned : f === 'vision' ? !t.area : t.area === f)); }
VIEWS.mood = () => {
  const tiles = moodArr();
  const f = ui.mood.filter;
  const shown = moodShown();
  const used = Array.from(new Set(tiles.map(t => t.area).filter(Boolean)));
  const chip = (id, l, n) => `<button type="button" class="chipbtn ${f === id ? 'on' : ''}" data-a="moodFilter" data-v="${esc(id)}">${l} <span>${n}</span></button>`;
  const chips = `<div class="chips" style="margin-bottom:12px">${chip('all', 'Tout', tiles.length)}${chip('pin', 'Épinglés', tiles.filter(t => t.pinned).length)}${chip('vision', 'Vision', tiles.filter(t => !t.area).length)}${used.map(a => chip(a, esc(areaInfo(a).label), tiles.filter(t => t.area === a).length)).join('')}</div>`;
  const grid = shown.length ? `<div class="mood-grid">${shown.map((t, i) => moodTile(t, i, shown.length)).join('')}</div>`
    : emptyState(tiles.length ? 'Rien dans ce filtre.' : 'Moodboard vide. Ajoute ce qui te rappelle pourquoi tu t’y mets : une image du résultat visé, une citation, une couleur, un lien.', '');
  const pinned = tiles.filter(t => t.pinned).length;
  const ns = !tiles.length ? nextStep('Ajoute un premier élément, puis épingle-le pour le revoir chaque jour.') : !pinned ? nextStep('Aucun élément épinglé : épingle-en un (★) pour le revoir sur l’écran du jour.') : '';
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">${plural(tiles.length, 'élément')} · ${plural(pinned, 'épinglé')}</div><h1>Moodboard</h1></div></div>
  <div class="view-top">${ns}</div>
  <div class="grid2">
    <div class="col"><section class="card">${chips}${grid}</section></div>
    <div class="col">${moodForm()}
      ${sectionCard('Comment l’utiliser', `<ul class="rules"><li>Un moodboard sert à revoir le résultat visé, pas à collectionner.</li><li>Épingle les éléments qui comptent : un par jour s’affiche sur l’écran du jour, en rotation.</li><li>Relie un élément à un projet pour le retrouver avec lui.</li><li>Les images sont réduites automatiquement pour rester légères.</li></ul>`)}
    </div>
  </div>`;
};
/* ---------- rappel sur l'écran du jour */
function moodReminderCard() {
  const pinned = moodArr().filter(t => t.pinned);
  if (!pinned.length) return '';
  const t = pinned[Math.abs(daysBetween('2020-01-01', ctx.today)) % pinned.length];
  const caption = t.kind !== 'couleur' && t.kind !== 'lien' && t.title ? `<div class="mt">${esc(t.title)}</div>` : '';
  return `<section class="card mood-rem"><div class="card-h" style="margin-bottom:8px"><span class="eyebrow">Rappel du moodboard</span><button type="button" class="btn btn-xs btn-ghost" data-a="go" data-tab="mood">Moodboard</button></div>${moodBody(t, true)}${caption}</section>`;
}

/* ---------- actions */
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('lecture'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('format'));
      img.onload = () => {
        const steps = [[1100, 0.82], [1000, 0.72], [860, 0.7], [720, 0.66], [560, 0.62], [420, 0.6]];
        for (const [mx, q] of steps) {
          const k = Math.min(1, mx / Math.max(img.width || 1, img.height || 1));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round((img.width || 1) * k)); c.height = Math.max(1, Math.round((img.height || 1) * k));
          const g = c.getContext('2d');
          g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          const url = c.toDataURL('image/jpeg', q);
          if (url.length <= MOOD_MAX_CHARS) { resolve(url); return; }
        }
        reject(new Error('lourde'));
      };
      img.src = String(fr.result || '');
    };
    fr.readAsDataURL(file);
  });
}
CHG.moodImage = el => {
  const file = el.files && el.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type || '')) { toast('Choisis une image (JPG, PNG ou WebP).', 'bad'); return; }
  ui.mood.busy = true; ui.mood.img = null; render();
  shrinkImage(file).then(u => { ui.mood.img = u; ui.mood.busy = false; render(); })
    .catch(() => { ui.mood.busy = false; toast('Image illisible : utilise un JPG, un PNG ou un WebP.', 'bad'); render(); });
};
ACT.moodKind = b => { ui.mood.kind = b.dataset.v; ui.mood.img = null; render(); };
ACT.moodFilter = b => { ui.mood.filter = b.dataset.v; render(); };
ACT.moodEdit = b => { ui.mood.edit = ui.mood.edit === b.dataset.id ? null : b.dataset.id; render(); };
ACT.moodEditCancel = () => { ui.mood.edit = null; render(); };
ACT.moodPin = b => { const t = clone(S.mood[b.dataset.id]); if (!t) return; t.pinned = !t.pinned; put('mood', b.dataset.id, t); };
ACT.moodMove = b => {
  const shown = moodShown(), i = shown.findIndex(x => x.id === b.dataset.id), j = i + Number(b.dataset.n);
  if (i < 0 || j < 0 || j >= shown.length) return;
  const full = moodArr();
  const ia = full.findIndex(x => x.id === shown[i].id), ic = full.findIndex(x => x.id === shown[j].id);
  [full[ia], full[ic]] = [full[ic], full[ia]];
  full.forEach((x, n) => { if (Number(S.mood[x.id].order) !== n + 1) { const X = clone(S.mood[x.id]); X.order = n + 1; put('mood', x.id, X); } });
};
FORM.mood = f => {
  const kind = f.dataset.kind, e = f.elements;
  const imgs = moodArr().filter(t => t.kind === 'image').length;
  const maxImgs = mode === 'db' ? 60 : 15;
  const base = { kind, title: e.title ? e.title.value.trim().slice(0, 120) : '', area: e.area.value || null, pinned: !!e.pinned.checked, order: Math.max(0, ...moodArr().map(t => Number(t.order) || 0)) + 1, createdAt: ctx.today };
  if (kind === 'image') {
    if (!safeImg(ui.mood.img)) { toast('Choisis d’abord une image.'); return; }
    if (imgs >= maxImgs) { toast(`${maxImgs} images au maximum ici : retire-en une avant d’en ajouter.`, 'bad'); return; }
    base.img = ui.mood.img;
  } else if (kind === 'citation' || kind === 'note') {
    const t = e.text.value.trim(); if (!t) { toast('Texte vide.'); return; }
    base.text = t.slice(0, 600);
    if (kind === 'citation') base.author = e.author.value.trim().slice(0, 80);
  } else if (kind === 'couleur') {
    const c = validHex(e.color.value); if (!c) { toast('Couleur invalide.'); return; }
    base.color = c; base.title = base.title.slice(0, 60);
  } else if (kind === 'lien') {
    const u = safeUrl(e.url.value); if (!u) { toast('Adresse invalide : elle doit commencer par https:// ou http://.'); return; }
    base.url = u;
  } else return;
  if (put('mood', uid('m'), base)) { clearDirty(f); ui.mood.img = null; toast('Ajouté au moodboard.'); }
};
FORM.moodEdit = f => {
  const id = f.dataset.id, t = clone(S.mood[id]); if (!t) return;
  const e = f.elements;
  t.title = e.title.value.trim().slice(0, 120);
  if (e.text) { const x = e.text.value.trim(); if (!x) { toast('Texte vide.'); return; } t.text = x.slice(0, 600); }
  if (e.author) t.author = e.author.value.trim().slice(0, 80);
  t.area = e.area.value || null;
  if (put('mood', id, t)) { clearDirty(f); ui.mood.edit = null; }
};
