/* =========================================================
   Réseau : contacts et relances automatiques
   ========================================================= */
VIEWS.reseau = () => {
  const cs = contactArr();
  const f = ui.net;
  const filters = {
    all: () => true, relancer: c => c.late, semaine: c => c.soon || c.late, dormants: c => c.dormant,
    club: c => c.role === 'club', joueur: c => c.role === 'joueur', agent: c => c.role === 'agent', coach: c => c.role === 'coach'
  };
  const fl = filters[f.filter] || filters.all;
  const shown = cs.filter(c => fl(c) && (!f.tag || c.tags.includes(f.tag))).sort((a, b) => (b.late - a.late) || a.nextDate.localeCompare(b.nextDate) || String(a.name).localeCompare(String(b.name)));
  const tags = Array.from(new Set(cs.flatMap(c => c.tags))).sort();
  const fb = (id, l) => { const n = cs.filter(filters[id]).length; return `<button type="button" class="chipbtn ${f.filter === id ? 'on' : ''}" data-a="netFilter" data-v="${id}">${l} <span>${n}</span></button>`; };
  const late = cs.filter(c => c.late);
  const ns = late.length ? nextStep(`Relancer ${esc(late[0].name)}${late[0].next ? ` : ${esc(late[0].next)}` : ''}`, `<button type="button" class="btn btn-sm" data-a="netNote" data-id="${late[0].id}">Contact fait</button>`) : '';
  const ym = monthOf(ctx.today);
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">Le métier d'agent se joue sur le réseau</div><h1>Réseau</h1></div><button type="button" class="btn btn-primary" data-a="quick" data-kind="contact">Nouveau contact</button></div>
  <div class="kpis top">${kpi(cs.length, 'contacts')}${kpi(late.length, 'à relancer')}${kpi(sum(cs.map(c => c.log.filter(x => monthOf(x.date) === ym).length)), 'échanges ce mois')}${kpi(cs.filter(c => c.dormant).length, 'dormants')}</div>
  <div class="view-top">${ns}</div>
  <section class="card">
    <div class="chips" style="margin-bottom:10px">${fb('all', 'Tous')}${fb('relancer', 'À relancer')}${fb('semaine', 'Cette semaine')}${fb('dormants', 'Dormants')}${fb('club', 'Clubs')}${fb('joueur', 'Joueurs')}${fb('agent', 'Agents')}${fb('coach', 'Coachs')}</div>
    ${tags.length ? `<div class="chips" style="margin-bottom:12px"><span class="muted small">Tags :</span>${tags.map(t => `<button type="button" class="chipbtn sm ${f.tag === t ? 'on' : ''}" data-a="netTag" data-v="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    ${shown.length ? `<ul class="rows">${shown.map(contactRow).join('')}</ul>` : emptyState(cs.length ? 'Aucun contact dans ce filtre.' : 'Aucun contact. Commence par les 10 personnes qui comptent dans ton milieu. Exemple : « Entraîneur rencontré au tournoi de septembre ».', `<button type="button" class="btn btn-sm" data-a="quick" data-kind="contact">Ajouter un contact</button>`)}
  </section>`;
};
function contactRow(c) {
  const noting = ui.net.note === c.id, open = ui.net.open === c.id;
  const q = c.questId && S.quests[c.questId] && !S.quests[c.questId].done ? S.quests[c.questId] : null;
  const status = c.late ? `<span class="cstatus late">À relancer</span>` : `<span class="cstatus ok">Prochaine relance ${fmtShort(c.nextDate)}</span>`;
  const log = c.log.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return `<li class="crow" id="contact-${esc(c.id)}">
    <div class="qline"><div class="grow1"><div class="title">${esc(c.name)}</div>
      <div class="meta"><span class="chip">${esc(ROLES[c.role] || 'Contact')}</span>${c.org ? `<span class="small muted">${esc(c.org)}</span>` : ''}${status}<span class="due">${c.last ? `dernier échange il y a ${c.since} j` : 'jamais contacté'} · tous les ${c.cad} j</span>${c.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
      ${c.next ? `<p class="small" style="margin-top:4px"><b>Prochaine action :</b> ${esc(c.next)}${q ? ' · <span class="muted">quête ouverte</span>' : ''}</p>` : ''}</div>
      <div class="acts">${noting ? '' : `<button type="button" class="btn btn-xs" data-a="netNote" data-id="${c.id}">Contact fait · +${xpv('contact')}</button>`}${c.next && !q ? `<button type="button" class="btn btn-xs btn-ghost" data-a="netToQuest" data-id="${c.id}">En quête Terrain</button>` : ''}<button type="button" class="btn btn-xs btn-ghost" data-a="netOpen" data-id="${c.id}">${open ? 'Fermer' : 'Détails'}</button>${delBtn('contacts', c.id)}</div></div>
    ${noting ? `<form class="form-row" data-f="netLog" data-id="${c.id}" style="margin-top:8px"><div class="grow"><label class="lbl" for="cn-${c.id}">Ce qui s'est dit</label><input type="text" id="cn-${c.id}" class="draft" name="note" maxlength="240" placeholder="Une ligne suffit"></div><button type="submit" class="btn btn-sm btn-primary">Enregistrer</button><button type="button" class="btn btn-sm btn-ghost" data-a="netNoteCancel">Annuler</button></form>` : ''}
    ${open ? `<div class="stack" style="margin-top:10px">
      <div class="form-row">
        <div class="grow"><label class="lbl" for="cx-n-${c.id}">Prochaine action</label><input type="text" id="cx-n-${c.id}" data-c="netField" data-field="next" data-id="${c.id}" maxlength="200" value="${esc(c.next || '')}"></div>
        <div class="fix"><label class="lbl" for="cx-c-${c.id}">Relancer tous les</label><select id="cx-c-${c.id}" data-c="netField" data-field="cadence" data-id="${c.id}">${[7, 14, 30, 60, 90].map(n => `<option value="${n}"${c.cad === n ? ' selected' : ''}>${n} jours</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="fix"><label class="lbl" for="cx-r-${c.id}">Rôle</label><select id="cx-r-${c.id}" data-c="netField" data-field="role" data-id="${c.id}">${Object.keys(ROLES).map(r => `<option value="${r}"${c.role === r ? ' selected' : ''}>${ROLES[r]}</option>`).join('')}</select></div>
        <div class="grow"><label class="lbl" for="cx-o-${c.id}">Club ou structure</label><input type="text" id="cx-o-${c.id}" data-c="netField" data-field="org" data-id="${c.id}" maxlength="80" value="${esc(c.org || '')}"></div>
        <div class="grow"><label class="lbl" for="cx-t-${c.id}">Tags (séparés par des virgules)</label><input type="text" id="cx-t-${c.id}" data-c="netField" data-field="tags" data-id="${c.id}" maxlength="120" value="${esc(c.tags.join(', '))}"></div>
      </div>
      <div><label class="lbl" for="cx-x-${c.id}">Notes courtes</label><textarea id="cx-x-${c.id}" data-c="netField" data-field="notes" data-id="${c.id}" maxlength="500" rows="2">${esc(c.notes || '')}</textarea></div>
      ${log.length ? `<ul class="clog">${log.slice(0, 8).map(x => `<li><b>${fmtShort(x.date)}</b>${esc(x.note || '')}</li>`).join('')}</ul>` : '<p class="small muted">Aucun échange enregistré.</p>'}
    </div>` : ''}
  </li>`;
}
