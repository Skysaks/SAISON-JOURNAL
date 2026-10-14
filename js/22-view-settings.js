/* =========================================================
   Réglages : Saison, Score, XP, Match, Quêtes, Compo, Routines,
   Objectifs, Notifications, Apparence, Données, Avancé
   ========================================================= */
const SET_SECTIONS = [['saison', 'Saison'], ['score', 'Score'], ['xp', 'XP'], ['match', 'Match'], ['quetes', 'Quêtes'], ['compo', 'Compo'], ['routines', 'Routines'], ['objectifs', 'Objectifs'], ['agent', 'Agent de revue'], ['savoir', 'Bibliothèque'], ['notifications', 'Notifications'], ['langue', 'Langue'], ['apparence', 'Apparence'], ['donnees', 'Données'], ['avance', 'Avancé']];
const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function setPath(o, p, v) { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach(k => { if (!isObj(x[k])) x[k] = {}; x = x[k]; }); x[ks[ks.length - 1]] = v; }
function numField(path, label, min, max, step, hint) {
  const v = getPath(R(), path), d = getPath(DEFAULTS, path);
  const id = 'set-' + path.replace(/\./g, '-');
  return `<div class="sfield"><label class="lbl" for="${id}">${label}</label><input type="number" id="${id}" data-c="set" data-path="${path}" data-type="num" min="${min}" max="${max}" step="${step || 1}" value="${esc(v)}"><span class="def">défaut ${fmt1(d)}${hint ? ' · ' + hint : ''}</span></div>`;
}
function boolField(path, label) {
  const v = !!getPath(R(), path), d = !!getPath(DEFAULTS, path), id = 'set-' + path.replace(/\./g, '-');
  return `<div class="sfield chk-field"><label class="switch"><input type="checkbox" id="${id}" data-c="set" data-path="${path}" data-type="bool" ${v ? 'checked' : ''}><span>${label}</span></label><span class="def">défaut ${d ? TX('oui') : TX('non')}</span></div>`;
}
function selField(path, label, opts) {
  const v = getPath(R(), path), d = getPath(DEFAULTS, path), id = 'set-' + path.replace(/\./g, '-');
  return `<div class="sfield"><label class="lbl" for="${id}">${label}</label><select id="${id}" data-c="set" data-path="${path}" data-type="str">${Object.keys(opts).map(k => `<option value="${k}"${v === k ? ' selected' : ''}>${esc(opts[k])}</option>`).join('')}</select><span class="def">défaut ${esc(opts[d] || d)}</span></div>`;
}
const restoreBtn = sec => `<button type="button" class="btn btn-sm btn-ghost" data-a="setRestore" data-sec="${sec}">Restaurer les valeurs par défaut</button>`;

VIEWS.reglages = () => {
  const sec = SET_SECTIONS.some(x => x[0] === ui.set) ? ui.set : 'saison';
  const fn = SETV[sec];
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">Règles, routine, données</div><h1>Réglages</h1></div></div>
  <div class="set-layout">
    <nav class="set-nav" aria-label="Sections des réglages">${SET_SECTIONS.map(([id, l]) => `<button type="button" class="${sec === id ? 'on' : ''}" data-a="setSec" data-v="${id}" aria-current="${sec === id ? 'page' : 'false'}">${l}</button>`).join('')}</nav>
    <div class="set-body">${fn()}</div>
  </div>`;
};
const SETV = {};
SETV.saison = () => {
  const s = ctx.season || latestSeason();
  const l = seasonList();
  const ms = s && Array.isArray(s.capMilestones) ? s.capMilestones : [];
  return `${s ? sectionCard(`Saison en cours : ${esc(s.name || s.id)}`, seasonForm(s)) : sectionCard('Créer une saison', seasonForm(null))}
  ${s ? sectionCard('Étapes du cap des 90 jours', `${ms.length ? `<ul class="rows">${ms.map(m => `<li><div class="grow1"><div class="title n">${esc(m.title)}</div><div class="meta">${isKey(m.due) ? `<span class="due">${fmtShort(m.due)}</span>` : ''}${m.done ? pill('Fait', 'win') : ''}</div></div><button type="button" class="btn btn-xs btn-ghost" data-a="capStepDel" data-s="${esc(s.id)}" data-id="${esc(m.id)}">Retirer</button></li>`).join('')}</ul>` : '<p class="small muted">Aucune étape : le statut du cap ne peut pas être estimé.</p>'}
    <form class="formbox" data-f="capStepAdd" data-s="${esc(s.id)}"><div class="form-row"><div class="grow"><label class="lbl" for="cms-t">Nouvelle étape</label><input type="text" id="cms-t" class="draft" name="title" maxlength="120"></div><div class="fix"><label class="lbl" for="cms-d">Échéance</label><input type="date" id="cms-d" class="draft" name="due"></div><button type="submit" class="btn">Ajouter</button></div></form>`, `+${xpv('capStep')} XP par étape`) : ''}
  ${sectionCard('Toutes les saisons', `<ul class="rows">${l.map(x => `<li><div class="grow1"><div class="title">${esc(x.name || x.id)}</div><div class="meta"><span class="due">${fmtShort(x.start)} → ${fmtShort(x.end)}</span>${x.end < ctx.today ? pill('Terminée', 'pre') : x.start > ctx.today ? pill('À venir', 'live') : pill('En cours', 'win')}</div></div><button type="button" class="btn btn-xs btn-ghost" data-a="seasonView" data-id="${esc(x.id)}">Voir</button></li>`).join('')}</ul>
    <div class="hr"></div><div class="eyebrow">Préparer la saison suivante</div><p class="small muted" style="margin:4px 0 10px">L'XP de carrière, les trophées et les records sont conservés ; l'XP de saison repart de zéro.</p>${seasonForm(null)}`)}`;
};
SETV.score = () => sectionCard('Score du match', `<p class="small">Le score mesure l'exécution de la journée, sur 100. Il est distinct de l'XP (ce qui est accompli), des points (la régularité) et du niveau (l'expérience).</p>
  <div class="sgrid">${numField('score.wCoups', 'Poids des 3 coups', 0, 100)}${numField('score.wRoutine', 'Poids de la routine', 0, 100)}${numField('score.wClose', 'Poids de la clôture (Full Time)', 0, 100)}</div>
  <div class="sgrid">${numField('score.win', 'Seuil de victoire', 1, 100)}${numField('score.draw', 'Seuil du match nul', 0, 99)}${selField('score.rounding', 'Arrondi', { round: 'Au plus proche', floor: 'Vers le bas' })}</div>
  <div class="eyebrow" style="margin-top:12px">Poids des coups selon leur type</div>
  <div class="sgrid">${numField('score.kindWeight.livrer', 'Livrer', 0.5, 3, 0.25)}${numField('score.kindWeight.terrain', 'Terrain', 0.5, 3, 0.25)}${numField('score.kindWeight.fond', 'Fond', 0.5, 3, 0.25)}</div>
  <div class="eyebrow" style="margin-top:12px">Types de match</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Type</th><th>Coups requis</th><th>Routine comptée</th></tr></thead><tbody>${['normal', 'intense', 'recovery', 'voyage', 'imprevu'].map(t => `<tr><td>${DAY_TYPES[t].label}</td><td><label class="sr" for="dtc-${t}">Coups requis</label><input type="number" id="dtc-${t}" data-c="set" data-path="dayTypes.${t}.coups" data-type="num" min="0" max="3" step="1" value="${esc(R().dayTypes[t].coups)}" class="w70"></td><td><label class="switch"><input type="checkbox" id="dtr-${t}" data-c="set" data-path="dayTypes.${t}.routine" data-type="bool" ${R().dayTypes[t].routine ? 'checked' : ''}><span class="sr">Routine comptée</span></label></td></tr>`).join('')}<tr><td>Trêve</td><td colspan="2" class="muted small">Neutre, quota par semaine réglé dans la saison</td></tr></tbody></table></div>
  <p class="small muted" style="margin-top:10px">Version des règles : v${R().rulesVersion}. Chaque match terminé garde les règles avec lesquelles il a été joué : un changement ici ne modifie jamais un score passé.</p>
  <div class="row-wrap" style="margin-top:8px">${restoreBtn('score')}</div>`);
SETV.xp = () => sectionCard('XP', `<p class="small">L'XP mesure ce qui est accompli. Elle ne se perd jamais : seule une saisie annulée retire son propre gain.</p>
  <div class="sgrid">${numField('xp.livrer', 'Quête Livrer', 0, 500)}${numField('xp.terrain', 'Quête Terrain', 0, 500)}${numField('xp.fond', 'Quête Fond', 0, 500)}</div>
  <div class="sgrid">${numField('mult.capitaine', 'Multiplicateur capitaine', 0, 5, 0.25)}${numField('mult.titulaire', 'Multiplicateur titulaire', 0, 5, 0.25)}${numField('mult.banc', 'Multiplicateur banc', 0, 5, 0.25)}${numField('mult.tribune', 'Multiplicateur tribune', 0, 5, 0.25)}</div>
  <div class="sgrid">${numField('xp.hat', 'Coup du chapeau', 0, 500)}${numField('xp.close', 'Clôture du match', 0, 200)}${numField('xp.goalW', 'Objectif semaine', 0, 5000)}${numField('xp.goalM', 'Objectif mois', 0, 5000)}${numField('xp.goalS', 'Objectif saison', 0, 20000)}</div>
  <div class="sgrid">${numField('xp.reviewS', 'Bilan semaine', 0, 1000)}${numField('xp.reviewM', 'Bilan mois', 0, 2000)}${numField('xp.reviewA', 'Bilan saison', 0, 5000)}${numField('xp.book', 'Savoir terminé (idée clé)', 0, 1000)}${numField('xp.applied', 'Savoir appliqué', 0, 1000)}${numField('xp.contact', 'Échange réseau', 0, 500)}</div>
  <div class="sgrid">${numField('xp.capStep', 'Étape du cap', 0, 2000)}${numField('xp.cupStep', 'Étape de Cup', 0, 2000)}${numField('xp.cup', 'Cup remportée', 0, 10000)}${numField('xp.focus', 'Bloc de focus terminé', 0, 200)}${numField('xp.focusCap', 'Blocs de focus avec XP par jour', 0, 20)}</div>
  <div class="eyebrow" style="margin-top:12px">Anti-farming</div>
  <div class="sgrid">${numField('xp.dailyQuestCap', 'Quêtes rapportant de l’XP par jour', 1, 50, 1, 'au-delà : 0 XP')}${numField('xp.unplannedCap', 'Dont non planifiées', 0, 50, 1, 'créées et faites le jour même')}</div>
  <p class="small muted">L'XP des habitudes se règle dans Routines. Un changement ici ne modifie pas l'XP déjà gagnée.</p>
  <div class="row-wrap" style="margin-top:8px">${restoreBtn('xp')}</div>`);
SETV.match = () => sectionCard('Match', `<div class="sgrid">${selField('match.defaultType', 'Type de match par défaut', { normal: 'Normal', intense: 'Haute intensité', recovery: 'Récupération', voyage: 'Voyage', imprevu: 'Imprévu' })}</div>${boolField('match.askKickoff', 'Proposer le coup d’envoi chaque matin')}${boolField('focus.sound', 'Signal sonore à la fin d’un bloc de focus')}<div class="row-wrap" style="margin-top:8px">${restoreBtn('match')}</div>`);
SETV.quetes = () => sectionCard('Quêtes', `<div class="sgrid">${selField('quests.defaultKind', 'Type par défaut', KIND)}${selField('quests.defaultPrio', 'Priorité par défaut', PRIO)}${numField('quests.blockedAfter', 'Signaler comme bloquée après', 1, 10, 1, 'reports')}</div><div class="row-wrap" style="margin-top:8px">${restoreBtn('quetes')}</div>`);
SETV.compo = () => sectionCard('Compo et mercato', `<div class="sgrid">${selField('mercato', 'Fenêtre de composition', MERCATO)}</div><p class="small muted">Par défaut, un changement de poste prend effet au prochain match. Le multiplicateur appliqué à une quête reste celui du jour où elle est terminée.</p><div class="row-wrap" style="margin-top:8px">${restoreBtn('compo')}</div>`);
SETV.objectifs = () => sectionCard('Objectifs', `<div class="sgrid">${numField('goals.maxW', 'Maximum par semaine', 1, 10, 1, 'recommandé 3')}${numField('goals.maxM', 'Maximum par mois', 1, 10, 1, 'recommandé 3')}${numField('goals.maxS', 'Maximum par saison', 1, 12, 1, 'recommandé 5')}</div><p class="small muted">La limite protège contre la dispersion. Monter au-delà des valeurs recommandées affaiblit le système.</p><div class="row-wrap" style="margin-top:8px">${restoreBtn('objectifs')}</div>`);
SETV.agent = () => {
  const st = agState();
  return sectionCard('Agent de revue', `<p class="small">L'agent passe ${AG_DETECTORS.length} détecteurs sur tes données à chaque ouverture de sa section. Il ne lit que ce qui est enregistré : aucun chiffre n'est inventé, aucune donnée ne sort de ta base sans que tu demandes une lecture à Claude.</p>
    ${boolField('agent.autoWeekly', 'Figer une revue automatiquement chaque semaine')}
    ${boolField('agent.onMatch', 'Afficher les constats importants sur l’écran du match')}
    <div class="sgrid">${numField('agent.snoozeDays', 'Durée de mise de côté d’un constat', 1, 90, 1, 'jours')}${numField('agent.minMatches', 'Matchs minimum avant analyse', 0, 30, 1, 'sous ce seuil, l’agent se tait')}</div>
    <p class="small muted">${st.lastSnap ? `Dernière revue figée le ${fmtShort(st.lastSnap)}.` : 'Aucune revue figée pour l’instant.'} ${plural(agRuns().length, 'revue gardée', 'revues gardées')} (30 au maximum, les plus anciennes sont effacées).</p>
    ${Object.keys(st.snooze).length ? `<div class="hr"></div><div class="eyebrow">Constats mis de côté</div><ul class="rows">${Object.keys(st.snooze).map(k => `<li><div class="grow1 small">${esc(k)}</div><span class="due">jusqu’au ${fmtShort(st.snooze[k])}</span><button type="button" class="btn btn-xs btn-ghost" data-a="agWake" data-key="${esc(k)}">Remettre</button></li>`).join('')}</ul>` : ''}
    <div class="row-wrap" style="margin-top:8px">${restoreBtn('agent')}</div>`);
};
SETV.savoir = () => sectionCard('Bibliothèque', `<p class="small">Les lectures et leurs notes vivent dans la même fiche : une note est toujours rattachée à ce que tu lisais.</p>
  <div class="sgrid">${numField('lib.goalYear', 'Objectif de ressources terminées par an', 0, 200, 1, '0 pour ne rien afficher')}</div>
  <div class="sgrid">${numField('xp.book', 'Ressource terminée avec l’idée clé', 0, 1000)}${numField('xp.applied', 'Idée appliquée dans la vraie vie', 0, 1000)}</div>
  <p class="small muted">Les notes ne rapportent volontairement aucune XP : elles servent à retrouver ce que tu as lu, pas à marquer des points. C'est l'application d'une idée qui en donne.</p>
  <div class="row-wrap" style="margin-top:8px">${restoreBtn('savoir')}</div>`);
SETV.notifications = () => sectionCard('Notifications', `<p class="small">Les notifications passent par des tâches programmées de Claude, qui lisent ces réglages avant d'envoyer quoi que ce soit. Désactivé ici = silence.</p>
  ${boolField('notif.kickoff', 'Coup d’envoi le matin (plan du jour, échéances)')}<div class="sgrid"><div class="sfield"><label class="lbl" for="set-notif-kickoffTime">Heure du matin</label><input type="time" id="set-notif-kickoffTime" data-c="set" data-path="notif.kickoffTime" data-type="str" value="${esc(R().notif.kickoffTime)}"><span class="def">défaut 08:00</span></div></div>
  ${boolField('notif.deadlines', 'Rappel des échéances du jour (dans le message du matin)')}
  ${boolField('notif.fulltime', 'Full Time le soir (clôture du match)')}<div class="sgrid"><div class="sfield"><label class="lbl" for="set-notif-fulltimeTime">Heure du soir</label><input type="time" id="set-notif-fulltimeTime" data-c="set" data-path="notif.fulltimeTime" data-type="str" value="${esc(R().notif.fulltimeTime)}"><span class="def">défaut 21:30</span></div></div>
  <p class="small muted">Les heures d'envoi réelles sont celles des tâches programmées ; pour les décaler, demande-le à Claude.</p>
  <div class="row-wrap" style="margin-top:8px">${restoreBtn('notifications')}</div>`);
SETV.langue = () => {
  const raw = S.settings.main ? S.settings.main.lang : undefined;
  const cur = LANG_NAMES[raw] ? raw : (raw == null && Object.keys(S.seasons).length ? 'fr' : 'auto');
  const auto = browserLang();
  const opts = [['auto', `Automatique · ${LANG_NAMES[auto]}`]].concat(Object.keys(LANG_NAMES).map(l => [l, LANG_NAMES[l]]));
  return sectionCard('Langue', `<div class="lang-grid">${opts.map(([l, label]) => `<button type="button" class="more-b ${cur === l ? 'on' : ''}" aria-pressed="${cur === l}" data-a="setLang" data-v="${l}">${label}</button>`).join('')}</div>
    <p class="small muted" style="margin-top:10px">Toute l’interface change immédiatement : textes, dates, nombres et analyses de Claude. Tes propres textes (quêtes, notes, projets) restent tels que tu les as écrits.</p>`);
};
SETV.apparence = () => {
  const lk = R().look;
  const themes = themeCard();
  const swOf = p => (p === 'perso' ? lk.custom : p === 'defaut' ? PALETTE_DEFAULT_SWATCH : PALETTES[p]) || PALETTE_DEFAULT_SWATCH;
  const sw = c => `<span class="pal-sw" aria-hidden="true"><i style="background:${validHex(c.board) || '#222222'}"></i><i style="background:${validHex(c.accent) || '#888888'}"></i><i style="background:${validHex(c.reward) || '#CCAA33'}"></i></span>`;
  const pals = Object.keys(PALETTE_NAMES).map(p => `<button type="button" class="pal ${lk.palette === p ? 'on' : ''}" aria-pressed="${lk.palette === p}" data-a="setPalette" data-v="${p}">${sw(swOf(p))}<span>${PALETTE_NAMES[p]}</span></button>`).join('');
  const colorF = (key, label) => `<div class="sfield"><label class="lbl" for="set-c-${key}">${label}</label><input type="color" id="set-c-${key}" data-c="lookColor" data-k="${key}" value="${validHex(lk.custom[key]) || '#888888'}"></div>`;
  return themes + sectionCard('Apparence', `<div class="sgrid"><div class="sfield"><label class="lbl" for="set-clubName">Nom affiché en haut de l'écran</label><input type="text" id="set-clubName" data-c="set" data-path="clubName" data-type="str" maxlength="24" value="${esc(R().clubName || '')}"><span class="def">défaut « ${esc(thBrand())} »</span></div></div>
    <div class="sgrid">${selField('look.theme', 'Thème', { auto: 'Automatique (celui de Claude)', dark: 'Sombre', light: 'Clair' })}${selField('look.density', 'Densité', { confort: 'Confortable', compact: 'Compacte' })}${selField('look.motion', 'Animations', { auto: 'Selon le système', reduce: 'Réduites' })}</div>
    <div class="eyebrow" style="margin-top:16px">Couleurs</div>
    <div class="pal-grid">${pals}</div>
    <div class="sgrid">${colorF('accent', 'Couleur principale')}${colorF('board', 'En-tête')}${colorF('reward', 'Récompenses (XP, niveau)')}</div>
    <p class="small muted" style="margin-top:6px">Toucher une couleur active la palette personnalisée. Les teintes dérivées (fonds, survols, mode sombre) sont recalculées pour rester lisibles.</p>
    <div class="sgrid">${selField('look.tint', 'Fonds', { teinte: 'Teintés par la couleur principale', neutre: 'Neutres' })}${selField('look.results', 'Couleurs des résultats', { std: 'Vert, jaune, rouge', cb: 'Adaptées au daltonisme' })}${selField('look.titles', 'Style des titres', { condense: 'Condensés', classique: 'Classiques' })}</div>
    ${boolField('onboard.hidden', 'Masquer la carte « Premiers pas »')}
    <div class="row-wrap" style="margin-top:8px">${restoreBtn('apparence')}</div>`);
};
SETV.routines = () => {
  const act = ctx.habits.filter(h => !h.archivedAt), arch = ctx.habits.filter(h => h.archivedAt);
  const areaOpts = sel => `<option value="">Sans domaine</option>` + Object.keys(LIFE).map(k => `<option value="${k}"${sel === k ? ' selected' : ''}>${LIFE[k]}</option>`).join('') + ctx.projects.filter(p => statusAt(p, ctx.today) !== 'tribune').map(p => `<option value="${esc(p.id)}"${sel === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  const row = h => { const days = daysFor(h, ctx.today); return `<div class="hedit">
    <input type="text" id="hn-${h.id}" data-c="habitField" data-field="name" data-id="${h.id}" maxlength="80" value="${esc(h.name)}" aria-label="Nom de l'habitude">
    <select id="hb-${h.id}" data-c="habitField" data-field="block" data-id="${h.id}" aria-label="Moment">${Object.keys(BLOCKS).map(b => `<option value="${b}"${(h.block || 'journee') === b ? ' selected' : ''}>${BLOCKS[b]}</option>`).join('')}</select>
    <select id="hx-${h.id}" data-c="habitField" data-field="xp" data-id="${h.id}" aria-label="XP">${[5, 10, 15, 20, 25].map(n => `<option value="${n}"${Number(h.xp) === n ? ' selected' : ''}>${n} XP</option>`).join('')}</select>
    <select id="ha-${h.id}" data-c="habitField" data-field="area" data-id="${h.id}" aria-label="Domaine">${areaOpts(h.area || '')}</select>
    ${delBtn('habitArchive', h.id, 'Archiver')}
    <div class="days7" role="group" aria-label="Jours prévus">${J1.map((j, i) => `<button type="button" class="${days.includes(i + 1) ? 'on' : ''}" aria-pressed="${days.includes(i + 1)}" data-a="habitDay" data-id="${h.id}" data-d="${i + 1}" aria-label="${JOURS[i]}">${j}</button>`).join('')}</div></div>`; };
  return sectionCard('Routines', `${act.length ? act.map(row).join('') : '<p class="small muted">Aucune habitude active.</p>'}
    <p class="small muted" style="margin-top:10px">Changer les jours s'applique à partir d'aujourd'hui : les matchs passés gardent leur score. Le domaine alimente l'indice d'équilibre.</p>
    <form class="formbox" data-f="habit"><div class="form-row"><div class="grow"><label class="lbl" for="hf-name">Nouvelle habitude</label><input type="text" id="hf-name" class="draft" name="name" maxlength="80" placeholder="Précise et vérifiable"></div><div class="fix"><label class="lbl" for="hf-block">Moment</label><select id="hf-block" class="draft" name="block">${Object.keys(BLOCKS).map(b => `<option value="${b}">${BLOCKS[b]}</option>`).join('')}</select></div><div class="tiny"><label class="lbl" for="hf-xp">XP</label><select id="hf-xp" class="draft" name="xp">${[5, 10, 15, 20, 25].map(n => `<option value="${n}"${n === 10 ? ' selected' : ''}>${n}</option>`).join('')}</select></div><button type="submit" class="btn">Ajouter</button></div><p class="small muted">Prévue du lundi au vendredi ; ajuste les jours ensuite.</p></form>
    ${arch.length ? `<div class="hr"></div><div class="eyebrow">Archivées</div><ul class="rows">${arch.map(h => `<li><div class="grow1 small">${esc(h.name)}</div><span class="due">depuis le ${fmtShort(h.archivedAt)}</span></li>`).join('')}</ul>` : ''}`, `${plural(act.length, 'active')}`);
};
