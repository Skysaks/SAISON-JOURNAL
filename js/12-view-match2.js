/* =========================================================
   Écran Match (suite) : routine, actions secondaires, briefing, cap, Full Time
   ========================================================= */
function routineCard(k, day, r) {
  const isFuture = k > ctx.today;
  const type = dayType(getDay(k));
  const due = habitsDue(k);
  const cfg = type === 'treve' ? { routine: false } : typeCfg(type);
  const hmap = day.h || {};
  const body = due.length ? Object.keys(BLOCKS).map(b => {
    const hs = due.filter(h => (h.block || 'journee') === b);
    if (!hs.length) return '';
    return `<div class="eyebrow block-h">${BLOCKS[b]}</div><ul class="rows">${hs.map(h => {
      const on = hmap[h.id] > 0;
      const st = isFuture ? 0 : habitStreak(h, k);
      return `<li>${checkBtn(on, `data-a="habit" data-id="${h.id}" data-k="${k}"`, h.name, isFuture)}<div class="grow1"><div class="title n">${esc(h.name)}</div></div>${st > 1 ? `<span class="hab-streak">${st} d'affilée</span>` : ''}<span class="xp">+${Number(h.xp) || 10}</span></li>`;
    }).join('')}</ul>`;
  }).join('') : emptyState('Aucune habitude prévue ce jour.', `<button type="button" class="btn btn-sm" data-a="go" data-tab="reglages" data-set="routines">Gérer la routine</button>`);
  const note = !cfg.routine ? `<p class="small muted" style="margin-bottom:8px">${type === 'treve' ? 'Trêve' : DAY_TYPES[type].label} : la routine ne compte pas dans le score aujourd'hui.</p>` : '';
  return sectionCard('Routine', note + body, due.length ? `${r.hDone || 0}/${due.length}${cfg.routine ? ` · ${Math.round(Number(R().score.wRoutine) || 0)} pts` : ''}` : '', 'routine', 'routine');
}

function secondaryCard(k, day) {
  if (k > ctx.today) return '';
  const ids = day.coups || [];
  const ech = questArr().filter(q => !q.done && isKey(q.due) && q.due <= k && !ids.includes(q.id)).sort((a, b) => a.due.localeCompare(b.due));
  const rel = contactArr().filter(c => c.late).sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 3);
  const e = ech.length ? `<ul class="rows">${ech.slice(0, 6).map(q => `<li>${checkBtn(false, `data-a="questToggle" data-id="${q.id}" data-k="${k}"`, q.title)}<div class="grow1"><div class="title">${esc(q.title)}</div><div class="meta">${areaChip(q.area)} ${dueLabel(q)}</div></div></li>`).join('')}</ul>${ech.length > 6 ? `<button type="button" class="btn btn-sm btn-ghost" data-a="goQuests" data-v="retard">Voir les ${ech.length}</button>` : ''}` : `<p class="small muted">Rien d'échu hors des coups du jour.</p>`;
  const n = rel.length ? `<ul class="rows">${rel.map(c => `<li><div class="grow1"><div class="title">${esc(c.name)}</div><div class="meta"><span class="chip">${esc(ROLES[c.role] || 'Contact')}</span><span class="due late">${c.last ? `Dernier échange il y a ${c.since} j` : 'Jamais contacté'}</span></div></div><button type="button" class="btn btn-sm" data-a="netOpen" data-id="${c.id}">Relancer</button></li>`).join('')}</ul>` : `<p class="small muted">${Object.keys(S.contacts).length ? 'Personne à relancer.' : 'Réseau vide : ajoute tes premiers contacts foot.'}</p>`;
  return `<section class="card"><div class="card-h"><h2>Échéances</h2><span class="card-r">${ech.length || ''}</span></div>${e}<div class="hr"></div><div class="card-h" style="margin-bottom:6px"><h2 class="h3">À relancer</h2><button type="button" class="btn btn-xs btn-ghost" data-a="go" data-tab="reseau">Réseau</button></div>${n}</section>`;
}

function briefCard() {
  const b = briefing();
  const go = b.go ? `<button type="button" class="btn btn-sm" data-a="${['semaine', 'saison'].includes(b.go) ? 'perf' : 'go'}" ${['semaine', 'saison'].includes(b.go) ? `data-v="${b.go}" data-tab="perf"` : `data-tab="${b.go}"`}>Voir</button>` : '';
  return `<section class="card brief"><div class="eyebrow">Briefing du manager</div><p class="brief-t">${esc(b.t)}</p>${go}</section>`;
}

function capCard(s) {
  if (!s) return '';
  const cs = capStatus(s);
  if (!cs) return sectionCard('Cap des 90 jours', emptyState('Aucun cap défini pour cette saison.', `<button type="button" class="btn btn-sm" data-a="go" data-tab="reglages" data-set="saison">Définir le cap</button>`), '', 'cap');
  const st = cs.st ? CAP_ST[cs.st] : null;
  const pctT = Math.round((cs.el || 0) * 100), pctP = cs.prog == null ? 0 : Math.round(cs.prog * 100);
  const ms = cs.ms.map(m => `<li>${checkBtn(!!m.done, `data-a="capStep" data-s="${esc(s.id)}" data-id="${esc(m.id)}"`, m.title)}<div class="grow1"><div class="title n">${esc(m.title)}</div><div class="meta">${isKey(m.due) ? `<span class="due ${!m.done && m.due < ctx.today ? 'late' : ''}">${fmtShort(m.due)}</span>` : ''}${m.done && m.doneDate ? `<span class="due">fait le ${fmtShort(m.doneDate)}</span>` : ''}</div></div><span class="xp">+${xpv('capStep')}</span></li>`).join('');
  const cap = ctx.captain;
  return `<section class="card cap north" id="cap">
    <div class="card-h"><h2>Cap des 90 jours</h2>${st ? pill(st.l, st.c) : ''}</div>
    <p class="cap-text">${esc(s.cap)}</p>
    <div class="cap-meta">${cs.left >= 0 ? `<b>${LANG === 'fr' ? 'J' : 'D'}−${cs.left}</b>` : `<b>Échéance passée</b>`}<span>${fmtLong(cs.end)}</span>${cap ? `<span class="chip"><span class="armband sm">C</span>${esc(cap.name)}</span>` : '<span class="due late">Pas de capitaine</span>'}</div>
    <div class="dual" aria-label="Étapes ${pctP} %, temps écoulé ${pctT} %"><div class="prog"><i style="width:${pctP}%"></i></div><div class="tmark" style="left:${pctT}%" title="Temps écoulé ${pctT} %"></div></div>
    <div class="scale-lg"><span>Étapes ${cs.done}/${cs.total}</span><span>Temps écoulé ${pctT} %</span></div>
    ${ms ? `<ul class="rows">${ms}</ul>` : `<p class="small muted">Ajoute des étapes intermédiaires dans Réglages › Saison pour suivre la trajectoire.</p>`}
  </section>`;
}

function fullTimeCard(k, day) {
  if (k > ctx.today) return sectionCard('Full Time', `<p class="empty">Le Full Time s'ouvre le jour du match.</p>`, '', 'ft', 'fulltime');
  const ft = day.ft || {};
  const closed = !!ft.closedTs;
  const f = (name, label, ph) => `<div><label class="lbl" for="ft-${name}-${k}">${label}</label><input type="text" id="ft-${name}-${k}" data-c="ft" data-field="${name}" data-k="${k}" maxlength="300" value="${esc(ft[name] || '')}" placeholder="${ph}"></div>`;
  const notes = (day.notes || []).length ? `<div class="hr"></div><div class="eyebrow">Notes du jour</div><ul class="clog">${day.notes.map(n => `<li><b>${n.ts ? timeOf(n.ts) : ''}</b>${esc(n.text)}</li>`).join('')}</ul>` : '';
  const body = `<div class="stack">
    <div><span class="lbl">Énergie réelle</span><div class="seg" role="group" aria-label="Énergie réelle de 1 à 5">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="${ft.energy === v ? 'on' : ''}" aria-pressed="${ft.energy === v}" data-a="ftEnergy" data-v="${v}" data-k="${k}">${v}</button>`).join('')}</div></div>
    ${f('shipped', 'Victoire du jour : ce qui a été livré', 'Ce qui est sorti de ta tête vers le monde')}
    ${f('block', 'Blocage principal', 'Ce qui a freiné, en une ligne')}
    ${f('adjust', 'Ajustement pour demain', 'Un seul changement concret')}
    ${f('lesson', 'Leçon du jour (facultatif)', 'Une phrase que tu relirais dans six mois')}
    <div class="row-wrap">${closed ? `<span class="pill pill-win">Match clôturé à ${timeOf(ft.closedTs)}</span><button type="button" class="btn btn-sm btn-ghost" data-a="ftReopen" data-k="${k}">Rouvrir</button>` : `<button type="button" class="btn btn-primary" data-a="ftClose" data-k="${k}">Coup de sifflet final</button><span class="small muted">+${Math.round(Number(R().score.wClose) || 0)} pts de score · +${xpv('close')} XP · moins de 2 minutes</span>`}</div>
  </div>${notes}`;
  return sectionCard('Full Time', body, closed ? '' : 'Clôture du match', 'ft', 'fulltime');
}

function onboardingHtml() {
  return `<section class="card onboard" style="margin-top:16px">
    <div class="eyebrow">Nouvelle saison</div>
    <h1 class="match-title">Prépare ta saison</h1>
    <p class="small" style="margin:8px 0 14px">Avant le premier coup d'envoi : nom, dates, cap des 90 jours. Ensuite viendront les objectifs, la compo et la routine.</p>
    ${seasonForm(null)}
  </section>`;
}
function seasonForm(s) {
  const T = ctx.today;
  const v = s || { name: '', start: T, end: addDays(T, 280), cap: '', capStart: T, capDeadline: addDays(T, 89), vision: '', restPerWeek: 1 };
  const id = s ? s.id : 'new';
  const univers = !s && THEME_ID === 'foot' && !seasonList().length ? `<div class="th-pick"><div class="eyebrow">Choisis ton univers</div><p class="small muted">Il donne son vocabulaire et ses couleurs à tout le tableau de bord. Modifiable ensuite dans Réglages › Apparence.</p>${themeGrid(resolveTheme())}</div>` : '';
  return univers + `<form class="stack" data-f="season" data-id="${esc(s ? s.id : '')}">
    <div class="form-row">
      <div class="grow"><label class="lbl" for="sf-name-${id}">Nom de la saison</label><input type="text" id="sf-name-${id}" class="draft" name="name" maxlength="40" value="${esc(v.name)}" placeholder="Saison 2026-27"></div>
      <div class="fix"><label class="lbl" for="sf-start-${id}">Début</label><input type="date" id="sf-start-${id}" class="draft" name="start" value="${esc(v.start)}"></div>
      <div class="fix"><label class="lbl" for="sf-end-${id}">Fin</label><input type="date" id="sf-end-${id}" class="draft" name="end" value="${esc(v.end)}"></div>
    </div>
    <div><label class="lbl" for="sf-vision-${id}">Vision (le pourquoi, sur plusieurs saisons)</label><textarea id="sf-vision-${id}" class="draft" name="vision" maxlength="400" rows="2">${esc(v.vision || '')}</textarea></div>
    <div><label class="lbl" for="sf-cap-${id}">Cap des 90 jours : une seule phrase vérifiable</label><textarea id="sf-cap-${id}" class="draft" name="cap" maxlength="400" rows="2">${esc(v.cap || '')}</textarea></div>
    <div class="form-row">
      <div class="fix"><label class="lbl" for="sf-cs-${id}">Début du cap</label><input type="date" id="sf-cs-${id}" class="draft" name="capStart" value="${esc(v.capStart || v.start)}"></div>
      <div class="fix"><label class="lbl" for="sf-cd-${id}">Échéance du cap</label><input type="date" id="sf-cd-${id}" class="draft" name="capDeadline" value="${esc(v.capDeadline || '')}"></div>
      <div class="tiny"><label class="lbl" for="sf-rest-${id}">Trêves / sem.</label><input type="number" id="sf-rest-${id}" class="draft" name="restPerWeek" min="0" max="3" step="1" value="${esc(v.restPerWeek == null ? 1 : v.restPerWeek)}"></div>
    </div>
    <div><button type="submit" class="btn btn-primary">${s ? 'Enregistrer la saison' : 'Créer la saison'}</button></div>
  </form>`;
}

/* ---------- premiers pas : liste de démarrage calculée depuis les données */
function startSteps() {
  const days = [];
  Object.keys(S.matches).forEach(mk => { const d = (S.matches[mk] && S.matches[mk].days) || {}; Object.keys(d).forEach(k => days.push(d[k] || {})); });
  return [
    { ok: ctx.projects.length > 0, t: 'Crée au moins un projet', a: 'data-a="go" data-tab="compo"' },
    { ok: !!ctx.captain, t: 'Nomme ton capitaine', a: 'data-a="go" data-tab="compo"' },
    { ok: questArr().length >= 3, t: 'Ajoute 3 quêtes', a: 'data-a="quick" data-kind="quete"' },
    { ok: ctx.habits.length > 0, t: 'Crée ta routine', a: 'data-a="go" data-tab="reglages" data-set="routines"' },
    { ok: days.some(d => d.ko), t: 'Donne ton premier coup d’envoi', a: 'data-a="scrollTo" data-id="match"' },
    { ok: days.some(d => d.ft && d.ft.closedTs), t: 'Siffle ton premier Full Time', a: 'data-a="scrollTo" data-id="fulltime"' },
    { ok: arr('reviews').some(r => r.kind === 'S' && r.done), t: 'Fais ton premier bilan de semaine', a: 'data-a="perf" data-v="semaine"' },
    { ok: libNotes().length > 0, t: 'Prends ta première note de lecture', a: 'data-a="go" data-tab="savoir"' },
    { ok: agRuns().length > 0, t: 'Lance ta première revue', a: 'data-a="go" data-tab="agent"' },
    { ok: arr('mood').length > 0, t: 'Ajoute un élément au moodboard', a: 'data-a="go" data-tab="mood"' },
    { ok: arr('rewards').length > 0, t: 'Fixe-toi une récompense', a: 'data-a="perf" data-v="carriere"' }
  ];
}
function startCard() {
  if (R().onboard.hidden) return '';
  const st = startSteps();
  const n = st.filter(x => x.ok).length;
  if (n === st.length) return '';
  const next = st.find(x => !x.ok);
  return `<section class="card start">
    <div class="card-h"><h2 class="h3">Premiers pas</h2><span class="card-r">${n}/${st.length}</span></div>
    <div class="prog thin" style="margin-bottom:10px"><i style="width:${n / st.length * 100}%"></i></div>
    <ul class="start-l">${st.map(x => `<li class="${x.ok ? 'ok' : ''}"><span class="st-i" aria-hidden="true">${x.ok ? ICON.check : ''}</span><span class="grow1">${x.t}</span>${x.ok ? '' : `<button type="button" class="btn btn-xs ${x === next ? 'btn-primary' : 'btn-ghost'}" ${x.a}>Y aller</button>`}</li>`).join('')}</ul>
    <div class="row-wrap" style="margin-top:10px"><button type="button" class="btn btn-sm" data-a="go" data-tab="guide">Lire le guide</button><button type="button" class="btn btn-sm btn-ghost" data-a="onboardHide">Masquer</button></div>
  </section>`;
}
