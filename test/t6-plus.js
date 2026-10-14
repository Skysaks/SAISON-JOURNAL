// Compléments : quêtes récurrentes, découpage, plan de demain, sauvegardes locales.
const { chromium } = require('playwright');
const fs = require('fs');
const PAGE = process.env.PAGE || 'ma-saison.html';
const LIGUE = PAGE.startsWith('ligue');
const KEY = LIGUE ? 'ligue-entrepreneurs-v1' : 'ma-saison-v2';
const DATA = fs.readFileSync(__dirname + '/../dist/' + (LIGUE ? 'demo-demo-neutral.json' : 'demo.json'), 'utf8');
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
  const click = async (sel, i) => { const l = p.locator(sel); await (i == null ? l.first() : l.nth(i)).click(); await p.waitForTimeout(180); };

  // --- 1. quête récurrente
  await p.evaluate(() => { ui.tab = 'quetes'; render(); }); await p.waitForTimeout(250);
  await p.fill('#qf-title', 'Facturer les prestations du mois');
  await p.selectOption('#qf-d', []).catch(() => {});
  await p.fill('#qf-d', '2026-09-22');
  await p.selectOption('#qf-r', 'j7');
  await click('form[data-f="quest"] button[type=submit]');
  const rid = await p.evaluate(() => { const q = questArr().find(x => x.title === 'Facturer les prestations du mois'); return q ? q.id : null; });
  ok(!!rid, 'Quête récurrente créée');
  ok(await p.evaluate(id => S.quests[id].repeat === 'j7', rid), 'Répétition enregistrée (chaque semaine)');
  ok((await txt(`.qrow:has-text("Facturer les prestations du mois")`)).includes('Chaque semaine'), 'Pastille de répétition affichée');
  await p.evaluate(id => setQuestDone(id, true, todayKey()), rid); await p.waitForTimeout(300);
  const next = await p.evaluate(id => { const n = S.quests[id].nextId; return n && S.quests[n] ? { due: S.quests[n].due, rep: S.quests[n].repeat, done: S.quests[n].done } : null; }, rid);
  ok(next && next.due === '2026-09-29' && next.rep === 'j7' && next.done === false, 'Occurrence suivante au ' + (next && next.due));
  await p.evaluate(id => setQuestDone(id, false, todayKey()), rid); await p.waitForTimeout(300);
  ok(await p.evaluate(id => !S.quests[id].nextId && questArr().filter(q => q.title === 'Facturer les prestations du mois').length === 1, rid), 'Décocher retire l’occurrence créée');
  await p.evaluate(id => setQuestDone(id, true, todayKey()), rid); await p.waitForTimeout(300);
  ok(await p.evaluate(() => questArr().filter(q => q.title === 'Facturer les prestations du mois').length === 2), 'Pas de doublon après recoche');

  // --- 2. découper une quête
  await p.evaluate(() => { ui.tab = 'quetes'; ui.q.text = ''; render(); }); await p.waitForTimeout(200);
  const big = await p.evaluate(() => { const q = questArr().find(x => !x.done && x.title !== 'Facturer les prestations du mois'); return q ? { id: q.id, title: q.title } : null; });
  await p.evaluate(id => { ui.split = id; render(); }, big.id); await p.waitForTimeout(200);
  await p.fill(`#sp-a-${big.id}`, 'Premier morceau de test');
  await p.fill(`#sp-b-${big.id}`, 'Second morceau de test');
  await click('form[data-f="qSplit"] button[type=submit]');
  ok(await p.evaluate(id => !S.quests[id], big.id), 'Quête d’origine remplacée');
  ok(await p.evaluate(() => questArr().some(q => q.title === 'Premier morceau de test') && questArr().some(q => q.title === 'Second morceau de test')), 'Deux morceaux créés');
  ok(await p.evaluate(() => { const a = questArr().find(q => q.title === 'Premier morceau de test'); const b2 = questArr().find(q => q.title === 'Second morceau de test'); return a.area === b2.area && a.kind === b2.kind; }), 'Domaine et type conservés');
  ok(await p.evaluate(() => logItems('2026-09-01', '2026-09-30', 'correction').some(l => /découpée/i.test(l.text))), 'Découpage tracé dans le journal');

  // --- 3. plan de demain après la clôture
  await p.evaluate(() => { ui.day = todayKey(); ui.tab = 'match'; render(); }); await p.waitForTimeout(250);
  for (let i = 0; i < 3; i++) {
    const sel = p.locator('select[data-c="pickQuest"]').first();
    if (!(await sel.count())) break;
    const opts = await sel.locator('option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
    if (!opts.length) break;
    await sel.selectOption(opts[0]); await p.waitForTimeout(180);
  }
  await click('[data-a="kickoff"]').catch(() => {});
  await p.fill('#ft-shipped-2026-09-22', 'Test du plan de demain');
  await p.press('#ft-shipped-2026-09-22', 'Tab');
  await click('[data-a="ftClose"]'); await p.waitForTimeout(600);
  ok(await p.locator('#tomorrow').count() === 1, 'Carte « Plan de demain » affichée après la clôture');
  const left = await p.locator('[data-a="pickLeft"]').count();
  if (left) { await click('[data-a="pickLeft"]'); }
  else {
    const sel = p.locator('#tm-pick');
    const opts = await sel.locator('option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
    await sel.selectOption(opts[0]); await p.waitForTimeout(250);
  }
  const nb = await p.evaluate(() => ((getDay(addDays(todayKey(), 1)) || {}).coups || []).length);
  ok(nb >= 1, 'Coup programmé pour demain (' + nb + ')');
  await p.screenshot({ path: SHOTS + '/foot-plan-demain.png' });
  await p.evaluate(() => { const k = addDays(todayKey(), 1); const id = ((getDay(k) || {}).coups || [])[0]; ACT.unpick({ dataset: { id, k } }); }); await p.waitForTimeout(250);
  ok(await p.evaluate(n => ((getDay(addDays(todayKey(), 1)) || {}).coups || []).length === n - 1, nb), 'Retrait depuis le plan de demain');

  // --- 4. sauvegardes locales
  await p.evaluate(() => { ui.tab = 'reglages'; ui.set = 'donnees'; render(); }); await p.waitForTimeout(250);
  ok((await txt('#view')).includes('Sauvegardes locales'), 'Section « Sauvegardes locales » en mode fichier');
  await click('[data-a="localBackupNow"]'); await p.waitForTimeout(300);
  const bak = await p.evaluate(k => JSON.parse(localStorage.getItem(k + ':bak') || '[]').map(b => b.kind), KEY);
  ok(bak.length >= 1 && bak.length <= 2 && bak[0] === 'manuel', 'Sauvegardes locales : ' + bak.join(', ') + ' (2 au maximum)');
  const before = await p.evaluate(() => questArr().length);
  await p.evaluate(() => { const q = questArr()[0]; del('quests', q.id); }); await p.waitForTimeout(250);
  ok(await p.evaluate(n => questArr().length === n - 1, before), 'Quête supprimée avant restauration');
  await p.evaluate(() => { ui.restoreId = 'local:0'; render(); }); await p.waitForTimeout(200);
  await p.fill('#rs-ok', 'RESTAURER');
  await click('form[data-f="restoreConfirm"] button[type=submit]'); await p.waitForTimeout(700);
  ok(await p.evaluate(n => questArr().length === n, before), 'Données restaurées depuis la sauvegarde locale');
  await p.waitForTimeout(400); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(900);
  ok(await p.evaluate(n => questArr().length === n, before), 'Restauration persistée après rechargement');

  await b.close();
  console.log(out.join('\n'));
  console.log(errs.length ? 'ERREURS JS :\n' + errs.join('\n') : 'ERREURS JS : aucune');
})();
