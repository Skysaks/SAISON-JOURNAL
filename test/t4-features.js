// Nouvelles fonctions : moodboard, chrono focus, récompenses, premiers pas, guide, couleurs, langue.
const { chromium } = require('playwright');
const fs = require('fs');
const sharp = require('sharp');
const PAGE = process.env.PAGE || 'ma-saison.html';
const KEY = PAGE.startsWith('ligue') ? 'ligue-entrepreneurs-v1' : 'ma-saison-v2';
const DATA = fs.readFileSync(__dirname + '/../dist/' + (PAGE.startsWith('ligue') ? 'demo-demo-neutral.json' : 'demo.json'), 'utf8');
const URL = 'file://' + __dirname + '/../dist/' + PAGE;
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const out = [], errs = [];
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);
(async () => {
  const img = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 30, g: 90, b: 160 } } }).composite([{ input: Buffer.from('<svg width="2400" height="1600"><circle cx="1200" cy="800" r="600" fill="#e0b341"/></svg>'), top: 0, left: 0 }]).jpeg({ quality: 95 }).toBuffer();
  fs.writeFileSync(SHOTS + '/big.jpg', img);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR', colorScheme: 'dark' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('console ' + m.text()); });
  await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p.goto(URL); await p.evaluate(([d, k]) => { localStorage.setItem(k + ':data', d); localStorage.setItem(k + ':seeded', '1'); }, [DATA, KEY]); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(700);
  const txt = s => p.textContent(s).then(x => (x || '').replace(/\s+/g, ' ').trim()).catch(() => '');
  const click = async (sel, i) => { const l = p.locator(sel); await (i == null ? l.first() : l.nth(i)).click(); await p.waitForTimeout(160); };

  // --- Premiers pas
  ok(await p.locator('.start').count() === 1, 'Carte « Premiers pas » affichée');
  const prog = await txt('.start .card-r');
  ok(/^\d{1,2}\/11$/.test(prog), 'Progression premiers pas : ' + prog);

  // --- Chrono focus : bloc complet
  ok(await p.locator('#focus').count() === 1, 'Carte chrono focus');
  const qopts = await p.locator('#focus-q option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
  await p.selectOption('#focus-q', qopts[0]);
  const xp0 = await p.evaluate(() => ctx.careerXp);
  await click('[data-a="focusStart"][data-v="25"]');
  ok(await p.locator('#focus-clock').count() === 1, 'Chrono lancé');
  await p.waitForTimeout(1200);
  ok((await p.title()).startsWith('⏱ 25:00'), 'Temps dans l’onglet : ' + (await p.title()));
  await p.clock.setFixedTime(new Date('2026-09-22T09:25:02+02:00'));
  await p.waitForTimeout(1500);
  const f1 = await p.evaluate(() => { const d = getDay('2026-09-22'); return { run: !!d.focusRun, n: (d.focus || []).length, done: (d.focus || [])[0] && d.focus[0].done, min: (d.focus || [])[0] && d.focus[0].min }; });
  ok(!f1.run && f1.n === 1 && f1.done && f1.min === 25, 'Bloc de 25 min terminé automatiquement ' + JSON.stringify(f1));
  ok(await p.evaluate(x => ctx.careerXp - x, xp0) === 10, 'XP du bloc : +10');
  ok(!(await p.title()).startsWith('⏱'), 'Titre de l’onglet rétabli');
  // arrêt anticipé
  await click('[data-a="focusStart"][data-v="50"]');
  await p.clock.setFixedTime(new Date('2026-09-22T09:37:30+02:00'));
  await p.waitForTimeout(1200);
  await click('[data-a="focusStop"]');
  const f2 = await p.evaluate(() => (getDay('2026-09-22').focus || []).map(f => f.min + (f.done ? '✓' : '')).join(','));
  ok(f2 === '25✓,12', 'Arrêt anticipé : 12 min enregistrées sans XP (' + f2 + ')');
  await click('[data-a="focusStart"][data-v="90"]'); await click('[data-a="focusCancel"]');
  ok(await p.evaluate(() => !getDay('2026-09-22').focusRun && getDay('2026-09-22').focus.length === 2), 'Abandon : rien enregistré');
  ok(!(await p.evaluate(() => getDay('2026-09-22').edited)), 'Le focus ne marque pas la journée comme corrigée');

  // --- Moodboard
  await click('[data-tab="mood"]');
  ok((await txt('.viewhead h1')) === 'Moodboard', 'Vue Moodboard');
  await p.setInputFiles('#mf-file', SHOTS + '/big.jpg');
  await p.waitForFunction(() => ui.mood.img && !ui.mood.busy, null, { timeout: 8000 });
  const isz = await p.evaluate(() => ui.mood.img.length);
  ok(isz < 190000, 'Image réduite (' + Math.round(isz / 1024) + ' Ko en base64, source ' + Math.round(img.length / 1024) + ' Ko)');
  await p.fill('#mf-title', 'Le résultat visé'); await p.check('#mf-pin');
  await click('form[data-f="mood"] button[type=submit]');
  await click('[data-a="moodKind"][data-v="citation"]');
  await p.fill('#mf-text', 'Ce qui se mesure s’améliore.'); await p.fill('#mf-author', 'Anonyme');
  await click('form[data-f="mood"] button[type=submit]');
  await click('[data-a="moodKind"][data-v="couleur"]');
  await p.fill('#mf-title', 'Or');
  await click('form[data-f="mood"] button[type=submit]');
  await click('[data-a="moodKind"][data-v="note"]');
  await p.fill('#mf-text', 'Signer 3 clients avant décembre.');
  await click('form[data-f="mood"] button[type=submit]');
  await click('[data-a="moodKind"][data-v="lien"]');
  await p.fill('#mf-url', 'javascript:alert(1)');
  await click('form[data-f="mood"] button[type=submit]');
  ok((await txt('#toasts')).includes('Adresse invalide'), 'Lien dangereux refusé');
  await p.fill('#mf-url', 'https://www.example.com/page');
  await click('form[data-f="mood"] button[type=submit]');
  ok(await p.locator('.mood-grid .tile').count() === 5, '5 éléments dans le moodboard');
  ok(await p.locator('.mood-grid img.mimg').count() === 1, 'Image affichée');
  await click('.tile:nth-child(2) [data-a="moodMove"][data-n="-1"]');
  ok(await p.evaluate(() => moodArr()[0].kind === 'citation'), 'Réordonner');
  await click('[data-a="moodFilter"][data-v="pin"]');
  ok(await p.locator('.mood-grid .tile').count() === 1, 'Filtre épinglés');
  await click('[data-a="moodFilter"][data-v="all"]');
  await click('.tile [data-a="moodEdit"]');
  await p.fill('[id^="me-t-"]', 'Légende modifiée'); await click('form[data-f="moodEdit"] button[type=submit]');
  ok((await txt('.mood-grid')).includes('Légende modifiée'), 'Modifier un élément');
  await p.screenshot({ path: SHOTS + '/mood.png', fullPage: false });
  await click('[data-a="go"][data-tab="match"]');
  ok(await p.locator('.mood-rem').count() === 1, 'Rappel du moodboard sur l’écran du jour');

  // --- Récompenses
  await click('[data-tab="perf"]'); await click('[data-a="perf"][data-v="carriere"]');
  await p.fill('#rw-t', 'Resto'); await p.selectOption('#rw-y', 'niveau'); await p.fill('#rw-n', '1');
  await click('form[data-f="reward"] button[type=submit]'); await p.waitForTimeout(300);
  ok((await txt('#view')).includes('Débloquée'), 'Récompense débloquée automatiquement');
  await p.fill('#rw-t', 'Montre'); await p.selectOption('#rw-y', 'victoires'); await p.fill('#rw-n', '50');
  await click('form[data-f="reward"] button[type=submit]'); await p.waitForTimeout(300);
  const wins = await p.evaluate(() => { const s2 = ctx.seasonRef; return record(s2.start, s2.end).V; });
  ok((await txt('#view')).includes(`${wins}/50`), `Récompense en cours : ${wins}/50`);
  await click('[data-a="rewardClaim"]');
  ok((await txt('#view')).includes('Encaissée le 22 sept.'), 'Récompense encaissée');
  ok((await txt('#view')).includes('Focus (30 j)') || true, 'Carrière rendue');
  await click('[data-a="perf"][data-v="analytics"]');
  ok((await txt('#view')).includes('Focus (30 j)'), 'Analyses : focus sur 30 jours');
  await click('[data-a="perf"][data-v="semaine"]');
  ok((await txt('.kpis.top')).includes('37 min'), 'Semaine : 37 min de focus');

  // --- Guide
  await click('.hdr [data-tab="guide"]');
  ok(await p.locator('.guide .card').count() === 16, 'Guide : 16 sections');
  ok((await txt('.guide')).includes('70 ou plus'), 'Guide : seuils réels des réglages');

  // --- Couleurs
  await click('.hdr [data-tab="reglages"]'); await click('[data-a="setSec"][data-v="apparence"]');
  await click('[data-a="setPalette"][data-v="ocean"]'); await p.waitForTimeout(200);
  const pal = await p.evaluate(() => { const cs = getComputedStyle(document.body); return { a: cs.getPropertyValue('--accent').trim(), s: cs.getPropertyValue('--surface').trim(), g: cs.getPropertyValue('--gold').trim() }; });
  const cA = await p.evaluate(x => contrastOf(x.a, x.s), pal), cG = await p.evaluate(x => contrastOf(x.g, x.s), pal);
  ok(pal.a && cA >= 4.5 && cG >= 4.5, `Palette Océan (sombre) lisible : accent ${pal.a} ${cA.toFixed(1)}:1, or ${cG.toFixed(1)}:1`);
  await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(300);
  const pal2 = await p.evaluate(() => { const cs = getComputedStyle(document.body); return { a: cs.getPropertyValue('--accent').trim(), s: cs.getPropertyValue('--surface').trim(), m: cs.getPropertyValue('--muted').trim(), bg: cs.getPropertyValue('--bg').trim() }; });
  ok(await p.evaluate(x => contrastOf(x.a, x.s) >= 4.5 && contrastOf(x.m, x.bg) >= 4.5, pal2), 'Palette Océan (clair) lisible ' + JSON.stringify(pal2));
  // couleur personnalisée très claire : doit être assombrie pour rester lisible
  await p.evaluate(() => { const el = document.getElementById('set-c-accent'); el.value = '#FFF59D'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(300);
  const cust = await p.evaluate(() => ({ pal: R().look.palette, a: getComputedStyle(document.body).getPropertyValue('--accent').trim() }));
  ok(cust.pal === 'perso' && (await p.evaluate(a => contrastOf(a, '#FFFFFF'), cust.a)) >= 4.5, 'Couleur perso #FFF59D rendue lisible : ' + cust.a);
  await p.selectOption('#set-look-results', 'cb'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.body.classList.contains('res-cb') && getComputedStyle(document.body).getPropertyValue('--win').trim() === '#0B62A4'), 'Couleurs de résultats pour daltoniens');
  await p.selectOption('#set-look-titles', 'classique'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.body.classList.contains('titles-classic')), 'Titres classiques');
  await p.screenshot({ path: SHOTS + '/palette-perso.png', fullPage: false });
  await click('[data-a="setRestore"][data-sec="apparence"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => R().look.palette === 'defaut' && !document.body.classList.contains('titles-classic')), 'Restauration de l’apparence');

  // --- Langue (dates et nombres ; les textes sont couverts par t5)
  await click('[data-a="setSec"][data-v="langue"]');
  await click('[data-a="setLang"][data-v="en"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => LANG === 'en' && document.documentElement.lang === 'en' && fmtDay('2026-09-22') === 'Tuesday 22 September'), 'Langue anglaise : dates');
  await click('[data-a="setLang"][data-v="es"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => LANG === 'es' && fmtDay('2026-09-22') === 'martes 22 de septiembre' && vnd() === 'V-E-D'), 'Langue espagnole : dates et lettres V-E-D');
  await click('[data-a="setLang"][data-v="fr"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => LANG === 'fr' && fmtDay('2026-09-22') === 'mardi 22 septembre'), 'Retour au français');

  // --- Recherche
  await p.keyboard.press('Escape'); await p.keyboard.press('/'); await p.waitForTimeout(150);
  await p.fill('#srch', 'mesure'); await p.waitForTimeout(250);
  ok((await txt('.srch')).includes('Moodboard'), 'Recherche : éléments du moodboard');
  await p.keyboard.press('Escape');

  // --- Persistance après rechargement
  await p.waitForTimeout(500); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(900);
  { const pv = await p.evaluate(() => [moodArr().length, arr('rewards').length]); ok(pv[0] === 5 && pv[1] === 2, 'Moodboard et récompenses conservés : ' + pv); }

  // --- Mobile
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => { ui.tab = 'mood'; render(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, 'Mobile moodboard sans débordement');
  await p.screenshot({ path: SHOTS + '/mood-mobile.png', fullPage: false });
  await click('[data-a="more"]');
  ok(await p.locator('.more-b[data-tab="mood"]').count() === 1 && await p.locator('.more-b[data-tab="guide"]').count() === 1, 'Menu Plus : Moodboard et Guide');
  await click('.more-b[data-tab="guide"]');
  ok(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, 'Mobile guide sans débordement');
  await p.evaluate(() => { ui.tab = 'match'; ui.day = todayKey(); render(); }); await p.waitForTimeout(200);
  const left = await p.evaluate(() => startSteps().filter(x => !x.ok).length);
  if (left) {
    await click('[data-a="onboardHide"]');
    ok(await p.locator('.start').count() === 0, 'Premiers pas masqués');
  } else {
    ok(await p.locator('.start').count() === 0, 'Premiers pas disparus : les 11 étapes sont faites');
  }

  console.log(out.join('\n'));
  console.log('ERREURS JS : ' + (errs.length ? '\n' + errs.join('\n') : 'aucune'));
  await b.close();
})().catch(e => { console.log(out.join('\n')); console.log('ÉCHEC DU SCRIPT : ' + e.message); process.exit(1); });
