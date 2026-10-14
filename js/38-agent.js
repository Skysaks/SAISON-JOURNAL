/* =========================================================
   Agent de revue : détecteurs déterministes sur les données,
   mémoire des revues passées, suivi des recommandations.
   Aucun jugement n'est inventé : chaque constat cite ses chiffres.
   ========================================================= */

/* ---------- état de l'agent (une seule fiche) */
function agState() {
  const st = S.agent && S.agent.state;
  return {
    last: isObj(st) && isKey(st.last) ? st.last : null,
    lastSnap: isObj(st) && isKey(st.lastSnap) ? st.lastSnap : null,
    snooze: isObj(st) && isObj(st.snooze) ? st.snooze : {},
    seen: isObj(st) && isObj(st.seen) ? st.seen : {}
  };
}
function agSaveState(mut) {
  const st = agState();
  mut(st);
  return put('agent', 'state', st, { system: true, silent: true });
}
const agRuns = () => arr('agent').filter(r => r.id !== 'state' && isKey(r.at)).sort((a, b) => b.at.localeCompare(a.at) || (b.ts || 0) - (a.ts || 0));
const agLastRun = () => agRuns()[0] || null;

/* ---------- utilitaires de période */
function agCounted(a, b) {
  const out = [];
  for (const k of dayRange(a, minKey(b, addDays(ctx.today, -1)))) {
    const r = dayResult(k);
    if (counted(r)) out.push(Object.assign({ k }, r));
  }
  return out;
}
function agAvg(a, b) { const l = agCounted(a, b).filter(r => r.t !== 'T'); return l.length ? avg(l.map(r => Number(r.score) || 0)) : null; }
function agRoutineRate(a, b) {
  let due = 0, done = 0;
  agCounted(a, b).forEach(r => { due += Number(r.hDue) || 0; done += Number(r.hDone) || 0; });
  return due ? Math.round(done / due * 100) : null;
}

/* =========================================================
   Les détecteurs. Chacun rend 0 ou 1 constat :
   { key, sev, title, detail, fix }
   fix : { label, type:'quest'|'go', ... }
   ========================================================= */
const AG_DETECTORS = [];
const agDet = (id, fn) => AG_DETECTORS.push({ id, fn });

/* --- exécution quotidienne */
agDet('forfaits', () => {
  const l = agCounted(addDays(ctx.today, -13), ctx.today).filter(r => r.t === 'F');
  if (l.length < 2) return null;
  return {
    key: 'forfaits', sev: l.length >= 4 ? 'critique' : 'corriger',
    title: `${plural(l.length, 'forfait')} sur les 14 derniers jours`,
    detail: `Un forfait, c'est une journée sans aucune saisie : ${l.slice(-3).map(r => fmtDayShort(r.k)).join(', ')}. Ces journées coûtent des points sans rien dire de ce qui s'est passé.`,
    fix: { label: 'Régler le type de match par défaut', type: 'go', tab: 'reglages', set: 'match' }
  };
});
agDet('cloture', () => {
  const l = agCounted(addDays(ctx.today, -13), ctx.today).filter(r => r.t !== 'T' && r.t !== 'F');
  if (l.length < 5) return null;
  const open = l.filter(r => !r.closed);
  if (open.length / l.length < 0.4) return null;
  return {
    key: 'cloture', sev: 'corriger',
    title: `${open.length} matchs sur ${l.length} non clôturés`,
    detail: `La clôture vaut ${Math.round(Number(R().score.wClose) || 0)} points de score et c'est elle qui produit le blocage, l'ajustement et la leçon du jour. Sans elle, les analyses n'ont presque rien à lire.`,
    fix: { label: 'Clôturer le match du jour', type: 'go', tab: 'match' }
  };
});
agDet('score-baisse', () => {
  const a = agAvg(addDays(ctx.today, -7), addDays(ctx.today, -1)), b = agAvg(addDays(ctx.today, -14), addDays(ctx.today, -8));
  if (a == null || b == null) return null;
  if (agCounted(addDays(ctx.today, -7), addDays(ctx.today, -1)).length < 3) return null;
  const d = a - b;
  if (d > -8) return null;
  return {
    key: 'score-baisse', sev: d <= -15 ? 'corriger' : 'surveiller',
    title: `Score moyen en baisse de ${fmt1(-d)} points`,
    detail: `${fmt1(b)} sur la semaine précédente, ${fmt1(a)} sur la dernière. La baisse vient des coups, de la routine ou de la clôture : regarde le détail de la semaine avant de changer quoi que ce soit.`,
    fix: { label: 'Ouvrir la semaine', type: 'go', perf: 'semaine' }
  };
});
agDet('routine-chute', () => {
  const a = agRoutineRate(addDays(ctx.today, -7), addDays(ctx.today, -1)), b = agRoutineRate(addDays(ctx.today, -14), addDays(ctx.today, -8));
  if (a == null || b == null || b - a < 20) return null;
  return {
    key: 'routine-chute', sev: 'corriger',
    title: `Routine à ${a} % contre ${b} % la semaine d'avant`,
    detail: 'Une routine qui décroche annonce presque toujours une baisse de score la semaine suivante. Soit elle est trop lourde, soit le déclencheur a disparu.',
    fix: { label: 'Alléger la routine', type: 'go', tab: 'reglages', set: 'routines' }
  };
});
agDet('habitude-morte', () => {
  const a = addDays(ctx.today, -20);
  const dead = ctx.habits.filter(h => !h.archivedAt).map(h => {
    let due = 0, done = 0;
    for (const k of dayRange(a, addDays(ctx.today, -1))) {
      if (!habitActiveOn(h, k) || !daysFor(h, k).includes(weekday(k))) continue;
      const d = getDay(k);
      if (d && d.type === 'treve') continue;
      due++; if (d && d.h && d.h[h.id] > 0) done++;
    }
    return { h, due, done };
  }).filter(x => x.due >= 5 && x.done === 0);
  if (!dead.length) return null;
  return {
    key: 'habitude-morte', sev: 'corriger',
    title: `${plural(dead.length, 'habitude jamais faite', 'habitudes jamais faites')} depuis 3 semaines`,
    detail: `${dead.map(x => `« ${x.h.name} » (0/${x.due})`).join(', ')}. Une habitude qui n'est jamais cochée fait baisser le score tous les jours sans rien apporter : réduis ses jours ou archive-la.`,
    fix: { label: 'Corriger la routine', type: 'go', tab: 'reglages', set: 'routines' }
  };
});
agDet('sans-treve', () => {
  const a = addDays(ctx.today, -20);
  const l = agCounted(a, ctx.today);
  let treves = 0;
  for (const k of dayRange(a, addDays(ctx.today, -1))) { if (dayResult(k).t === 'T') treves++; }
  if (l.length < 16 || treves) return null;
  return {
    key: 'sans-treve', sev: 'surveiller',
    title: 'Aucune trêve en trois semaines',
    detail: `${l.length} matchs joués d'affilée sans repos planifié. La trêve est un match neutre : elle ne casse ni la série ni les points, elle protège seulement de l'épuisement.`,
    fix: { label: 'Planifier une trêve', type: 'go', tab: 'match' }
  };
});

/* --- exécution des projets */
agDet('capitaine-inactif', () => {
  const cap = ctx.captain;
  if (!cap) return { key: 'sans-capitaine', sev: 'corriger', title: 'Aucun capitaine désigné', detail: 'Sans capitaine, aucune priorité n’est déclarée et le multiplicateur d’XP le plus fort n’est appliqué nulle part.', fix: { label: 'Nommer un capitaine', type: 'go', tab: 'compo' } };
  const ps = projectStats(cap.id);
  if (ps.idle < 5) return null;
  return {
    key: 'capitaine-inactif', sev: ps.idle >= 10 ? 'critique' : 'corriger',
    title: `${cap.name} : rien de concret depuis ${ps.idle} jours`,
    detail: 'Le capitaine est censé être le projet prioritaire. Aucune quête Terrain ou Livrer terminée dessus depuis ce délai : soit la priorité a changé dans les faits, soit le projet est bloqué.',
    fix: { label: 'Créer une action Terrain', type: 'quest', title: `${cap.name} : une action concrète cette semaine`, area: cap.id, kind: 'terrain', prio: 'importante' }
  };
});
agDet('projets-stagnants', () => {
  const l = ctx.projects.filter(p => statusAt(p, ctx.today) === 'titulaire' && projectStats(p.id).stagnant);
  if (!l.length) return null;
  const worst = l.map(p => ({ p, s: projectStats(p.id) })).sort((a, b) => b.s.idle - a.s.idle)[0];
  return {
    key: 'projets-stagnants', sev: l.length >= 3 ? 'corriger' : 'surveiller',
    title: `${plural(l.length, 'titulaire qui ne produit rien', 'titulaires qui ne produisent rien')}`,
    detail: `${l.map(p => `${p.name} (${projectStats(p.id).idle} j)`).join(', ')}. Un titulaire sans action Terrain ou Livrer depuis une semaine prend une place : soit il redescend sur le banc, soit il reçoit une action cette semaine.`,
    fix: { label: `Action pour ${worst.p.name}`, type: 'quest', title: `${worst.p.name} : une action concrète`, area: worst.p.id, kind: 'terrain', prio: 'normale' }
  };
});
agDet('dispersion', () => {
  const done = questsDoneIn(addDays(ctx.today, -13), ctx.today);
  if (done.length < 6 || !ctx.captain) return null;
  const areas = new Set(done.map(q => q.area));
  const onCap = done.filter(q => q.area === ctx.captain.id).length;
  const share = Math.round(onCap / done.length * 100);
  if (areas.size < 5 || share >= 30) return null;
  return {
    key: 'dispersion', sev: 'corriger',
    title: `${areas.size} domaines touchés en 14 jours, ${share} % sur le capitaine`,
    detail: `${done.length} quêtes terminées, réparties sur ${areas.size} domaines, dont ${onCap} seulement sur ${ctx.captain.name}. L'effort est étalé : ou le capitaine n'est plus le bon, ou les autres projets débordent.`,
    fix: { label: 'Revoir la compo', type: 'go', tab: 'compo' }
  };
});
agDet('tout-fond', () => {
  const done = questsDoneIn(addDays(ctx.today, -13), ctx.today);
  if (done.length < 5) return null;
  const tl = done.filter(q => q.kind === 'terrain' || q.kind === 'livrer').length;
  const pct = Math.round(tl / done.length * 100);
  if (pct >= 30) return null;
  return {
    key: 'tout-fond', sev: pct <= 15 ? 'critique' : 'corriger',
    title: `${pct} % de Terrain ou Livrer sur 14 jours`,
    detail: `${done.length} quêtes terminées, dont ${tl} seulement confrontées au réel. Le reste est de la préparation. C'est le profil classique d'un système qui tourne sans produire de preuve extérieure.`,
    fix: { label: 'Créer une action Terrain', type: 'quest', title: 'Une action Terrain cette semaine', area: ctx.captain ? ctx.captain.id : defaultArea(), kind: 'terrain', prio: 'importante' }
  };
});
agDet('zero-livrer', () => {
  const done = questsDoneIn(addDays(ctx.today, -20), ctx.today);
  if (done.length < 6 || done.some(q => q.kind === 'livrer')) return null;
  return {
    key: 'zero-livrer', sev: 'critique',
    title: 'Rien de livré depuis trois semaines',
    detail: `${done.length} quêtes terminées, aucune de type Livrer. Rien n'est sorti de ta tête vers le monde sur la période.`,
    fix: { label: 'Créer une quête Livrer', type: 'quest', title: 'Livrer une chose visible cette semaine', area: ctx.captain ? ctx.captain.id : defaultArea(), kind: 'livrer', prio: 'importante' }
  };
});
agDet('domaines-ignores', () => {
  const ign = balance(addDays(ctx.today, -27), ctx.today).filter(x => x.ignored);
  if (!ign.length) return null;
  return {
    key: 'domaines-ignores', sev: ign.length >= 3 ? 'corriger' : 'surveiller',
    title: `${plural(ign.length, 'domaine actif sans rien', 'domaines actifs sans rien')} depuis 14 jours`,
    detail: `${ign.map(x => areaInfo(x.id).label).join(', ')}. Un domaine déclaré actif mais jamais alimenté fausse l'indice d'équilibre : soit tu t'en occupes, soit tu le sors de la compo.`,
    fix: { label: 'Ouvrir la compo', type: 'go', tab: 'compo' }
  };
});

/* --- quêtes */
agDet('bloquees', () => {
  const l = questArr().filter(isBlocked);
  if (!l.length) return null;
  const w = l.slice().sort((a, b) => (Number(b.postponed) || 0) - (Number(a.postponed) || 0))[0];
  return {
    key: 'bloquees', sev: l.length >= 3 ? 'corriger' : 'surveiller',
    title: `${plural(l.length, 'quête reportée', 'quêtes reportées')} trop souvent`,
    detail: `La pire : « ${w.title} », reportée ${w.postponed} fois. Une quête qu'on repousse n'est presque jamais un problème de volonté : elle est trop grosse, mal définie, ou elle dépend de quelqu'un d'autre.`,
    fix: { label: 'Découper la quête', type: 'go', tab: 'quetes', q: 'bloquees' }
  };
});
agDet('retards', () => {
  const l = questArr().filter(q => !q.done && isKey(q.due) && q.due < ctx.today);
  if (l.length < 3) return null;
  const old = l.reduce((m, q) => (q.due < m.due ? q : m));
  return {
    key: 'retards', sev: l.length >= 8 ? 'corriger' : 'surveiller',
    title: `${l.length} quêtes en retard`,
    detail: `La plus ancienne depuis ${plural(daysBetween(old.due, ctx.today), 'jour')} : « ${old.title} ». Un retard qui dépasse deux semaines est une décision déguisée : tranche au lieu de la reporter.`,
    fix: { label: 'Voir les retards', type: 'go', tab: 'quetes', q: 'retard' }
  };
});
agDet('surcharge', () => {
  const n = questArr().filter(q => !q.done).length;
  if (n < 30) return null;
  return {
    key: 'surcharge', sev: 'surveiller',
    title: `${n} quêtes ouvertes`,
    detail: 'Au-delà d’une trentaine, la liste cesse d’être un plan et devient une réserve d’angoisse. Archive ou termine avant d’ajouter.',
    fix: { label: 'Ouvrir les quêtes', type: 'go', tab: 'quetes' }
  };
});
agDet('plan-non-tenu', () => {
  const p = planAdherence(addDays(ctx.today, -13), ctx.today);
  if (!p || p.n < 5 || p.pct == null || p.pct >= 60) return null;
  return {
    key: 'plan-non-tenu', sev: 'corriger',
    title: `Plan du matin tenu à ${p.pct} %`,
    detail: `${p.done} coups réalisés sur ${p.n} annoncés au coup d'envoi. Soit le plan du matin est trop optimiste, soit la journée est capturée par autre chose : les deux se corrigent en choisissant deux coups au lieu de trois.`,
    fix: { label: 'Ouvrir le match du jour', type: 'go', tab: 'match' }
  };
});
agDet('sans-kickoff', () => {
  const l = agCounted(addDays(ctx.today, -13), ctx.today).filter(r => r.t !== 'T');
  if (l.length < 6) return null;
  const ko = l.filter(r => { const d = getDay(r.k); return d && d.ko && d.ko.ts; });
  if (ko.length > 1) return null;
  return {
    key: 'sans-kickoff', sev: 'surveiller',
    title: 'Coup d’envoi jamais donné',
    detail: `Sur ${l.length} matchs, ${ko.length} seulement ont un plan figé le matin. Sans coup d'envoi, impossible de comparer ce qui était prévu à ce qui a été fait : la moitié des analyses reste vide.`,
    fix: { label: 'Ouvrir le match du jour', type: 'go', tab: 'match' }
  };
});

/* --- objectifs, cap, Cups */
agDet('cap-risque', () => {
  const cs = capStatus(ctx.season);
  if (!cs || cs.st !== 'risque') return null;
  const late = cs.ms.filter(m => !m.done && isKey(m.due) && m.due < ctx.today);
  return {
    key: 'cap-risque', sev: 'critique',
    title: `Cap des 90 jours à risque : ${cs.done}/${cs.total} étapes`,
    detail: `${Math.round((cs.el || 0) * 100)} % du temps est écoulé${late.length ? `, ${plural(late.length, 'étape en retard', 'étapes en retard')} (${late.map(m => m.title).join(', ')})` : ''}. Il reste ${plural(Math.max(0, cs.left), 'jour')}.`,
    fix: { label: 'Voir le cap', type: 'go', tab: 'match' }
  };
});
agDet('objectifs-risque', () => {
  const T = ctx.today, s = ctx.seasonRef;
  const l = goalsFor('semaine', weekKeyOf(T)).concat(goalsFor('mois', monthOf(T)), s ? goalsFor('saison', s.id) : []).filter(g => !g.done && goalStatus(g).st === 'risque');
  if (!l.length) return null;
  const season = l.some(g => g.horizon === 'saison');
  return {
    key: 'objectifs-risque', sev: season ? 'corriger' : 'surveiller',
    title: `${plural(l.length, 'objectif à risque', 'objectifs à risque')}`,
    detail: `${l.slice(0, 3).map(g => `« ${g.title} » (${HORIZON[g.horizon]})`).join(', ')}. L'avancement est en retard sur le temps écoulé : revois la cible ou mets une action dessus cette semaine.`,
    fix: { label: 'Ouvrir les objectifs', type: 'go', perf: 'semaine' }
  };
});
agDet('cup-bloquee', () => {
  const l = arr('cups').filter(c => c.name && !c.done).map(c => {
    const ms = Array.isArray(c.milestones) ? c.milestones : [];
    const dates = ms.filter(m => m.done && isKey(m.doneDate)).map(m => m.doneDate).sort();
    const last = dates.length ? dates[dates.length - 1] : null;
    return { c, last, since: last ? daysBetween(last, ctx.today) : null, done: ms.filter(m => m.done).length, total: ms.length };
  }).filter(x => x.total && (x.since === null || x.since >= 21));
  if (!l.length) return null;
  return {
    key: 'cup-bloquee', sev: 'surveiller',
    title: `${plural(l.length, 'Cup à l’arrêt', 'Cups à l’arrêt')}`,
    detail: `${l.map(x => `${x.c.name} : ${x.done}/${x.total}${x.since === null ? ', aucune étape franchie' : `, rien depuis ${x.since} jours`}`).join(' · ')}. Une Cup est un objectif long : sans étape franchie en trois semaines, elle n'avance plus.`,
    fix: { label: 'Ouvrir la carrière', type: 'go', perf: 'carriere' }
  };
});

/* --- bilans et preuve */
agDet('bilan-saute', () => {
  const lastMon = addDays(mondayOf(ctx.today), -7);
  const weeks = [lastMon, addDays(lastMon, -7)].filter(m => ctx.seasonRef && m >= ctx.seasonRef.start);
  if (!weeks.length) return null;
  const missing = weeks.filter(m => { const r = S.reviews['S-' + weekKeyOf(m)]; return !(r && r.done); });
  if (!missing.length) return null;
  return {
    key: 'bilan-saute', sev: missing.length >= 2 ? 'corriger' : 'surveiller',
    title: `${plural(missing.length, 'bilan de semaine manquant', 'bilans de semaine manquants')}`,
    detail: `Semaine${missing.length > 1 ? 's' : ''} du ${missing.map(m => fmtShort(m)).join(' et du ')}. Le bilan vaut ${xpv('reviewS')} XP et c'est le seul endroit où la preuve terrain et l'argent encaissé sont déclarés.`,
    fix: { label: 'Faire le bilan', type: 'go', perf: 'semaine' }
  };
});
agDet('sans-preuve', () => {
  const done = arr('reviews').filter(r => r.kind === 'S' && r.done && isKey(r.start)).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 4);
  if (done.length < 3) return null;
  if (done.some(r => r.proof === true)) return null;
  return {
    key: 'sans-preuve', sev: 'critique',
    title: `${done.length} semaines sans preuve terrain`,
    detail: 'Aucun fait extérieur déclaré sur la période : ni vente, ni oui, ni rendez-vous obtenu, ni publication. Le système tourne, le monde n’a rien renvoyé.',
    fix: { label: 'Créer une action Terrain', type: 'quest', title: 'Obtenir un fait extérieur cette semaine', area: ctx.captain ? ctx.captain.id : defaultArea(), kind: 'terrain', prio: 'critique' }
  };
});

/* --- savoir et réseau */
agDet('lecture-en-panne', () => {
  const l = libArr().filter(x => x.status === 'en_cours').map(x => {
    const last = libLastTouch(x);
    return { x, since: last ? daysBetween(last, ctx.today) : null };
  }).filter(x => x.since === null || x.since >= 21);
  if (!l.length) return null;
  return {
    key: 'lecture-en-panne', sev: 'surveiller',
    title: `${plural(l.length, 'lecture en pause', 'lectures en pause')}`,
    detail: `${l.slice(0, 3).map(i => `« ${i.x.title} »${i.x.progress ? ` (${i.x.progress} %)` : ''}`).join(', ')}. Trois semaines sans progression ni note : termine-la, abandonne-la, mais ne la laisse pas ouverte.`,
    fix: { label: 'Ouvrir la bibliothèque', type: 'go', tab: 'savoir' }
  };
});
agDet('savoir-non-applique', () => {
  const l = libArr().filter(x => x.status === 'termine' && !x.applied && !x.questId);
  if (l.length < 2) return null;
  return {
    key: 'savoir-non-applique', sev: 'corriger',
    title: `${plural(l.length, 'idée retenue jamais appliquée', 'idées retenues jamais appliquées')}`,
    detail: `${l.slice(0, 3).map(x => `« ${x.takeaway || x.title} »`).join(' · ')}. Lire sans appliquer, c'est du Fond déguisé en progrès : chaque idée terminée vaut ${xpv('book')} XP, son application ${xpv('applied')} de plus.`,
    fix: { label: 'Transformer en action', type: 'go', tab: 'savoir' }
  };
});
agDet('notes-orphelines', () => {
  const l = libNotes().filter(n => n.type === 'action' && !n.questId);
  if (l.length < 3) return null;
  return {
    key: 'notes-orphelines', sev: 'surveiller',
    title: `${plural(l.length, 'note « Action » sans quête', 'notes « Action » sans quête')}`,
    detail: `Ces notes disent ce que tu voulais faire après avoir lu : ${l.slice(0, 2).map(n => `« ${String(n.text).slice(0, 60)} »`).join(', ')}. Tant qu'elles restent des notes, rien ne les fait remonter dans une journée.`,
    fix: { label: 'Ouvrir les notes', type: 'go', tab: 'savoir', lib: 'notes' }
  };
});
agDet('reseau-froid', () => {
  const cs = contactArr();
  if (!cs.length) {
    return { key: 'reseau-vide', sev: 'corriger', title: 'Réseau vide', detail: 'Aucun contact enregistré. Pour un métier qui se joue sur les relations, c’est la donnée la plus absente du tableau.', fix: { label: 'Ajouter un contact', type: 'go', tab: 'reseau' } };
  }
  const late = cs.filter(c => c.late);
  if (late.length < 3) return null;
  return {
    key: 'reseau-froid', sev: late.length >= 8 ? 'corriger' : 'surveiller',
    title: `${late.length} contacts à relancer`,
    detail: `${late.slice(0, 3).map(c => `${c.name}${c.since ? ` (${c.since} j)` : ''}`).join(', ')}. La cadence que tu as fixée toi-même n'est plus tenue.`,
    fix: { label: 'Ouvrir le réseau', type: 'go', tab: 'reseau' }
  };
});
agDet('focus-absent', () => {
  const m = focusMinutes(addDays(ctx.today, -13), ctx.today);
  if (m > 0) return null;
  const done = questsDoneIn(addDays(ctx.today, -13), ctx.today);
  if (done.length < 4) return null;
  return {
    key: 'focus-absent', sev: 'surveiller',
    title: 'Aucun bloc de focus en 14 jours',
    detail: 'Les quêtes avancent sans une seule plage de travail mesurée. Le chrono n’est pas obligatoire, mais sans lui il est impossible de savoir ce qu’une quête coûte vraiment.',
    fix: { label: 'Ouvrir le focus', type: 'go', tab: 'match' }
  };
});
agDet('jour-faible', () => {
  const wd = weekdayStats(addDays(ctx.today, -59), ctx.today).filter(x => x.n >= 3 && x.avg != null);
  if (wd.length < 4) return null;
  const g = avg(wd.map(x => x.avg));
  const worst = wd.slice().sort((a, b) => a.avg - b.avg)[0];
  if (g - worst.avg < 15) return null;
  return {
    key: 'jour-faible', sev: 'surveiller',
    title: `${cap1(JOURS[worst.i])} est ton jour faible`,
    detail: `${fmt1(worst.avg)} de moyenne sur ${plural(worst.n, 'match')}, contre ${fmt1(g)} les autres jours. Un creux qui revient chaque semaine se traite en changeant la charge de ce jour-là, pas en forçant.`,
    fix: { label: 'Voir les analyses', type: 'go', perf: 'analytics' }
  };
});

/* ---------- ce qui va bien : mêmes règles, sens inverse */
function agentGood() {
  const out = [];
  const st = currentStreak();
  if (st >= 5) out.push(`${st} matchs d'affilée sans défaite.`);
  const a = agAvg(addDays(ctx.today, -7), addDays(ctx.today, -1)), b = agAvg(addDays(ctx.today, -14), addDays(ctx.today, -8));
  if (a != null && b != null && a - b >= 5) out.push(`Score moyen en hausse de ${fmt1(a - b)} points sur la semaine.`);
  const rr = agRoutineRate(addDays(ctx.today, -13), ctx.today);
  if (rr != null && rr >= 90) out.push(`Routine tenue à ${rr} % sur 14 jours.`);
  const done = questsDoneIn(addDays(ctx.today, -13), ctx.today);
  const liv = done.filter(q => q.kind === 'livrer').length;
  if (liv >= 3) out.push(`${plural(liv, 'quête Livrer terminée', 'quêtes Livrer terminées')} en 14 jours.`);
  const hats = ctx.xpEv.filter(e => e.src === 'chapeau' && e.d >= addDays(ctx.today, -27)).length;
  if (hats >= 3) out.push(`${plural(hats, 'coup du chapeau')} sur le mois.`);
  const pr = arr('reviews').filter(r => r.kind === 'S' && r.done && r.proof === true && isKey(r.start) && r.start >= addDays(ctx.today, -27)).length;
  if (pr >= 2) out.push(`${plural(pr, 'semaine')} avec preuve terrain sur le mois.`);
  const ap = libArr().filter(x => x.applied && isKey(x.appliedDate) && x.appliedDate >= addDays(ctx.today, -59)).length;
  if (ap >= 2) out.push(`${plural(ap, 'idée appliquée', 'idées appliquées')} sur deux mois.`);
  const cs = capStatus(ctx.season);
  if (cs && (cs.st === 'avance' || cs.st === 'atteint')) out.push(`Cap des 90 jours : ${cs.done}/${cs.total} étapes, en avance sur le temps écoulé.`);
  return out;
}

/* ---------- la revue complète */
function agentScan(opts) {
  const o = opts || {};
  const sn = agState().snooze, seen = agState().seen, T = ctx.today;
  const out = [];
  /* sous un certain nombre de matchs joués, aucun seuil n'a de sens */
  const s = ctx.seasonRef;
  const min = Number(R().agent.minMatches);
  if (Number.isFinite(min) && min > 0 && (!s || agCounted(s.start, T).length < min)) return out;
  AG_DETECTORS.forEach(d => {
    let f = null;
    try { f = d.fn(); } catch (e) { f = null; }
    if (!f) return;
    if (!o.all && isKey(sn[f.key]) && sn[f.key] > T) { f.snoozed = sn[f.key]; if (!o.withSnoozed) return; }
    f.since = isKey(seen[f.key]) ? seen[f.key] : T;
    f.age = daysBetween(f.since, T);
    out.push(f);
  });
  out.sort((a, b) => AG_SEV[b.sev].r - AG_SEV[a.sev].r || b.age - a.age || a.key.localeCompare(b.key));
  return out;
}
function agentCount() {
  try { return agentScan().filter(f => f.sev !== 'surveiller').length; } catch (e) { return 0; }
}
/* enregistre les clés vues aujourd'hui (une écriture par jour au plus) */
function agentTouch() {
  if (!canWrite(true)) return;
  const st = agState();
  if (st.last === ctx.today) return;
  const keys = agentScan({ all: true }).map(f => f.key);
  const seen = {}, T = ctx.today;
  keys.forEach(k => { seen[k] = isKey(st.seen[k]) ? st.seen[k] : T; });
  agSaveState(s => { s.seen = seen; s.last = T; });
}
/* fige une revue : c'est elle qui permet le suivi (ce qui a été réglé, ce qui traîne) */
function agentSnapshot(kind) {
  if (!canWrite()) return null;
  const findings = agentScan();
  const prev = agLastRun();
  const now = new Set(findings.map(f => f.key));
  const resolved = prev && Array.isArray(prev.findings) ? prev.findings.filter(f => !now.has(f.key)).map(f => ({ key: f.key, title: f.title })) : [];
  const id = 'r-' + ctx.today + '-' + Math.random().toString(36).slice(2, 6);
  const doc = {
    at: ctx.today, ts: nowTs(), kind: kind || 'manuelle',
    findings: findings.map(f => ({ key: f.key, sev: f.sev, title: f.title, detail: f.detail, since: f.since })),
    good: agentGood(), resolved, actions: {}, interp: ''
  };
  if (!put('agent', id, doc, { system: kind === 'auto', silent: true })) return null;
  agSaveState(s => { s.lastSnap = ctx.today; });
  const old = agRuns();
  if (old.length > 30) old.slice(30).forEach(r => del('agent', r.id, { system: true, silent: true }));
  return Object.assign({ id }, doc);
}
function agentAutoRun() {
  if (!R().agent.autoWeekly || !canWrite(true)) return;
  const st = agState();
  if (st.lastSnap && daysBetween(st.lastSnap, ctx.today) < 7) return;
  if (!ctx.seasonRef || daysBetween(ctx.seasonRef.start, ctx.today) < 7) return;
  agentSnapshot('auto');
}
/* chiffres bruts remis à Claude : jamais de texte interprété */
function agentFacts(findings) {
  const T = ctx.today;
  const L = coachFacts(addDays(T, -13), T, addDays(T, -27), addDays(T, -14));
  findings.forEach(f => L.push(`[${AG_SEV[f.sev].l}] ${f.title} — ${f.detail}`));
  return L;
}
