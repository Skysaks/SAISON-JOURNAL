// Parcours complet en mode local (données migrées injectées), horloge figée.
const { chromium } = require('playwright');
const fs = require('fs');
const DATA = fs.readFileSync(__dirname + '/../dist/demo.json', 'utf8');
const URL = 'file://' + __dirname + '/../dist/ma-saison.html';
const out = [], errs = [];
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR', colorScheme: 'dark' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('console ' + m.text()); });
  await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p.goto(URL); await p.evaluate(([d, k]) => { localStorage.setItem(k + ':data', d); localStorage.setItem(k + ':seeded', '1'); }, [DATA, 'ma-saison-v2']); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(700);
  const txt = s => p.textContent(s).then(x => (x || '').replace(/\s+/g, ' ').trim()).catch(() => '');
  const click = async (sel, i) => { const l = p.locator(sel); await (i == null ? l.first() : l.nth(i)).click(); await p.waitForTimeout(160); };

  // --- Match du jour
  ok((await txt('.match-title')).toUpperCase().includes('MARDI 22 SEPTEMBRE'), 'Match : mardi 22 septembre');
  const jn = await p.evaluate(() => journeeNumber(todayKey()));
  ok((await txt('.match')).includes('journée ' + jn), 'Numéro de journée : ' + jn);
  ok((await txt('.brief-t')).length > 10, 'Briefing affiché : ' + (await txt('.brief-t')));
  const capLeft = await p.evaluate(() => capStatus(ctx.season).left);
  ok((await txt('#cap')).includes('J−' + capLeft), 'Cap : J−' + capLeft);
  // choisir 3 coups
  for (let i = 0; i < 3; i++) {
    const sel = p.locator('select[data-c="pickQuest"]').first();
    const opts = await sel.locator('option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
    await sel.selectOption(opts[0]); await p.waitForTimeout(160);
  }
  ok(await p.locator('.slot:not(.empty)').count() === 3, '3 coups choisis');
  await click('[data-a="preEnergy"][data-v="4"]');
  await click('[data-a="kickoff"]');
  ok((await txt('.match')).includes("Coup d'envoi"), 'Coup d’envoi figé');
  // routine : cocher toutes les habitudes du jour
  const nh = await p.locator('#routine [data-a="habit"]').count();
  for (let i = 0; i < nh; i++) await click('#routine [data-a="habit"]', i);
  ok(await p.locator('#routine .chk.on').count() === nh, `Routine ${nh}/${nh}`);
  // terminer les 3 coups
  for (let i = 0; i < 3; i++) await click('.slot [data-a="slotToggle"]:not(.on)');
  const hatTxt = await txt('.hat');
  ok(hatTxt.includes('validé'), 'Coup du chapeau validé');
  // Full Time
  await p.fill('#ft-shipped-2026-09-22', 'Maquette livrée'); await p.press('#ft-shipped-2026-09-22', 'Tab');
  await p.fill('#ft-lesson-2026-09-22', 'Livrer avant de peaufiner'); await p.press('#ft-lesson-2026-09-22', 'Tab');
  await click('[data-a="ftClose"]');
  await p.waitForTimeout(700);
  const score = await txt('.score-num');
  ok(score === '100', 'Score 100 après journée parfaite (lu : ' + score + ')');
  const hdr = await txt('#hdr');
  ok(/Niveau|XP avant niveau/.test(hdr), 'En-tête niveau : ' + hdr.slice(0, 120));
  const gotXp = await p.evaluate(() => xpOn('2026-09-22'));
  const expXp = await p.evaluate(() => sum(habitsDue('2026-09-22').map(h => Number(h.xp))) + sum(xpAllEvents().filter(e => e.src === 'quete' && e.d === '2026-09-22').map(e => e.xp)) + 30 + 10);
  ok(gotXp === expXp, `XP du jour = routine + quêtes + chapeau + clôture : ${gotXp} = ${expXp}`);
  const qev = await p.evaluate(() => xpAllEvents().filter(e => e.src === 'quete' && e.d === '2026-09-22').map(e => e.xp + (e.note ? ':' + e.note : '')));
  out.push('     XP quêtes : ' + qev.join(' | '));

  // --- Quêtes : création, report ×3, filtre, recherche
  await click('[data-tab="quetes"]');
  await p.fill('#qf-title', 'Quête de test à reporter'); await click('form[data-f="quest"] button[type=submit]');
  ok((await txt('#view')).includes('Quête de test à reporter'), 'Quête créée');
  for (let i = 0; i < 3; i++) {
    const row = p.locator('.qrow', { hasText: 'Quête de test à reporter' });
    await row.locator('[data-a="qPostponeOpen"]').click(); await p.waitForTimeout(120);
    await p.locator('.qrow', { hasText: 'Quête de test à reporter' }).locator('[data-a="qPostpone"][data-v="1"]').click(); await p.waitForTimeout(150);
  }
  ok((await txt('.qrow:has-text("Quête de test à reporter")')).includes('bloquée'), 'Quête bloquée après 3 reports');
  await p.fill('#qf-text', 'facture'); await p.waitForTimeout(250);
  ok(await p.locator('.qrow').count() >= 1 && await p.locator('.qrow', { hasText: 'Quête de test à reporter' }).count() === 0, 'Recherche texte des quêtes');
  await p.fill('#qf-text', ''); await p.waitForTimeout(250);
  await click('[data-a="qView"][data-v="retard"]');
  await click('[data-a="qView"][data-v="toutes"]');
  await p.selectOption('#qf-kind', 'terrain'); await p.waitForTimeout(150);
  ok(await p.locator('.qrow .kind-livrer').count() === 0, 'Filtre par type');
  await p.selectOption('#qf-kind', 'all'); await p.waitForTimeout(150);

  // --- Compo : mercato (effet demain) + compo pleine
  await click('[data-tab="compo"]');
  await p.selectOption('#ps-p-finances', 'titulaire'); await p.waitForTimeout(200);
  ok((await txt('#toasts')).includes('Compo pleine'), 'Compo pleine refusée');
  await p.selectOption('#ps-p-sport', 'banc'); await p.waitForTimeout(200);
  ok(((await p.locator('.pcard:has(#ps-p-sport)').textContent()) || '').includes('Banc le'), 'Changement programmé au prochain match');
  await p.selectOption('#ps-p-finances', 'titulaire'); await p.waitForTimeout(200);
  ok(((await p.locator('.pcard:has(#ps-p-finances)').textContent()) || '').includes('Titulaire le'), 'Remplacement accepté (effet demain)');

  // --- Savoir : commencer, terminer, transformer en action
  await click('[data-tab="savoir"]');
  await click('[data-a="libStart"]');
  await click('[data-a="libFinishOpen"]');
  await p.fill('[id^="lf-t-"]', 'Les règlements se lisent comme des contrats'); await p.fill('[id^="lf-a-"]', 'Faire une fiche par chapitre');
  await click('form[data-f="libFinish"] button[type=submit]');
  await click('[data-a="libToQuest"]');
  ok((await txt('#toasts')).includes('Quête Terrain créée'), 'Savoir → quête');

  // --- Réseau via ajout rapide
  await click('.hdr [data-a="quick"]');
  await click('[data-a="quickKind"][data-v="contact"]');
  await p.fill('#qa-name', 'Contact de test'); await p.fill('#qa-tags', 'essai, tournoi'); await p.fill('#qa-next', 'Proposer un café');
  await click('form[data-f="quickAdd"] button[type=submit]');
  await click('[data-tab="reseau"]');
  ok((await txt('#view')).includes('Contact de test') && (await txt('#view')).includes('#essai'), 'Contact ajouté avec tags');
  await click('[data-a="netToQuest"]');
  await click('[data-a="netNote"]'); await p.fill('[id^="cn-"]', 'Appel de 10 min'); await click('form[data-f="netLog"] button[type=submit]');
  ok((await txt('#view')).includes('Prochaine relance'), 'Relance repoussée après échange');

  // --- Performance : toutes les sous-vues
  for (const v of ['semaine', 'mois', 'saison', 'carriere', 'analytics']) {
    await click('[data-tab="perf"]'); await click(`[data-a="perf"][data-v="${v}"]`);
    const t = await txt('#view');
    ok(!t.includes("n'a pas pu s'afficher"), 'Performance › ' + v);
  }
  await click('[data-a="perf"][data-v="semaine"]');
  await click('[data-a="goalStep"][data-n="1"]');
  await click('[data-a="proof"][data-v="1"]');
  await p.fill('[id="rv-S-2026-W39-win"]', 'Premier match gagné');
  await click('form[data-f="review"] button[type=submit]');
  await click('[data-a="coachFacts"]');
  ok((await txt('.coach')).includes('Matchs'), 'Rapport du coach (chiffres)');
  await click('[data-a="perf"][data-v="saison"]');
  await click('.hm.now');
  ok((await txt('.heat-panel')).includes('Ouvrir le match'), 'Heatmap : détail du jour');
  await click('.cup [data-a="cupStep"]');

  // --- Réglages : toutes les sections + modification des règles
  await click('.hdr [data-tab="reglages"]');
  for (const s of ['saison', 'score', 'xp', 'match', 'quetes', 'compo', 'routines', 'objectifs', 'agent', 'savoir', 'notifications', 'apparence', 'donnees', 'avance']) {
    await click(`[data-a="setSec"][data-v="${s}"]`);
    ok(!(await txt('#view')).includes("n'a pas pu s'afficher"), 'Réglages › ' + s);
  }
  await click('[data-a="setSec"][data-v="score"]');
  await p.fill('#set-score-win', '75'); await p.press('#set-score-win', 'Tab'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => R().score.win === 75 && R().rulesVersion === 2), 'Règles v2 (victoire 75)');
  await click('[data-a="setRestore"][data-sec="score"]');
  ok(await p.evaluate(() => R().score.win === 70), 'Restauration des valeurs par défaut');

  // --- Recherche globale et note rapide
  await p.keyboard.press('/'); await p.waitForTimeout(150);
  await p.fill('#srch', 'contact de test'); await p.waitForTimeout(250);
  ok(await p.locator('.srch button').count() >= 1, 'Recherche globale');
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  await p.keyboard.press('n'); await p.waitForTimeout(150);
  await p.fill('#qa-note', 'Idée : format vidéo sur les règlements'); await click('form[data-f="quickAdd"] button[type=submit]');
  await p.keyboard.press('m'); await p.waitForTimeout(200);
  ok((await txt('#fulltime')).includes('format vidéo'), 'Note rapide rangée dans le Full Time');
  await p.screenshot({ path: '/tmp/claude-0/v2-match-desktop.png', fullPage: false });

  // --- Jour suivant : figeage du match, forme, série
  await p.clock.setFixedTime(new Date('2026-09-23T08:00:00+02:00'));
  await p.waitForTimeout(500); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(900);
  const snap = await p.evaluate(() => { const d = getDay('2026-09-22'); return d && d.snap ? d.snap.result + ':' + d.snap.score + ':v' + d.snap.v : 'aucun'; });
  ok(snap === 'V:100:v2' || snap === 'V:100:v3' || snap.startsWith('V:100'), 'Match du 22 figé : ' + snap);
  ok(/\d+ pts \/ \d+/.test(await txt('.hform')) && await p.evaluate(() => lastMatches(1)[0].t === 'V'), 'Forme à jour, dernier match gagné : ' + (await txt('.hform')));
  ok(await p.evaluate(() => statusAt(S.projects['p-sport'], '2026-09-23') === 'banc' && statusAt(S.projects['p-finances'], '2026-09-23') === 'titulaire'), 'Mercato appliqué le 23');
  // modifier les règles ne change pas le passé
  await p.evaluate(() => { saveSettings(s => { s.score = { win: 101 }; s.rulesVersion = 9; }); });
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => dayResult('2026-09-22').t === 'V'), 'Score historique inchangé après changement de règles');
  await p.evaluate(() => { saveSettings(s => { delete s.score; s.rulesVersion = 3; }); });

  // --- Saut de 12 jours : forfaits, trophées, records
  await p.clock.setFixedTime(new Date('2026-10-05T10:00:00+02:00'));
  await p.waitForTimeout(500); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1200);
  const rec = await p.evaluate(() => { const r = record('2026-09-22', '2026-10-04'); return `${r.J}J ${r.V}V ${r.N}N ${r.D}D ${r.F}F ${r.pts}pts`; });
  ok(rec.startsWith('13J 1V') && rec.includes('12F'), 'Bilan après absence : ' + rec);
  ok(await p.evaluate(() => Object.keys(S.matches['2026-10'].days).length >= 4), 'Forfaits figés en octobre');
  for (const v of ['semaine', 'mois', 'saison', 'carriere', 'analytics']) { await click('[data-tab="perf"]'); await click(`[data-a="perf"][data-v="${v}"]`); ok(!(await txt('#view')).includes("n'a pas pu"), 'Après absence › ' + v); }
  await p.screenshot({ path: '/tmp/claude-0/v2-carriere.png', fullPage: false });
  await click('[data-a="perf"][data-v="analytics"]');
  await p.screenshot({ path: '/tmp/claude-0/v2-analytics.png', fullPage: true });
  // correction d'un jour passé : déclarer un imprévu
  await p.evaluate(() => { ui.day = '2026-10-01'; ui.tab = 'match'; render(); });
  await click('[data-a="markImprevu"]'); await p.fill('#imp-reason', 'Urgence familiale'); await click('form[data-f="imprevu"] button[type=submit]');
  ok(await p.evaluate(() => { const d = getDay('2026-10-01'); return d.type === 'imprevu' && d.edited === true && d.snap.result === 'D'; }), 'Imprévu : match corrigé et marqué');

  // --- Mobile
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { ui.day = todayKey(); ui.tab = 'match'; render(); });
  await p.waitForTimeout(300);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(sw <= 0, 'Mobile : pas de défilement horizontal (' + sw + ')');
  ok(await p.locator('.bnav .bn').count() === 5, 'Mobile : 5 entrées de navigation');
  await p.screenshot({ path: '/tmp/claude-0/v2-mobile.png', fullPage: false });
  await click('[data-a="more"]');
  ok(await p.locator('.more-b').count() >= 5, 'Mobile : menu Plus');
  await click('.more-b[data-tab="reseau"]');
  for (const t of ['quetes', 'agent', 'match']) { await click(`.bnav [data-tab="${t}"]`); const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(w <= 0, `Mobile ${t} sans débordement (${w})`); }
  await click('.fab'); ok(await p.locator('.sheet.quick').count() === 1, 'Mobile : bouton + ouvre l’ajout rapide');

  console.log(out.join('\n'));
  console.log('ERREURS JS : ' + (errs.length ? '\n' + errs.join('\n') : 'aucune'));
  await b.close();
})().catch(e => { console.log(out.join('\n')); console.log('ÉCHEC DU SCRIPT : ' + e.message); process.exit(1); });
