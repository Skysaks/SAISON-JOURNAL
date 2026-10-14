// Mode base de données simulée : synchronisation, écritures, sauvegardes, restauration, export, coach.
const { chromium } = require('playwright');
const fs = require('fs');
const DATA = JSON.parse(fs.readFileSync(__dirname + '/../dist/demo.json', 'utf8'));
const URL = 'file://' + __dirname + '/../dist/' + (process.env.PAGE || 'ma-saison.html');
const out = [], errs = [];
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR' });
  await ctx.addInitScript(seed => {
    const store = new Map();
    Object.keys(seed).forEach(c => Object.keys(seed[c]).forEach(id => store.set(c + '/' + id, JSON.parse(JSON.stringify(seed[c][id])))));
    const listeners = [];
    const snapOf = c => { const docs = []; store.forEach((v, k) => { const [cc, id, extra] = k.split('/'); if (cc === c && id && extra === undefined) docs.push({ id, exists: true, data: () => JSON.parse(JSON.stringify(v)) }); }); return { docs, size: docs.length, empty: !docs.length, metadata: {} }; };
    const notify = c => listeners.filter(l => l.c === c).forEach(l => setTimeout(() => l.next(snapOf(c)), 5));
    const docRef = path => ({ path, set: async d => { store.set(path, JSON.parse(JSON.stringify(d))); window.__writes = (window.__writes || 0) + 1; notify(path.split('/')[0]); }, delete: async () => { store.delete(path); notify(path.split('/')[0]); }, get: async () => ({ exists: store.has(path), data: () => JSON.parse(JSON.stringify(store.get(path))) }) });
    const coll = (c, filt) => ({ limit: () => coll(c, filt), where: (f, op, v) => coll(c, d => d[f] === v), onSnapshot: (next) => { listeners.push({ c, next }); setTimeout(() => next(snapOf(c)), 20); return () => {}; }, get: async () => { const s = snapOf(c); s.docs = s.docs.filter(d => !filt || filt(d.data())); return s; } });
    window.__store = store;
    const db = { collection: c => coll(c), doc: p => docRef(p) };
    const sample = async (input, opts) => { const t = 'LECTURE : test.\nHYPOTHÈSES : test.\nAJUSTEMENT : test.'; if (opts && opts.onText) opts.onText({ text: t, delta: t }); window.__prompt = input; return { text: t, truncated: false, modelTierApplied: 'default' }; };
    const downloads = { save: async f => { window.__saved = (window.__saved || []).concat(f.filename + ':' + String(f.data).length); return { status: 'saved' }; } };
    window.claude = { use: async n => (n === 'db' ? db : n === 'sample' ? sample : n === 'downloads' ? downloads : null) };
  }, DATA);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('console ' + m.text()); });
  await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p.goto(URL); await p.waitForTimeout(1200);
  const click = async sel => { await p.locator(sel).first().click(); await p.waitForTimeout(200); };
  ok(await p.evaluate(() => mode === 'db'), 'Mode base : synchronisé');
  const nq = await p.evaluate(() => Object.keys(S.quests).length);
  ok(nq > 0 && await p.evaluate(() => !!S.seasons['s-demo']), `Données chargées depuis la base (${nq} quêtes)`);
  const b0 = await p.evaluate(() => [...window.__store.keys()].filter(k => k.startsWith('backups/')).length);
  ok(b0 >= 2, 'Sauvegarde automatique hebdomadaire créée au premier chargement (' + b0 + ' docs)');
  await click('#routine [data-a="habit"]');
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const m = window.__store.get('matches/2026-09'); const x = window.__store.get('xp_events/2026-09'); return !!(m && m.days['2026-09-22'] && x && Object.keys(x.ev).some(k => k.startsWith('h:2026-09-22:'))); }), 'Coche d’habitude écrite dans la base (match + journal XP)');
  // coach avec interprétation
  await p.evaluate(() => { ui.tab = 'perf'; ui.perf = 'semaine'; render(); }); await p.waitForTimeout(200);
  await click('[data-a="coachFacts"]'); await click('[data-a="coachInterp"]'); await p.waitForTimeout(300);
  ok((await p.textContent('.coach')).includes('AJUSTEMENT'), 'Interprétation du coach affichée');
  ok(await p.evaluate(() => String(window.__prompt).includes('Contexte fourni') && String(window.__prompt).includes('Chiffres de la période')), 'Le prompt contient le contexte stocké en base et les chiffres');
  // données : export, sauvegarde, restauration
  await p.evaluate(() => { ui.tab = 'reglages'; ui.set = 'donnees'; render(); }); await p.waitForTimeout(200);
  await click('[data-a="exportJson"]'); await click('[data-a="exportCsv"][data-v="quetes"]'); await click('[data-a="exportCsv"][data-v="matchs"]');
  const saved = await p.evaluate(() => window.__saved || []);
  ok(saved.length === 3, 'Exports JSON + 2 CSV : ' + saved.join(', '));
  await click('[data-a="backupNow"]'); await p.waitForTimeout(600);
  await click('[data-a="backupList"]'); await p.waitForTimeout(400);
  const nb = await p.locator('[data-a="restoreAsk"]').count();
  ok(nb >= 2, 'Liste des sauvegardes (' + nb + ')');
  // modifier une donnée puis restaurer la sauvegarde manuelle
  await p.evaluate(() => put('quests', 'q-99', newQuest({ title: 'Quête à effacer' })));
  await p.waitForTimeout(200);
  await p.locator('.rows li', { hasText: 'Manuelle' }).first().locator('[data-a="restoreAsk"]').click(); await p.waitForTimeout(200);
  await p.fill('#rs-ok', 'RESTAURER'); await click('form[data-f="restoreConfirm"] button[type=submit]');
  await p.waitForTimeout(3500);
  ok(await p.evaluate(n => !S.quests['q-99'] && !window.__store.has('quests/q-99') && Object.keys(S.quests).length === n, nq), 'Restauration : retour à l’état sauvegardé');
  ok(await p.evaluate(() => [...window.__store.values()].some(v => v && v.kind === 'securite')), 'Sauvegarde de sécurité faite avant la restauration');
  // saisie typée incorrecte refusée
  await p.fill('#wipe-ok', 'supprimer'); await click('form[data-f="wipeConfirm"] button[type=submit]');
  ok(await p.evaluate(n => Object.keys(S.quests).length === n, nq), 'Suppression totale refusée sans le mot exact');
  console.log(out.join('\n'));
  console.log('ERREURS JS : ' + (errs.length ? '\n' + errs.join('\n') : 'aucune'));
  await b.close();
})().catch(e => { console.log(out.join('\n')); console.log('ÉCHEC DU SCRIPT : ' + e.message); process.exit(1); });
