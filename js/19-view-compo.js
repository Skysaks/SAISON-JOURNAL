/* =========================================================
   Compo : capitaine, titulaires, banc, tribune, mercato
   ========================================================= */
const MERCATO = { libre: 'Changements libres (effet immédiat)', prochain: 'Effet au prochain match (demain)', hebdo: 'Fenêtre hebdomadaire (effet lundi prochain)', mensuel: 'Fenêtre mensuelle (effet le 1er du mois suivant)' };
VIEWS.compo = () => {
  const T = ctx.today;
  const ps = ctx.projects.map(p => Object.assign({}, p, { st: statusAt(p, T) }));
  const by = st => ps.filter(p => p.st === st);
  const cap = by('capitaine'), tit = by('titulaire'), banc = by('banc'), trib = by('tribune');
  const stag = ps.filter(p => (p.st === 'capitaine' || p.st === 'titulaire') && projectStats(p.id).stagnant);
  const ns = stag.length ? nextStep(`${esc(stag[0].name)} stagne : ${(() => { const s0 = projectStats(stag[0].id); return s0.sinceTL === null ? 'aucune action Terrain/Livrer' : `rien de concret depuis ${s0.sinceTL} jours`; })()}. Action terrain ou remplacement.`) : '';
  const warn = !cap.length ? `<div class="alert">Pas de capitaine. Sans projet prioritaire, l'énergie se disperse : donne le brassard.</div>` : '';
  const log = logItems(addDays(T, -60), T, 'compo').reverse().slice(0, 8);
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">${cap.length + tit.length}/3 projets actifs · ${banc.length} sur le banc · ${trib.length} en tribune</div><h1>Compo</h1></div></div>
  <div class="view-top">${ns}</div>${warn}
  <div class="grid2">
    <div class="col">
      <div class="pitch">
        <div class="pitch-l">Capitaine · XP × ${fmt1(R().mult.capitaine)}</div>
        ${cap.length ? cap.map(projCard).join('') : '<div class="pempty">Brassard libre</div>'}
        <div class="pitch-l">Titulaires · XP × ${fmt1(R().mult.titulaire)} · 2 maximum</div>
        <div class="pline">${tit.map(projCard).join('')}${tit.length < 2 ? Array(2 - tit.length).fill('<div class="pempty">Poste libre</div>').join('') : ''}</div>
      </div>
      ${sectionCard('Banc', `<div class="stack">${banc.length ? banc.map(projCard).join('') : '<p class="small muted">Personne sur le banc.</p>'}</div>`, `XP × ${fmt1(R().mult.banc)}`)}
      ${sectionCard('Tribune', `<div class="stack">${trib.length ? trib.map(projCard).join('') : '<p class="small muted">Tribune vide.</p>'}</div>`, `hors effectif · XP × ${fmt1(R().mult.tribune)}`)}
    </div>
    <div class="col">
      ${sectionCard('Mercato', `<p class="small"><b>${esc(MERCATO[R().mercato] || MERCATO.prochain)}</b></p><p class="small muted" style="margin-top:6px">Le multiplicateur d'une quête est celui de la compo le jour où elle est terminée. Il n'est jamais recalculé.</p><button type="button" class="btn btn-sm" data-a="go" data-tab="reglages" data-set="compo" style="margin-top:8px">Changer la fenêtre</button>`)}
      ${sectionCard('Règles', `<ul class="rules"><li>3 projets actifs au maximum : 1 capitaine et 2 titulaires.</li><li>Faire entrer un projet = en sortir un : c'est un remplacement.</li><li>Les domaines de vie (corps, esprit, argent, relations) restent à × 1.</li></ul>`)}
      ${sectionCard('Décisions récentes', log.length ? `<ul class="clog">${log.map(l => `<li><b>${fmtShort(l.date)}</b>${esc(l.text)}</li>`).join('')}</ul>` : '<p class="small muted">Aucun changement de compo enregistré.</p>')}
      ${sectionCard('Nouveau projet', `<form class="stack" data-f="project">
        <div><label class="lbl" for="np-name">Nom</label><input type="text" id="np-name" class="draft" name="name" maxlength="60" placeholder="Nom court"></div>
        <div><label class="lbl" for="np-why">Pourquoi, où en est-il</label><textarea id="np-why" class="draft" name="why" maxlength="600" rows="2"></textarea></div>
        <div><button type="submit" class="btn">Ajouter sur le banc</button></div></form>`)}
    </div>
  </div>`;
};
function projCard(p) {
  const st = p.st || statusAt(p, ctx.today);
  const s0 = projectStats(p.id);
  const pend = pendingChange(p);
  const editing = ui.editProj === p.id;
  const sel = `<label class="sr" for="ps-${p.id}">Poste de ${esc(p.name)}</label><select id="ps-${p.id}" data-c="projStatus" data-id="${p.id}">${Object.keys(STATUS).map(s => `<option value="${s}"${st === s ? ' selected' : ''}>${STATUS[s]} · × ${fmt1(R().mult[s])}</option>`).join('')}</select>`;
  const last = s0.last ? `${esc(s0.last.title)} (${fmtShort(s0.last.doneDate)})` : TX('aucune');
  const since = s0.sinceTL === null ? TX('jamais') : s0.sinceTL === 0 ? TX("aujourd'hui") : `il y a ${s0.sinceTL} j`;
  return `<div class="pcard ${st === 'capitaine' ? 'cap' : ''} ${s0.stagnant ? 'stag' : ''}">
    <div class="pcard-h">${st === 'capitaine' ? '<span class="armband" aria-label="Capitaine">C</span>' : `<i class="dot lg" style="background:${ctx.colors[p.id]}"></i>`}<b>${esc(p.name)}</b>${s0.stagnant ? pill('Stagne', 'risk') : ''}${pend ? pill(`${STATUS[pend.status]} le ${fmtShort(pend.from)}`, 'live') : ''}</div>
    ${editing ? `<div class="stack"><div><label class="lbl" for="pn-${p.id}">Nom</label><input type="text" id="pn-${p.id}" data-c="projField" data-field="name" data-id="${p.id}" maxlength="60" value="${esc(p.name)}"></div><div><label class="lbl" for="pw-${p.id}">Pourquoi, où en est-il</label><textarea id="pw-${p.id}" data-c="projField" data-field="why" data-id="${p.id}" maxlength="600" rows="3">${esc(p.why || '')}</textarea></div></div>` : (p.why ? `<p class="small why">${esc(p.why)}</p>` : '')}
    <dl class="pstats">
      <div><dt>XP</dt><dd class="xp">${fmt(s0.xp)}</dd></div>
      <div><dt>Quêtes</dt><dd>${s0.open} ouvertes · ${s0.done} faites</dd></div>
      <div><dt>Objectifs</dt><dd>${s0.gProg == null ? 'aucun lié' : Math.round(s0.gProg * 100) + ' % (' + s0.goals.length + ')'}</dd></div>
      <div><dt>Terrain/Livrer</dt><dd class="${s0.stagnant ? 'neg' : ''}">${since}</dd></div>
    </dl>
    <p class="small muted">Dernière action : ${last}</p>
    <div class="row-wrap">${sel}<button type="button" class="btn btn-xs btn-ghost" data-a="projEdit" data-id="${p.id}">${editing ? 'Fermer' : 'Modifier'}</button>${questArr().some(q => q.area === p.id) || goalArr().some(g => g.area === p.id) ? '' : delBtn('projects', p.id)}</div>
  </div>`;
}
