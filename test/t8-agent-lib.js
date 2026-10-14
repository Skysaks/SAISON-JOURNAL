// Agent de revue et bibliothèque : détecteurs, suivi, notes, redémarrage de saison.
const { chromium } = require('playwright');
const fs = require('fs');
const PAGE = process.env.PAGE || 'ma-saison.html';
const KEY = 'ma-saison-v2';
const DATA = fs.readFileSync(__dirname + '/../dist/demo.json', 'utf8');
const URL = 'file://' + __dirname + '/../dist/' + PAGE;
const SHOTS = process.env.SHOTS || '/tmp/claude-0';
const out = [], errs = [];
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR', colorScheme: 'dark' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('console ' + m.text()); });
  await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p.goto(URL);
  await p.evaluate(([d, k]) => { localStorage.setItem(k + ':data', d); localStorage.setItem(k + ':seeded', '1'); localStorage.removeItem(k + ':bak'); }, [DATA, KEY]);
  await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(700);
  const txt = s => p.textContent(s).then(x => (x || '').replace(/\s+/g, ' ').trim()).catch(() => '');
  const click = async (sel, i) => { const l = p.locator(sel); await (i == null ? l.first() : l.nth(i)).click(); await p.waitForTimeout(200); };

  /* =====================================================
     1. Bibliothèque : fiche, notes, recherche
     ===================================================== */
  await p.evaluate(() => { ui.tab = 'savoir'; ui.lib.tab = 'lectures'; render(); }); await p.waitForTimeout(300);
  ok((await txt('.viewhead h1')) === 'Bibliothèque', 'Section renommée « Bibliothèque »');
  ok(await p.locator('.seg-nav [data-a="libTab"]').count() === 3, 'Trois onglets : lectures, notes, leçons');

  const kid = await p.evaluate(() => { const x = libArr()[0]; return x ? x.id : null; });
  ok(!!kid, 'Au moins une ressource dans la bibliothèque');
  await p.evaluate(id => { ui.lib.open = id; render(); }, kid); await p.waitForTimeout(250);
  ok(await p.locator('.lib-sheet').count() === 1, 'Fiche ouverte en pleine largeur');

  // métadonnées éditables
  await p.fill(`#lm-p-${kid}`, '320');
  await p.press(`#lm-p-${kid}`, 'Tab'); await p.waitForTimeout(250);
  ok(await p.evaluate(id => Number(S.knowledge_items[id].pages) === 320, kid), 'Nombre de pages enregistré');

  // note « citation » avec numéro de page
  await p.evaluate(() => { ui.lib.noteKind = 'citation'; render(); }); await p.waitForTimeout(150);
  await p.fill(`#ln-t-${kid}`, 'Le mandat se négocie avant le transfert, jamais pendant.');
  await p.fill(`#ln-p-${kid}`, '42');
  await click(`form[data-f="libNote"] button[type=submit]`); await p.waitForTimeout(300);
  const n1 = await p.evaluate(id => { const ns = S.knowledge_items[id].notes || []; return ns.length ? ns[ns.length - 1] : null; }, kid);
  ok(n1 && n1.type === 'citation' && n1.page === 42, 'Note « Citation » enregistrée avec sa page');
  ok(await p.evaluate(id => S.knowledge_items[id].status === 'en_cours', kid), 'Prendre une note fait passer la lecture « en cours »');

  // note « action » → quête
  await p.evaluate(() => { ui.lib.noteKind = 'action'; render(); }); await p.waitForTimeout(150);
  await p.fill(`#ln-t-${kid}`, 'Appeler deux agents licenciés cette semaine');
  await click(`form[data-f="libNote"] button[type=submit]`); await p.waitForTimeout(300);
  const nAct = await p.evaluate(id => (S.knowledge_items[id].notes || []).find(n => n.type === 'action'), kid);
  ok(!!nAct, 'Note « Action » enregistrée');
  const qBefore = await p.evaluate(() => questArr().length);
  await p.evaluate(([id, nid]) => ACT.libNoteToQuest({ dataset: { id, n: nid } }), [kid, nAct.id]); await p.waitForTimeout(300);
  ok(await p.evaluate(n => questArr().length === n + 1, qBefore), 'Note transformée en quête');
  ok(await p.evaluate(([id, nid]) => { const n = (S.knowledge_items[id].notes || []).find(x => x.id === nid); return n && n.questId && S.quests[n.questId] && S.quests[n.questId].kind === 'terrain'; }, [kid, nAct.id]), 'Quête Terrain liée à la note');

  // épingler puis onglet Notes + recherche
  await p.evaluate(([id, nid]) => ACT.libNoteFav({ dataset: { id, n: nid } }), [kid, n1.id]); await p.waitForTimeout(250);
  ok(await p.evaluate(([id, nid]) => !!(S.knowledge_items[id].notes || []).find(x => x.id === nid).fav, [kid, n1.id]), 'Note épinglée');
  await p.evaluate(() => { ui.lib.tab = 'notes'; ui.lib.nFilter = 'all'; ui.lib.nText = ''; render(); }); await p.waitForTimeout(300);
  ok(await p.locator('.notes .note').count() >= 2, 'Toutes les notes listées dans l’onglet Notes');
  await p.evaluate(() => { ui.lib.nFilter = 'fav'; render(); }); await p.waitForTimeout(250);
  const favN = await p.evaluate(() => libNotes().filter(n => n.fav).length);
  ok(favN >= 1 && await p.locator('.notes .note').count() === favN, `Filtre « Épinglées » (${favN})`);
  await p.evaluate(() => { ui.lib.nFilter = 'all'; ui.lib.nText = 'mandat'; render(); }); await p.waitForTimeout(250);
  ok(await p.locator('.notes .note').count() === 1, 'Recherche plein texte dans les notes');
  await p.evaluate(() => { ui.lib.nText = ''; render(); }); await p.waitForTimeout(150);
  await p.screenshot({ path: SHOTS + '/lib-notes.png' });

  // recherche globale
  await p.evaluate(() => { ui.overlay = { type: 'search', q: 'mandat' }; render(); }); await p.waitForTimeout(300);
  ok((await txt('.srch')).includes('mandat'), 'Note trouvable par la recherche globale');
  await p.evaluate(() => { ui.overlay = null; render(); }); await p.waitForTimeout(150);

  // les notes ne donnent pas d'XP
  const xpN = await p.evaluate(() => ctx.xpEv.filter(e => /note/i.test(e.src || '')).length);
  ok(xpN === 0, 'Aucune XP attribuée pour une note');

  // suppression d'une note (deux clics)
  await p.evaluate(() => { ui.tab = 'savoir'; ui.lib.tab = 'lectures'; render(); }); await p.waitForTimeout(200);
  const nb0 = await p.evaluate(id => (S.knowledge_items[id].notes || []).length, kid);
  await p.evaluate(([id, nid]) => ACT.libNoteDel({ dataset: { id, n: nid } }), [kid, n1.id]); await p.waitForTimeout(200);
  ok(await p.evaluate((a) => (S.knowledge_items[a[0]].notes || []).length === a[1], [kid, nb0]), 'Premier clic : confirmation demandée');
  await p.evaluate(([id, nid]) => ACT.libNoteDel({ dataset: { id, n: nid } }), [kid, n1.id]); await p.waitForTimeout(250);
  ok(await p.evaluate((a) => (S.knowledge_items[a[0]].notes || []).length === a[1] - 1, [kid, nb0]), 'Second clic : note supprimée');

  /* =====================================================
     2. Agent de revue
     ===================================================== */
  await p.evaluate(() => { ui.tab = 'agent'; ui.agent.view = 'revue'; render(); }); await p.waitForTimeout(400);
  ok((await txt('.viewhead h1')) === 'Agent de revue', 'Écran de l’agent');
  const det = await p.evaluate(() => AG_DETECTORS.length);
  ok(det >= 20, `${det} détecteurs enregistrés`);
  const scan = await p.evaluate(() => agentScan().map(f => ({ key: f.key, sev: f.sev })));
  ok(Array.isArray(scan), `Analyse exécutée (${scan.length} constats)`);
  ok(scan.every(f => ['critique', 'corriger', 'surveiller'].includes(f.sev)), 'Toutes les gravités sont valides');
  ok(await p.evaluate(() => agentScan().every(f => f.title && f.detail)), 'Chaque constat porte un titre et une explication');

  // un détecteur qui doit se déclencher : forfaits déclarés dans les données de test
  const forf = await p.evaluate(() => { const l = []; for (const k of dayRange(addDays(todayKey(), -13), addDays(todayKey(), -1))) { if (dayResult(k).t === 'F') l.push(k); } return l.length; });
  const hasF = scan.some(f => f.key === 'forfaits');
  ok(forf >= 2 ? hasF : !hasF, `Détecteur « forfaits » cohérent avec les données (${forf} forfaits, constat ${hasF ? 'présent' : 'absent'})`);

  // aucun constat ne doit apparaître deux fois
  ok(new Set(scan.map(f => f.key)).size === scan.length, 'Aucun constat en double');

  // figer une revue
  const runs0 = await p.evaluate(() => agRuns().length);
  await click('[data-a="agSnap"]'); await p.waitForTimeout(500);
  const runs = await p.evaluate(() => agRuns().length);
  ok(runs === runs0 + 1, `Revue figée et enregistrée (${runs0} → ${runs})`);
  ok(await p.evaluate(() => { const r = agRuns()[0]; return r.findings.length === agentScan().length && Array.isArray(r.good); }), 'La revue figée contient les constats et les signaux positifs');

  // mise de côté puis réveil
  const k0 = scan.length ? scan[0].key : null;
  if (k0) {
    await p.evaluate(key => ACT.agSnooze({ dataset: { key } }), k0); await p.waitForTimeout(300);
    ok(await p.evaluate(key => !agentScan().some(f => f.key === key), k0), 'Constat mis de côté disparaît de la revue');
    ok(await p.evaluate(key => agentScan({ withSnoozed: true }).some(f => f.key === key && f.snoozed), k0), 'Il reste visible dans « Mis de côté »');
    await p.evaluate(key => ACT.agWake({ dataset: { key } }), k0); await p.waitForTimeout(300);
    ok(await p.evaluate(key => agentScan().some(f => f.key === key), k0), 'Constat remis en revue');
  }

  // un constat devient une quête, et le suivi le retrouve
  const withQ = await p.evaluate(() => { const f = agentScan().find(x => x.fix && x.fix.type === 'quest'); return f ? f.key : null; });
  if (withQ) {
    const qb = await p.evaluate(() => questArr().length);
    await p.evaluate(key => ACT.agQuest({ dataset: { key } }), withQ); await p.waitForTimeout(400);
    ok(await p.evaluate(n => questArr().length === n + 1, qb), 'Constat transformé en quête');
    ok(await p.evaluate(key => !!agQuestOf(key), withQ), 'La quête est rattachée au constat');
    await p.evaluate(() => { ui.agent.view = 'suivi'; render(); }); await p.waitForTimeout(300);
    ok((await txt('#view')).includes('Recommandations suivies'), 'Onglet Suivi affiché');
    ok(await p.locator('.card .rows li').count() >= 1, 'La recommandation apparaît dans le suivi');
    const qid = await p.evaluate(key => agQuestOf(key).id, withQ);
    await p.evaluate(id => setQuestDone(id, true, todayKey()), qid); await p.waitForTimeout(400);
    await p.evaluate(() => { ui.agent.view = 'suivi'; render(); }); await p.waitForTimeout(250);
    ok((await txt('#view')).includes('Faite'), 'Le suivi voit la recommandation terminée');
  } else ok(true, 'Aucun constat transformable en quête dans ce jeu de données');

  // historique
  await p.evaluate(() => { ui.agent.view = 'historique'; render(); }); await p.waitForTimeout(300);
  ok(await p.locator('.ag-run').count() === 1, 'Historique : la revue figée est consultable');
  ok(await p.locator('.chips [data-a="agRun"]').count() === runs, `Historique : ${runs} revues listées`);
  await p.screenshot({ path: SHOTS + '/agent-revue.png' });

  // carte sur l'écran du match
  await p.evaluate(() => { ui.tab = 'match'; ui.day = todayKey(); render(); }); await p.waitForTimeout(350);
  const mini = await p.locator('.ag-mini').count();
  const important = await p.evaluate(() => agentScan().filter(f => f.sev !== 'surveiller').length);
  ok(important ? mini === 1 : mini === 0, `Carte de l’agent sur l’écran du match (${important} constats importants)`);
  await p.evaluate(() => { saveSettings(s => { s.agent = Object.assign({}, s.agent, { onMatch: false }); }); render(); }); await p.waitForTimeout(350);
  ok(await p.locator('.ag-mini').count() === 0, 'Réglage « afficher sur l’écran du match » respecté');
  await p.evaluate(() => { saveSettings(s => { s.agent = Object.assign({}, s.agent, { onMatch: true }); }); render(); }); await p.waitForTimeout(250);

  // seuil de matchs minimum
  await p.evaluate(() => { saveSettings(s => { s.agent = Object.assign({}, s.agent, { minMatches: 9999 }); }); render(); }); await p.waitForTimeout(350);
  ok(await p.evaluate(() => agentScan().length === 0), 'Sous le seuil de matchs, l’agent se tait');
  await p.evaluate(() => { saveSettings(s => { s.agent = Object.assign({}, s.agent, { minMatches: 4 }); }); render(); }); await p.waitForTimeout(250);

  /* =====================================================
     3. Nouveau départ
     ===================================================== */
  // on joue d'abord deux journées, pour qu'il y ait quelque chose à effacer
  await p.evaluate(() => {
    const T = todayKey();
    const h = ctx.habits[0];
    if (h) ACT.habit({ dataset: { k: T, id: h.id } });
    ACT.ftClose({ dataset: { k: T } });
    setDay(addDays(T, 1), d => { d.coups = []; }, 'test');
  }); await p.waitForTimeout(500);

  await p.evaluate(() => { ui.tab = 'reglages'; ui.set = 'donnees'; render(); }); await p.waitForTimeout(350);
  ok((await txt('#view')).includes('Nouveau départ'), 'Section « Nouveau départ » présente');
  const before = await p.evaluate(() => {
    const s = seasonList()[0];
    let days = 0;
    Object.keys(S.matches).forEach(mk => { const d = (S.matches[mk] && S.matches[mk].days) || {}; days += Object.keys(d).length; });
    return { start: s.start, days, xp: ctx.careerXp, quests: questArr().length, projects: ctx.projects.length, habits: ctx.habits.length, lib: libArr().length };
  });
  const from = await p.evaluate(() => { const m = mondayOf(todayKey()); return m > todayKey() ? m : addDays(m, 7); });
  await p.evaluate(f => { ui.restartFrom = f; render(); }, from); await p.waitForTimeout(250);
  await p.fill('#rst-ok', 'REDÉMARRER');
  await click('form[data-f="restartConfirm"] button[type=submit]'); await p.waitForTimeout(900);
  const after = await p.evaluate(() => {
    const s = seasonList()[0];
    let days = 0, past = 0;
    Object.keys(S.matches).forEach(mk => { const d = (S.matches[mk] && S.matches[mk].days) || {}; Object.keys(d).forEach(k => { days++; if (k < s.start) past++; }); });
    return { start: s.start, days, past, quests: questArr().length, projects: ctx.projects.length, habits: ctx.habits.length, lib: libArr().length, xp: ctx.careerXp, late: questArr().filter(q => !q.done && isKey(q.due) && q.due < s.start).length };
  });
  ok(after.start === from, `Saison recalée au ${after.start}`);
  ok(after.past === 0, 'Aucune journée avant le nouveau départ');
  ok(before.days >= 2 && after.days < before.days, `Journées de rodage effacées (${before.days} → ${after.days})`);
  ok(before.xp > 0 && after.xp < before.xp, `XP de la période annulée (${before.xp} → ${after.xp})`);
  ok(after.late === 0, 'Aucune échéance laissée dans le passé');
  ok(after.projects === before.projects && after.habits === before.habits && after.lib === before.lib, 'Projets, routine et bibliothèque conservés');
  ok(after.quests === before.quests, 'Quêtes conservées');
  ok(await p.evaluate(() => agRuns().length === 0), 'Les revues de l’agent repartent de zéro');
  ok(await p.evaluate(() => logItems('2000-01-01', '2999-12-31', 'regles').some(l => /Nouveau départ/.test(l.text))), 'Redémarrage tracé dans le journal');

  await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(900);
  ok(await p.evaluate(f => seasonList()[0].start === f, from), 'Redémarrage persisté après rechargement');
  ok((await txt('#view')).length > 0 && errs.length === 0, 'Intersaison : l’écran reste affichable avant le coup d’envoi');

  await b.close();
  console.log(out.filter(x => x.startsWith('FAIL')).join('\n') || 'aucun échec');
  console.log(`${out.filter(x => x.startsWith('OK')).length} vérifications OK · ${out.filter(x => x.startsWith('FAIL')).length} échecs`);
  console.log(errs.length ? 'ERREURS JS :\n' + [...new Set(errs)].join('\n') : 'ERREURS JS : aucune');
})();
