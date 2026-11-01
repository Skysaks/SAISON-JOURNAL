// Thèmes : chaque univers × chaque langue — vocabulaire football résiduel,
// accords (article/genre), erreurs JS, palette appliquée.
const { chromium } = require('playwright');
const fs = require('fs');
const DATA = fs.readFileSync(__dirname + '/../dist/demo.json', 'utf8');
const KEY = 'ma-saison-v2';
const URL = 'file://' + __dirname + '/../dist/ma-saison.html';
const SHOTS = process.env.SHOTS || require('os').tmpdir();
const LANGS = (process.env.LANGS || 'fr,en,es').split(',');
const ONLY = process.env.THEMES ? process.env.THEMES.split(',') : null;
const out = [], errs = [];
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);

const FOOTW = {
  fr: 'matchs?|coups?|trêves?|compo|mercato|capitaine|titulaires?|brassard|tribune|full ?time|chapeau|sifflet',
  en: 'match|matches|kick-?off|full ?time|hat-?trick|line-?up|transfer window|captain|starters?|armband',
  es: 'partidos?|saque inicial|pitido|triplete|alineación|fichajes|capitán|titulares?|brazalete'
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: 'fr-FR', colorScheme: 'dark' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('console ' + m.text()); });
  await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
  await p.goto(URL);
  await p.evaluate(([d, k]) => { localStorage.setItem(k + ':data', d); localStorage.setItem(k + ':seeded', '1'); }, [DATA, KEY]);
  await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(700);

  const ids = await p.evaluate(() => THEME_IDS);
  ok(ids.length === 15, `15 univers disponibles (${ids.length})`);
  const themes = ONLY || ids;

  for (const id of themes) {
    for (const L of LANGS) {
      await p.evaluate(([t, l]) => {
        saveSettings(s => { s.theme = t; s.lang = l; });
        applyVocab(); applyLook(); render();
      }, [id, L]);
      await p.waitForTimeout(120);
      const gloss = await p.evaluate(([t, l]) => (THEMES[t].w[l] || null), [id, L]);
      const seen = [];
      for (const tab of ['match', 'quetes', 'compo', 'perf', 'agent', 'savoir', 'reglages']) {
        await p.evaluate(t => { ui.tab = t; ui.perf = 'carriere'; ui.set = 'apparence'; ui.lib.tab = 'lectures'; ui.agent.view = 'revue'; ui.day = todayKey(); render(); }, tab);
        await p.waitForTimeout(90);
        seen.push(await p.evaluate(() => {
          document.querySelectorAll('.th-grid').forEach(e => e.remove());   /* le sélecteur d'univers cite tous les vocabulaires */
          const parts = [document.body.innerText];
          document.querySelectorAll('[title],[aria-label],[placeholder],[data-tip]').forEach(e => ['title', 'aria-label', 'placeholder', 'data-tip'].forEach(a => { const v = e.getAttribute(a); if (v) parts.push(v); }));
          return parts.join('\n');
        }));
      }
      const blob = seen.join('\n');
      const glossWords = new Set();
      Object.values(gloss || {}).forEach(v => { (Array.isArray(v) ? v : [v]).forEach(x => { if (typeof x === 'string') x.toLowerCase().split(/[^\p{L}]+/u).forEach(w => w && glossWords.add(w)); }); });
      /* vocabulaire football résiduel, hors textes de l'utilisateur */
      const rxF = new RegExp('(?<![\\p{L}\\d])(' + FOOTW[L] + ')(?![\\p{L}\\d])', 'giu');
      const found = new Map();
      let m;
      while ((m = rxF.exec(blob))) {
        const around = blob.slice(Math.max(0, m.index - 50), m.index + 60).replace(/\s+/g, ' ');
        const line = (blob.slice(0, m.index).split('\n').pop() + m[1] + blob.slice(m.index + m[1].length).split('\n')[0]).trim();
        if (DATA.includes(line)) continue;
        if (glossWords.has(m[1].toLowerCase())) continue;   /* le thème réutilise ce mot exprès */
        if (!found.has(m[1].toLowerCase())) found.set(m[1].toLowerCase(), around);
      }
      if (id !== 'foot') {
        ok(found.size === 0, `[${id}/${L}] aucun mot football résiduel (${found.size})`);
        for (const [w, c] of found) out.push(`     ${w} — « ${c} »`);
      }
      /* accords : article incompatible avec le genre du mot du thème */
      if (gloss && (L === 'fr' || L === 'es')) {
        const bad = [];
        const check = (word, fem) => {
          if (!word) return;
          const wrong = L === 'fr' ? (fem ? ['le', 'un', 'ce', 'du', 'au'] : ['la', 'une', 'cette']) : (fem ? ['el', 'un', 'este', 'del'] : ['la', 'una', 'esta']);
          wrong.forEach(a => {
            const re = new RegExp('(?<![\\p{L}\\d])' + a + ' ' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\d])', 'giu');
            const hit = blob.match(re);
            if (hit) bad.push(hit[0]);
          });
        };
        check(gloss.day, !!gloss.dayF); check(gloss.act, !!gloss.actF);
        ok(bad.length === 0, `[${id}/${L}] accords corrects${bad.length ? ' — ' + bad.slice(0, 4).join(', ') : ''}`);
      }
      /* palette et nom par défaut */
      const look = await p.evaluate(() => {
        const cs = getComputedStyle(document.body);
        return { accent: cs.getPropertyValue('--accent').trim(), brand: (document.querySelector('.brand b') || {}).textContent || '' };
      });
      ok(/^#|rgb/.test(look.accent), `[${id}/${L}] palette appliquée (${look.accent})`);
      if (L === 'fr' && id === themes[0]) await p.screenshot({ path: `${SHOTS}/theme-${id}.png` });
    }
    if (LANGS.includes('fr')) {
      await p.evaluate(t => { saveSettings(s => { s.theme = t; s.lang = 'fr'; }); applyVocab(); ui.tab = 'match'; render(); }, id);
      await p.waitForTimeout(120);
      await p.screenshot({ path: `${SHOTS}/theme-${id}.png` });
    }
  }
  await b.close();
  console.log(out.filter(x => x.startsWith('FAIL') || x.startsWith('     ')).join('\n') || 'aucun échec');
  console.log(`${out.filter(x => x.startsWith('OK')).length} vérifications OK · ${out.filter(x => x.startsWith('FAIL')).length} échecs`);
  console.log(errs.length ? 'ERREURS JS :\n' + [...new Set(errs)].join('\n') : 'ERREURS JS : aucune');
})();
