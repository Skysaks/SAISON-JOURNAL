/* =========================================================
   Quêtes : filtres, recherche, priorité, report, lien aux objectifs
   ========================================================= */
VIEWS.quetes = () => {
  const T = ctx.today, f = ui.q;
  const all = questArr();
  const txt = f.text.trim().toLowerCase();
  const match = q => (f.area === 'all' || q.area === f.area) && (f.kind === 'all' || q.kind === f.kind) && (f.prio === 'all' || (q.prio || 'normale') === f.prio) && (!txt || String(q.title).toLowerCase().includes(txt));
  const wEnd = addDays(T, 7);
  const open = all.filter(q => !q.done && match(q)).sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')) || (PRIO_RANK[a.prio] ?? 2) - (PRIO_RANK[b.prio] ?? 2) || areaInfo(b.area).mult - areaInfo(a.area).mult);
  const views = {
    toutes: null,
    aujourdhui: q => q.due === T || ((getDay(T) || {}).coups || []).includes(q.id),
    semaine: q => isKey(q.due) && q.due >= mondayOf(T) && q.due <= addDays(mondayOf(T), 6),
    retard: q => isKey(q.due) && q.due < T,
    sansdate: q => !isKey(q.due),
    bloquees: q => isBlocked(q)
  };
  const vf = views[f.view] || null;
  const shown = vf ? open.filter(vf) : open;
  const groups = vf ? [['Résultats', shown, '']] : [
    ['En retard', shown.filter(q => isKey(q.due) && q.due < T), 'late'],
    ["Aujourd'hui", shown.filter(q => q.due === T), ''],
    ['7 prochains jours', shown.filter(q => isKey(q.due) && q.due > T && q.due <= wEnd), ''],
    ['Plus tard', shown.filter(q => isKey(q.due) && q.due > wEnd), ''],
    ['Sans échéance', shown.filter(q => !isKey(q.due)), '']
  ];
  const todayIds = ((getDay(T) || {}).coups || []).filter(id => S.quests[id]);
  const row = q => questRow(q, todayIds);
  const gHtml = groups.filter(g => g[1].length).map(([l, a, c]) => `<div class="group-h ${c}"><h3>${l}</h3><span class="muted small">${a.length}</span></div><ul class="rows">${a.map(row).join('')}</ul>`).join('');
  const done = all.filter(q => q.done && match(q)).sort((a, b) => String(b.doneDate || '').localeCompare(String(a.doneDate || ''))).slice(0, 80);
  const vbtn = (id, l, n) => `<button type="button" class="chipbtn ${f.view === id ? 'on' : ''}" data-a="qView" data-v="${id}">${l}${n != null ? ` <span>${n}</span>` : ''}</button>`;
  const cnt = fn => all.filter(q => !q.done && fn(q)).length;
  const areaSel = `<option value="all">Tous les domaines</option>${ctx.projects.map(p => `<option value="${esc(p.id)}"${f.area === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}${Object.keys(LIFE).map(k => `<option value="${k}"${f.area === k ? ' selected' : ''}>${LIFE[k]}</option>`).join('')}`;
  const blocked = all.filter(isBlocked);
  const ns = blocked.length ? nextStep(`« ${esc(blocked[0].title)} » semble bloquée (${blocked[0].postponed} reports) : découpe-la ou redéfinis-la.`) : (cnt(views.retard) ? nextStep(`${plural(cnt(views.retard), 'quête en retard', 'quêtes en retard')} : traite ou reporte.`) : '');
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">${open.length} ouvertes · ${all.filter(q => q.done).length} terminées</div><h1>Quêtes</h1></div><button type="button" class="btn btn-primary" data-a="quick" data-kind="quete">Nouvelle quête</button></div>
  <div class="view-top">${ns}</div>
  <div class="grid2">
    <div class="col">
      <section class="card">
        <div class="filters">
          <div class="chips">${vbtn('toutes', 'Toutes', open.length)}${vbtn('aujourdhui', "Aujourd'hui", cnt(views.aujourdhui))}${vbtn('semaine', 'Cette semaine', cnt(views.semaine))}${vbtn('retard', 'En retard', cnt(views.retard))}${vbtn('sansdate', 'Sans date', cnt(views.sansdate))}${blocked.length ? vbtn('bloquees', 'Bloquées', blocked.length) : ''}</div>
          <div class="form-row">
            <div class="grow"><label class="sr" for="qf-text">Rechercher</label><input type="search" id="qf-text" data-c="qText" value="${esc(f.text)}" placeholder="Rechercher une quête"></div>
            <div class="fix"><label class="sr" for="qf-area">Domaine</label><select id="qf-area" data-c="qFilter" data-field="area">${areaSel}</select></div>
            <div class="fix"><label class="sr" for="qf-kind">Type</label><select id="qf-kind" data-c="qFilter" data-field="kind"><option value="all">Tous les types</option>${Object.keys(KIND).map(k => `<option value="${k}"${f.kind === k ? ' selected' : ''}>${KIND[k]}</option>`).join('')}</select></div>
            <div class="fix"><label class="sr" for="qf-prio">Priorité</label><select id="qf-prio" data-c="qFilter" data-field="prio"><option value="all">Toutes priorités</option>${Object.keys(PRIO).map(k => `<option value="${k}"${f.prio === k ? ' selected' : ''}>${PRIO[k]}</option>`).join('')}</select></div>
          </div>
        </div>
        ${gHtml || emptyState(txt || f.area !== 'all' || f.kind !== 'all' || f.prio !== 'all' || vf ? 'Aucune quête ne correspond à ces filtres.' : 'Aucune quête ouverte.', `<button type="button" class="btn btn-sm" data-a="quick" data-kind="quete">Créer une quête</button>`)}
        <div class="hr"></div>
        <button type="button" class="btn btn-sm btn-ghost" data-a="qDone">${f.showDone ? 'Masquer' : 'Afficher'} les terminées (${all.filter(q => q.done && match(q)).length})</button>
        ${f.showDone && done.length ? `<ul class="rows" style="margin-top:8px">${done.map(row).join('')}</ul>` : ''}
      </section>
    </div>
    <div class="col">
      ${questForm()}
      ${sectionCard('Barème', `<div class="tbl-wrap"><table class="tbl xptab"><tbody>${Object.keys(KIND).map(k => `<tr><td>${kindChip(k)} ${KIND_HINT[k]}</td><td>${xpv(k)} XP · poids ${fmt1(kindW(k))}</td></tr>`).join('')}
        <tr><td>Projet capitaine / titulaire / banc / tribune</td><td>× ${fmt1(R().mult.capitaine)} / ${fmt1(R().mult.titulaire)} / ${fmt1(R().mult.banc)} / ${fmt1(R().mult.tribune)}</td></tr>
        <tr><td>Plafond : quêtes rapportant de l'XP par jour</td><td>${R().xp.dailyQuestCap} (dont ${R().xp.unplannedCap} non planifiées)</td></tr></tbody></table></div>
        <p class="small muted" style="margin-top:8px">Type = nature de l'action. Priorité = importance. Le poids compte dans le score des coups du jour, l'XP dans ta progression.</p>`)}
    </div>
  </div>`;
};
function questRow(q, todayIds) {
  const inToday = todayIds.includes(q.id);
  const g = q.goal && S.goals[q.goal] ? `<span class="link-chip">↳ ${esc(S.goals[q.goal].title)}</span>` : '';
  const ev = q.done ? findEv('q:' + q.id) : null;
  const xpTxt = q.done ? `+${fmt(ev ? ev.e.xp : 0)} XP${ev && ev.e.note ? ` (${esc(ev.e.note)})` : ''}` : `${questXpCalc(q, q.id, ctx.today, true).xp} XP`;
  const src = q.source && q.source.type === 'contact' && S.contacts[q.source.id] ? `<span class="link-chip">Réseau · ${esc(S.contacts[q.source.id].name)}</span>` : q.source && q.source.type === 'knowledge' && S.knowledge_items[q.source.id] ? `<span class="link-chip">Savoir · ${esc(S.knowledge_items[q.source.id].title)}</span>` : '';
  const rep = q.repeat && REPEATS[q.repeat] ? `<span class="chip">↻ ${REPEATS[q.repeat].l}</span>` : '';
  const split = ui.split === q.id ? splitForm(q) : '';
  const post = ui.postpone === q.id ? `<div class="postpone"><button type="button" class="btn btn-sm" data-a="qPostpone" data-id="${q.id}" data-v="1">Demain</button><button type="button" class="btn btn-sm" data-a="qPostpone" data-id="${q.id}" data-v="7">Dans 7 jours</button><label class="sr" for="pp-${q.id}">Nouvelle date</label><input type="date" id="pp-${q.id}" data-c="qPostponeDate" data-id="${q.id}" min="${ctx.today}"><button type="button" class="btn btn-sm btn-ghost" data-a="qPostponeCancel">Annuler</button></div>` : '';
  return `<li class="qrow ${q.done ? 'is-done' : ''}">
    <div class="qline">${checkBtn(!!q.done, `data-a="questToggle" data-id="${q.id}"`, q.title)}
      <div class="grow1"><div class="title">${esc(q.title)}</div>
        <div class="meta">${areaChip(q.area)} ${kindChip(q.kind)} ${prioChip(q.prio)} ${dueLabel(q)}<span class="xp">${xpTxt}</span>${q.done && q.planned === false ? pill('Non planifiée', 'pre') : ''}${isBlocked(q) ? pill(`Reportée ${q.postponed}× · bloquée ?`, 'risk') : (Number(q.postponed) > 0 ? `<span class="muted small">reportée ${q.postponed}×</span>` : '')}${rep}${g}${src}${q.done && isKey(q.doneDate) ? `<span class="due">terminée le ${fmtShort(q.doneDate)}</span>` : ''}</div>
      </div>
      <div class="acts">${q.done ? '' : `<button type="button" class="btn btn-xs" data-a="pickTo" data-id="${q.id}" data-k="${ctx.today}" ${inToday || todayIds.length >= 3 ? 'disabled' : ''}>${inToday ? 'Coup du jour ✓' : 'Coup du jour'}</button><button type="button" class="btn btn-xs btn-ghost" data-a="qPostponeOpen" data-id="${q.id}">Reporter</button><button type="button" class="btn btn-xs btn-ghost" data-a="qSplitOpen" data-id="${q.id}">Découper</button>`}<button type="button" class="btn btn-xs btn-ghost" data-a="qEdit" data-id="${q.id}">Modifier</button>${delBtn('quests', q.id)}</div>
    </div>${split}${post}</li>`;
}
function questForm() {
  const e = ui.editQuest && S.quests[ui.editQuest] ? Object.assign({ id: ui.editQuest }, S.quests[ui.editQuest]) : null;
  const v = e || { title: '', area: defaultArea(), kind: R().quests.defaultKind, prio: R().quests.defaultPrio, due: '', goal: '', repeat: '' };
  return sectionCard(e ? 'Modifier la quête' : 'Nouvelle quête', `<form class="stack" data-f="quest" data-id="${e ? e.id : ''}">
    <div><label class="lbl" for="qf-title">Intitulé</label><input type="text" id="qf-title" class="draft" name="title" maxlength="160" value="${esc(v.title)}" placeholder="Un verbe d'action et un résultat"></div>
    <div class="form-row">
      <div class="grow"><label class="lbl" for="qf-a">Projet ou domaine</label><select id="qf-a" class="draft" name="area">${areaOptions(v.area)}</select></div>
      <div class="grow"><label class="lbl" for="qf-k">Type (nature)</label><select id="qf-k" class="draft" name="kind">${kindOptions(v.kind)}</select></div>
    </div>
    <div class="form-row">
      <div class="grow"><label class="lbl" for="qf-p">Priorité (importance)</label><select id="qf-p" class="draft" name="prio">${prioOptions(v.prio || 'normale')}</select></div>
      <div class="grow"><label class="lbl" for="qf-d">Échéance</label><input type="date" id="qf-d" class="draft" name="due" value="${esc(v.due || '')}"></div>
    </div>
    <div class="form-row">
      <div class="grow"><label class="lbl" for="qf-g">Sert l'objectif</label><select id="qf-g" class="draft" name="goal">${goalOptions(v.goal)}</select></div>
      <div class="fix"><label class="lbl" for="qf-r">Répétition</label><select id="qf-r" class="draft" name="repeat">${repeatOptions(v.repeat || '')}</select></div>
    </div>
    <div class="row-wrap"><button type="submit" class="btn btn-primary">${e ? 'Enregistrer' : 'Ajouter la quête'}</button>${e ? '<button type="button" class="btn btn-ghost" data-a="qEditCancel">Annuler</button>' : ''}</div>
  </form>`, e ? '' : 'Une quête est binaire : faite ou pas');
}
