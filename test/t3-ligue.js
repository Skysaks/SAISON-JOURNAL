// Ligue des Entrepreneurs : même parcours fonctionnel que t1 + balayage du vocabulaire football dans tout le texte visible.
const { chromium } = require('playwright');
const fs = require('fs');
const DATA = fs.readFileSync(__dirname + '/../dist/demo-neutral.json', 'utf8');
const URL = 'file://' + __dirname + '/../dist/ligue-des-entrepreneurs.html';
const KEY = 'ligue-entrepreneurs-v1';
const SHOTS = process.env.SHOTS || '/tmp/claude-0';
const out = [], errs = [], leaks = new Map();
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);
const BANNED = /(?<![\p{L}\d])(matchs?|coups?|coup d.envoi|full ?time|mercato|compo|capitaine|titulaires?|remplaçants?|vestiaire|foot|football|agents?|joueurs?|clubs?|coachs?|tribune|banc|brassard|trêves?|cups?|chapeau|sifflet|terrain|ballon|réserve|district|ligue [12]|championnat|poste|avant-match|après-match|recruteurs?|tournoi|fifa|pelouse|stade|manager)(?![\p{L}\d])/giu;
const ALLOWED = /d[’']un coup|après coup|agents? de revue|[Ll]['’]agent(?! de joueur)|AGENT TRAVAILLE|\b(?:matches|cups|agent) \d+/giu; // noms techniques des collections et nom de l'agent de revue (neutre, hors métaphore)
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR', colorScheme: 'dark' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('console ' + m.text()); });
  await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p.goto(URL); await p.evaluate(([d, k]) => { localStorage.setItem(k + ':data', d); localStorage.setItem(k + ':seeded', '1'); }, [DATA, KEY]); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(700);
  const txt = s => p.textContent(s).then(x => (x || '').replace(/\s+/g, ' ').trim()).catch(() => '');
  const click = async (sel, i) => { const l = p.locator(sel); await (i == null ? l.first() : l.nth(i)).click(); await p.waitForTimeout(160); };
  const scan = async where => {
    const blob = await p.evaluate(() => {
      const parts = [document.title, document.body.innerText];
      document.querySelectorAll('[title],[aria-label],[placeholder],[data-tip],option,optgroup').forEach(e => { ['title', 'aria-label', 'placeholder', 'data-tip', 'label'].forEach(a => { const v = e.getAttribute(a); if (v) parts.push(v); }); if (e.tagName === 'OPTION') parts.push(e.textContent); });
      return parts.join('\n');
    });
    const clean = blob.replace(ALLOWED, ' ');
    let m; BANNED.lastIndex = 0;
    while ((m = BANNED.exec(clean))) {
      const c = clean.slice(Math.max(0, m.index - 50), m.index + m[0].length + 40).replace(/\s+/g, ' ');
      const k = m[0].toLowerCase() + ' « ' + c + ' »';
      if (!leaks.has(k)) leaks.set(k, where);
    }
  };

  // --- Séance du jour
  await scan('séance (arrivée)');
  ok((await txt('.match-title')).toUpperCase().includes('MARDI 22 SEPTEMBRE'), 'Séance : mardi 22 septembre');
  ok((await txt('.brand b')) === 'Mon entreprise', 'Nom par défaut : ' + (await txt('.brand b')));
  ok((await p.title()) === 'Ligue des Entrepreneurs', 'Titre de page');
  ok((await txt('.brief-t')).length > 10, 'Briefing : ' + (await txt('.brief-t')));
  for (let i = 0; i < 3; i++) {
    const sel = p.locator('select[data-c="pickQuest"]').first();
    const opts = await sel.locator('option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
    await sel.selectOption(opts[0]); await p.waitForTimeout(160);
  }
  ok(await p.locator('.slot:not(.empty)').count() === 3, '3 leviers choisis');
  await click('[data-a="preEnergy"][data-v="4"]');
  await click('[data-a="kickoff"]');
  ok((await txt('.match')).includes('Ouverture'), 'Ouverture figée');
  const nh = await p.locator('#routine [data-a="habit"]').count();
  for (let i = 0; i < nh; i++) await click('#routine [data-a="habit"]', i);
  for (let i = 0; i < 3; i++) await click('.slot [data-a="slotToggle"]:not(.on)');
  ok((await txt('.hat')).includes('Carton plein validé'), 'Carton plein validé');
  await scan('séance (leviers faits)');
  await p.fill('#ft-shipped-2026-09-22', 'Devis envoyé'); await p.press('#ft-shipped-2026-09-22', 'Tab');
  await p.fill('#ft-lesson-2026-09-22', 'Livrer avant de peaufiner'); await p.press('#ft-lesson-2026-09-22', 'Tab');
  await click('[data-a="ftClose"]'); await p.waitForTimeout(700);
  ok((await txt('.score-num')) === '100', 'Score 100 (lu : ' + (await txt('.score-num')) + ')');
  ok((await txt('#fulltime')).includes('Séance clôturée'), 'Séance clôturée');
  await scan('séance (clôturée)');
  await p.screenshot({ path: SHOTS + '/ligue-seance-dark.png', fullPage: false });

  // --- Quêtes
  await click('[data-tab="quetes"]');
  await scan('quêtes');
  await p.fill('#qf-title', 'Appeler le prospect test'); await click('form[data-f="quest"] button[type=submit]');
  ok((await txt('#view')).includes('Appeler le prospect test'), 'Quête créée');
  for (let i = 0; i < 3; i++) {
    await p.locator('.qrow', { hasText: 'Appeler le prospect test' }).locator('[data-a="qPostponeOpen"]').click(); await p.waitForTimeout(120);
    await p.locator('.qrow', { hasText: 'Appeler le prospect test' }).locator('[data-a="qPostpone"][data-v="1"]').click(); await p.waitForTimeout(150);
  }
  ok((await txt('.qrow:has-text("Appeler le prospect test")')).includes('bloquée'), 'Quête bloquée après 3 reports');
  await click('[data-a="qEdit"]'); await scan('quêtes (édition)'); await click('[data-a="qEditCancel"]');

  // --- Portefeuille
  await click('[data-tab="compo"]');
  ok((await txt('.viewhead h1')) === 'Portefeuille', 'Vue Portefeuille');
  await scan('portefeuille');
  await p.selectOption('#ps-p-finances', 'titulaire'); await p.waitForTimeout(200);
  ok((await txt('#toasts')).includes('Portefeuille plein'), 'Portefeuille plein refusé');
  await p.selectOption('#ps-p-sport', 'banc'); await p.waitForTimeout(200);
  ok(((await p.locator('.pcard:has(#ps-p-sport)').textContent()) || '').includes('En veille le'), 'Arbitrage programmé à la prochaine séance');
  await p.selectOption('#ps-p-finances', 'titulaire'); await p.waitForTimeout(200);
  ok(((await p.locator('.pcard:has(#ps-p-finances)').textContent()) || '').includes('Actif le'), 'Arbitrage accepté (effet demain)');
  await scan('portefeuille (après arbitrages)');
  await p.screenshot({ path: SHOTS + '/ligue-portefeuille.png', fullPage: false });

  // --- Savoir
  await click('[data-tab="savoir"]');
  await click('[data-a="libStart"]'); await click('[data-a="libFinishOpen"]');
  await scan('savoir');
  await p.fill('[id^="lf-t-"]', 'Vendre avant de construire'); await p.fill('[id^="lf-a-"]', 'Appeler 5 prospects');
  await click('form[data-f="libFinish"] button[type=submit]');
  await click('[data-a="libToQuest"]');
  ok((await txt('#toasts')).includes('Quête Marché créée'), 'Savoir → quête Marché');
  await scan('savoir (après)');

  // --- Réseau
  await click('.hdr [data-a="quick"]');
  for (const k of ['quete', 'contact', 'savoir', 'note']) { await click(`[data-a="quickKind"][data-v="${k}"]`); await scan('ajout rapide › ' + k); }
  await click('[data-a="quickKind"][data-v="contact"]');
  await p.fill('#qa-name', 'Mentor test'); await p.fill('#qa-tags', 'SaaS, Lyon'); await p.fill('#qa-next', 'Proposer un café');
  await click('form[data-f="quickAdd"] button[type=submit]');
  await click('[data-tab="reseau"]');
  ok((await txt('#view')).includes('Mentor test') && (await txt('#view')).includes('#SaaS'), 'Contact ajouté avec tags');
  ok((await txt('#view')).includes('Investisseurs') && (await txt('#view')).includes('Prospects'), 'Filtres de rôles entrepreneurs');
  await scan('réseau');
  await click('[data-a="netToQuest"]');
  await click('[data-a="netNote"]'); await p.fill('[id^="cn-"]', 'Appel de 10 min'); await click('form[data-f="netLog"] button[type=submit]');
  ok((await txt('#view')).includes('Prochaine relance'), 'Relance repoussée après échange');

  // --- Performance
  for (const v of ['semaine', 'mois', 'saison', 'carriere', 'analytics']) {
    await click('[data-tab="perf"]'); await click(`[data-a="perf"][data-v="${v}"]`);
    ok(!(await txt('#view')).includes("n'a pas pu s'afficher"), 'Performance › ' + v);
    await scan('perf › ' + v);
  }
  await click('[data-a="perf"][data-v="semaine"]');
  await click('[data-a="goalStep"][data-n="1"]');
  await click('[data-a="proof"][data-v="1"]');
  await p.fill('[id="rv-S-2026-W39-win"]', 'Premier client signé');
  await click('form[data-f="review"] button[type=submit]');
  await click('[data-a="coachFacts"]');
  ok((await txt('.coach')).includes('Séances'), 'Rapport du board (chiffres)');
  await scan('perf › semaine (board)');
  await click('[data-a="perf"][data-v="saison"]');
  await click('.hm.now');
  ok((await txt('.heat-panel')).includes('Voir la séance'), 'Heatmap : détail du jour');
  await click('.cup [data-a="cupStep"]');
  await scan('perf › saison (challenges)');
  await click('[data-a="perf"][data-v="carriere"]');
  ok((await txt('#view')).includes("Porteur d'idée") || (await txt('#view')).includes('Porteur de projet') || (await txt('#view')).includes('Fondateur'), 'Titres entrepreneurs');
  await p.screenshot({ path: SHOTS + '/ligue-carriere.png', fullPage: true });

  // --- Réglages
  await click('.hdr [data-tab="reglages"]');
  for (const s of ['saison', 'score', 'xp', 'match', 'quetes', 'compo', 'routines', 'objectifs', 'agent', 'savoir', 'notifications', 'apparence', 'donnees', 'avance']) {
    await click(`[data-a="setSec"][data-v="${s}"]`);
    ok(!(await txt('#view')).includes("n'a pas pu s'afficher"), 'Réglages › ' + s);
    await scan('réglages › ' + s);
  }
  await click('[data-a="setSec"][data-v="score"]');
  await p.fill('#set-score-win', '75'); await p.press('#set-score-win', 'Tab'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => R().score.win === 75 && R().rulesVersion === 2), 'Règles v2 (victoire 75)');
  await click('[data-a="setRestore"][data-sec="score"]');
  ok(await p.evaluate(() => R().score.win === 70), 'Restauration des valeurs par défaut');
  await click('[data-a="setSec"][data-v="donnees"]');
  await click('[data-a="exportCsv"][data-v="matchs"]');

  // --- Recherche, menu, note rapide
  await p.keyboard.press('/'); await p.waitForTimeout(150);
  await p.fill('#srch', 'mentor'); await p.waitForTimeout(250);
  ok(await p.locator('.srch button').count() >= 1, 'Recherche globale');
  await scan('recherche');
  await p.fill('#srch', 'sept'); await p.waitForTimeout(250); await scan('recherche (séances)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  await p.keyboard.press('n'); await p.waitForTimeout(150);
  await p.fill('#qa-note', 'Idée : offre annuelle'); await click('form[data-f="quickAdd"] button[type=submit]');
  await p.keyboard.press('m'); await p.waitForTimeout(200);
  ok((await txt('#fulltime')).includes('offre annuelle'), 'Note rapide rangée dans la clôture');

  // --- Jour suivant
  await p.clock.setFixedTime(new Date('2026-09-23T08:00:00+02:00'));
  await p.waitForTimeout(500); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(900);
  ok((await p.evaluate(() => { const d = getDay('2026-09-22'); return d && d.snap ? d.snap.result + ':' + d.snap.score : ''; })).startsWith('V:100'), 'Séance du 22 figée');
  ok(/\d+ pts \/ \d+/.test(await txt('.hform')), 'Forme à jour : ' + (await txt('.hform')));
  ok(await p.evaluate(() => statusAt(S.projects['p-sport'], '2026-09-23') === 'banc' && statusAt(S.projects['p-finances'], '2026-09-23') === 'titulaire'), 'Arbitrages appliqués le 23');
  await scan('séance J+1');

  // --- Absence de 12 jours
  await p.clock.setFixedTime(new Date('2026-10-05T10:00:00+02:00'));
  await p.waitForTimeout(500); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1200);
  const rec = await p.evaluate(() => { const r = record('2026-09-22', '2026-10-04'); return `${r.J}J ${r.V}V ${r.F}F`; });
  ok(rec.startsWith('13J 1V') && rec.includes('12F'), 'Bilan après absence : ' + rec);
  await scan('séance après absence (briefing)');
  for (const v of ['semaine', 'mois', 'saison', 'carriere', 'analytics']) { await click('[data-tab="perf"]'); await click(`[data-a="perf"][data-v="${v}"]`); ok(!(await txt('#view')).includes("n'a pas pu"), 'Après absence › ' + v); await scan('après absence › ' + v); }
  await p.evaluate(() => { ui.day = '2026-10-01'; ui.tab = 'match'; render(); });
  await scan('séance passée (forfait)');
  await click('[data-a="markImprevu"]'); await scan('imprévu');
  await p.fill('#imp-reason', 'Urgence client'); await click('form[data-f="imprevu"] button[type=submit]');
  ok(await p.evaluate(() => { const d = getDay('2026-10-01'); return d.type === 'imprevu' && d.edited === true; }), 'Imprévu : séance corrigée');
  await scan('séance corrigée');
  await p.evaluate(() => { ui.day = '2026-10-03'; ui.tab = 'match'; render(); });
  await p.selectOption('select[data-c="dayType"]', 'treve').catch(() => {});
  await p.waitForTimeout(200); await scan('jour off');

  // --- Mode clair
  await p.emulateMedia({ colorScheme: 'light' });
  await p.evaluate(() => { ui.day = todayKey(); ui.tab = 'match'; render(); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: SHOTS + '/ligue-seance-light.png', fullPage: false });

  // --- Mobile
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { ui.day = todayKey(); ui.tab = 'match'; render(); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, 'Mobile : pas de défilement horizontal');
  ok(await p.locator('.bnav .bn').count() === 5, 'Mobile : 5 entrées de navigation');
  const bnOverflow = await p.evaluate(() => [...document.querySelectorAll('.bnav .bn')].map(e => e.scrollWidth - e.clientWidth).filter(x => x > 0).length);
  ok(bnOverflow === 0, 'Mobile : libellés de navigation sans débordement');
  await p.screenshot({ path: SHOTS + '/ligue-mobile.png', fullPage: false });
  await click('[data-a="more"]'); await scan('mobile › plus');
  await click('.more-b[data-tab="reseau"]');
  for (const t of ['quetes', 'agent', 'match']) { await click(`.bnav [data-tab="${t}"]`); ok(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, `Mobile ${t} sans débordement`); await scan('mobile › ' + t); }

  // --- Démarrage à vide (nouvel utilisateur)
  const c2 = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR', acceptDownloads: true });
  const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push('pageerror(vide) ' + e.message));
  await p2.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p2.goto(URL); await p2.waitForTimeout(600);
  const p0 = p; // réutilise scan sur p2
  const blob2 = await p2.evaluate(() => document.body.innerText);
  ok(/Prépare ta saison/i.test(blob2), 'Vide : écran de démarrage');
  const [dl] = await Promise.all([p2.waitForEvent('download', { timeout: 5000 }), p2.evaluate(() => { ui.tab = 'reglages'; ui.set = 'donnees'; render(); }).then(() => p2.click('[data-a="exportJson"]'))]);
  ok(/^mon-entreprise-/.test(dl.suggestedFilename()), 'Export hors Claude : ' + dl.suggestedFilename());
  const ls = await p2.evaluate(() => Object.keys(localStorage));
  ok(ls.every(k => !k.startsWith('ma-saison')), 'Stockage local séparé de la version Football : ' + ls.join(', '));
  let m; const clean2 = blob2.replace(ALLOWED, ' '); BANNED.lastIndex = 0;
  while ((m = BANNED.exec(clean2))) leaks.set(m[0] + ' « ' + clean2.slice(Math.max(0, m.index - 50), m.index + 40).replace(/\s+/g, ' ') + ' »', 'vide');

  console.log(out.join('\n'));
  console.log('\nFUITES DE VOCABULAIRE : ' + (leaks.size ? '\n' + [...leaks].map(([k, w]) => `  [${w}] ${k}`).join('\n') : 'aucune'));
  console.log('ERREURS JS : ' + (errs.length ? '\n' + errs.join('\n') : 'aucune'));
  await b.close();
})().catch(e => { console.log(out.join('\n')); console.log('\nFUITES : ' + [...leaks.keys()].join('\n')); console.log('ÉCHEC DU SCRIPT : ' + e.message); process.exit(1); });
