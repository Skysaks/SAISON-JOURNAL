// Sécurité : les données importées (JSON partagé, sauvegarde reçue) sont traitées comme non fiables.
// Chaque texte libre du jeu de démonstration reçoit une charge d'injection HTML, chaque lien un « javascript: »,
// puis on parcourt tous les écrans : aucune charge ne doit s'exécuter, aucun lien dangereux ne doit apparaître.
const { chromium } = require('playwright');
const fs = require('fs');

const TEXT_KEYS = new Set(['title', 'name', 'why', 'note', 'takeaway', 'action', 'author', 'vision', 'cap', 'text',
  'shipped', 'lesson', 'next', 'label', 'block', 'blocker', 'adjust', 'org', 'role', 'desc', 'reason', 'idea', 'quote']);
const PAYLOAD = '<img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=(window.__xss||0)+1">';
const BAD_URL = 'javascript:window.__xss=(window.__xss||0)+1';

let n = 0;
function poison(x) {
  if (Array.isArray(x)) return x.forEach(poison);
  if (!x || typeof x !== 'object') return;
  for (const [k, v] of Object.entries(x)) {
    if (k === 'url' && typeof v === 'string') { x[k] = BAD_URL; n++; }
    else if (TEXT_KEYS.has(k) && typeof v === 'string' && v) { x[k] = v + ' ' + PAYLOAD; n++; }
    else poison(v);
  }
}

const data = JSON.parse(fs.readFileSync(__dirname + '/../dist/demo.json', 'utf8'));
// le moodboard de démonstration est vide : on y ajoute un lien, une image et une couleur piégés
data.mood = Object.assign(data.mood || {}, {
  'm-x1': { kind: 'lien', url: BAD_URL, title: 'lien', pinned: true, order: 1, createdAt: '2026-09-01' },
  'm-x2': { kind: 'image', img: 'x" onerror="window.__xss=1', title: 'image', order: 2, createdAt: '2026-09-01' },
  'm-x3': { kind: 'couleur', color: 'red;background:url(javascript:1)', title: 'couleur', order: 3, createdAt: '2026-09-01' },
});
poison(data);
const DATA = JSON.stringify(data);
const URL = 'file://' + __dirname + '/../dist/ma-saison.html';
const out = [], errs = [];
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('dialog', d => { errs.push('dialog ' + d.message()); d.dismiss(); });
  await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p.goto(URL);
  await p.evaluate(([d, k]) => { localStorage.setItem(k + ':data', d); localStorage.setItem(k + ':seeded', '1'); }, [DATA, 'ma-saison-v2']);
  await p.reload();
  await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(700);

  ok(n > 50, `${n} champs empoisonnés`);
  const tabs = await p.$$eval('[data-tab]', els => [...new Set(els.map(e => e.dataset.tab))]);
  for (const t of tabs) {
    await p.evaluate(tab => { const el = document.querySelector(`[data-tab="${tab}"]`); if (el) el.click(); }, t);
    await p.waitForTimeout(250);
    // sous-onglets éventuels de l'écran
    const subs = await p.$$('[data-sub], [role="tab"]');
    for (const s of subs.slice(0, 8)) { await s.click({ trial: false, timeout: 500 }).catch(() => {}); await p.waitForTimeout(120); }
  }
  // ouvrir chaque fiche de lecture (le lien « ouvrir » n'apparaît que fiche ouverte)
  let linkSeen = 0;
  const ids = Object.keys(data.knowledge_items || {});
  for (const id of ids) {
    await p.evaluate(() => { const el = document.querySelector('[data-tab="savoir"]'); if (el) el.click(); });
    await p.waitForTimeout(200);
    await p.evaluate(i => { const el = document.querySelector(`[data-a="libOpen"][data-id="${i}"]`); if (el) el.click(); }, id);
    await p.waitForTimeout(250);
    linkSeen += await p.$$eval('a[href][target="_blank"]', as => as.length);
    const bad = await p.$$eval('a[href]', as => as.filter(a => /^\s*javascript:/i.test(a.getAttribute('href'))).length);
    ok(bad === 0, `fiche ${id} : aucun lien javascript: (${bad})`);
  }
  await p.evaluate(() => { const el = document.querySelector('[data-tab="mood"]'); if (el) el.click(); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Lien invalide|Image indisponible/.test(document.body.textContent)), 'moodboard : lien et image piégés refusés');

  const fired = await p.evaluate(() => window.__xss || 0);
  ok(fired === 0, `aucune charge exécutée (${fired})`);
  const badLinks = await p.$$eval('a[href]', as => as.filter(a => /^\s*javascript:/i.test(a.getAttribute('href'))).length);
  ok(badLinks === 0, `aucun lien javascript: dans la page (${badLinks})`);
  const rawTags = await p.evaluate(() => document.querySelectorAll('img[onerror], svg[onload]').length);
  ok(rawTags === 0, `aucune balise injectée dans le DOM (${rawTags})`);
  ok(tabs.length >= 5, `${tabs.length} écrans parcourus`);

  console.log(out.join('\n'));
  console.log('ERREURS JS : ' + (errs.length ? '\n' + errs.join('\n') : 'aucune'));
  await b.close();
  process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
})().catch(e => { console.log(out.join('\n')); console.log('ÉCHEC DU SCRIPT : ' + e.message); process.exit(1); });
