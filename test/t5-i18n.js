// Langues : parcours complet en anglais et en espagnol, pour chaque version (PAGE).
// Détecte les restes de français (fragments de la table FR non traduits), les {n} non remplacés,
// « undefined » / « NaN », le débordement horizontal sur mobile et les erreurs JS.
const { chromium } = require('playwright');
const fs = require('fs');
const PAGE = process.env.PAGE || 'ma-saison.html';
const LIGUE = PAGE.startsWith('ligue');
const KEY = LIGUE ? 'ligue-entrepreneurs-v1' : 'ma-saison-v2';
const DATA = fs.readFileSync(__dirname + '/../dist/' + (LIGUE ? 'demo-demo-neutral.json' : 'demo.json'), 'utf8');
const URL = 'file://' + __dirname + '/../dist/' + PAGE;
const SHOTS = process.env.SHOTS || '/tmp/claude-0';
const LANGS = (process.env.LANGS || 'en,es').split(',');
const out = [], errs = [];
const ok = (c, m) => out.push((c ? 'OK   ' : 'FAIL ') + m);

(async () => {
  const b = await chromium.launch();
  for (const L of LANGS) {
    const leftovers = new Map(), weird = new Map(), suspects = new Map();
    const FRW = new RegExp('(?<![\\p{L}])(les|des|du|une|est|pour|avec|dans|pas|aucun|aucune|jours?|semaine|mois|saison|tes|ton|et|cette|ces|aux|être|sont|déjà|très|après|avant|ici)(?![\\p{L}])' + (L === 'en' ? '|[éèêàçùûôî]' : '|[èêàçùûôî]'), 'iu');
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Paris', locale: L === 'en' ? 'en-GB' : 'es-ES', colorScheme: 'dark' });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`[${L}] pageerror ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push(`[${L}] console ${m.text()}`); });
    await p.clock.setFixedTime(new Date('2026-09-22T09:00:00+02:00'));
    await p.goto(URL); await p.evaluate(([d, k]) => { localStorage.setItem(k + ':data', d); localStorage.setItem(k + ':seeded', '1'); }, [DATA, KEY]); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(700);
    const txt = s => p.textContent(s).then(x => (x || '').replace(/\s+/g, ' ').trim()).catch(() => '');
    const click = async (sel, i) => { const l = p.locator(sel); await (i == null ? l.first() : l.nth(i)).click(); await p.waitForTimeout(160); };

    // les données existantes sont françaises : la langue se choisit dans Réglages › Langue
    await click('.hdr [data-tab="reglages"]');
    await click('[data-a="setSec"][data-v="langue"]');
    await click(`[data-a="setLang"][data-v="${L}"]`); await p.waitForTimeout(250);
    ok(await p.evaluate(l => LANG === l && document.documentElement.lang === l, L), `[${L}] langue active`);

    // fragments français détectables : issus de la table, absents de la traduction et des données de l'utilisateur
    const frags = await p.evaluate(([l, data]) => {
      const set = new Map();
      __FR.forEach((fr, i) => {
        const tr = (__TR[l] || [])[i];
        if (!tr || tr === fr) return;
        fr.split(/\{\d+\}|<[^>]*>|\n/).map(s => s.trim().replace(/^[·:,;.()\s]+|[·:,;.()\s]+$/g, '')).forEach(f => {
          const words = f.split(/\s+/).filter(w => /[a-zà-ÿ]{2,}/i.test(w));
          if (words.length < 2 || f.length < 9) return;
          if (tr.includes(f) || data.includes(f)) return;
          set.set(f, i);
        });
      });
      return [...set.keys()];
    }, [L, DATA]);
    const scan = async where => {
      const blob = await p.evaluate(() => {
        const parts = [document.title, document.body.innerText];
        document.querySelectorAll('[title],[aria-label],[placeholder],[data-tip],optgroup').forEach(e => ['title', 'aria-label', 'placeholder', 'data-tip', 'label'].forEach(a => { const v = e.getAttribute(a); if (v) parts.push(v); }));
        return parts.join('\n');
      });
      for (const f of frags) if (blob.includes(f) && !leftovers.has(f)) leftovers.set(f, where);
      const nodes = await p.evaluate(() => {
        const r = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n; while ((n = w.nextNode())) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t && n.parentElement && !n.parentElement.closest('script,style,textarea,[hidden]')) r.push(t); }
        document.querySelectorAll('[title],[aria-label],[placeholder],[data-tip]').forEach(e => ['title', 'aria-label', 'placeholder', 'data-tip'].forEach(a => { const v = e.getAttribute(a); if (v) r.push(v.trim()); }));
        return r;
      });
      for (const t of nodes) { if (DATA.includes(t) || DATA.includes(JSON.stringify(t).slice(1, -1))) continue; const m = t.match(FRW); if (m && !suspects.has(t)) suspects.set(t, where); }
      const w = blob.match(/\{\d+\}|\bundefined\b|\bNaN\b|\[object Object\]/g);
      if (w) w.forEach(x => { const i = blob.indexOf(x); weird.set(x + ' « ' + blob.slice(Math.max(0, i - 50), i + 30).replace(/\s+/g, ' ') + ' »', where); });
    };

    // --- Réglages : toutes les sections
    for (const s of ['saison', 'score', 'xp', 'match', 'quetes', 'compo', 'routines', 'objectifs', 'notifications', 'langue', 'apparence', 'donnees', 'avance']) {
      const has = await p.locator(`[data-a="setSec"][data-v="${s}"]`).count();
      if (!has) continue;
      await click(`[data-a="setSec"][data-v="${s}"]`);
      await scan('réglages › ' + s);
    }
    await click('[data-a="setSec"][data-v="langue"]');
    await p.screenshot({ path: `${SHOTS}/${LIGUE ? 'ligue' : 'foot'}-${L}-langue.png` });

    // --- Journée du jour : choix, coup d'envoi, routine, clôture
    await p.keyboard.press('m'); await p.waitForTimeout(250);
    await scan('jour (arrivée)');
    for (let i = 0; i < 3; i++) {
      const sel = p.locator('select[data-c="pickQuest"]').first();
      if (!(await sel.count())) break;
      const opts = await sel.locator('option').evaluateAll(os => os.map(o => o.value).filter(Boolean));
      await sel.selectOption(opts[0]); await p.waitForTimeout(160);
    }
    await scan('jour (3 choisis)');
    await click('[data-a="preEnergy"][data-v="4"]').catch(() => {});
    await click('[data-a="kickoff"]').catch(() => {});
    await scan('jour (ouvert)');
    const nh = await p.locator('#routine [data-a="habit"]').count();
    for (let i = 0; i < nh; i++) await click('#routine [data-a="habit"]', i);
    for (let i = 0; i < 3; i++) await click('.slot [data-a="slotToggle"]:not(.on)').catch(() => {});
    await scan('jour (tout fait)');
    await click('[data-a="focusStart"][data-v="25"]').catch(() => {});
    await scan('jour (focus en cours)');
    await p.screenshot({ path: `${SHOTS}/${LIGUE ? 'ligue' : 'foot'}-${L}-jour.png` });
    await click('[data-a="focusCancel"]').catch(() => {});
    await p.fill('#ft-shipped-2026-09-22', 'X').catch(() => {}); await p.press('#ft-shipped-2026-09-22', 'Tab').catch(() => {});
    await click('[data-a="ftClose"]').catch(() => {}); await p.waitForTimeout(600);
    ok((await txt('.score-num')) === '100', `[${L}] journée clôturée à 100`);
    await scan('jour (clôturé)');

    // --- Écrans principaux
    for (const t of ['quetes', 'compo', 'savoir', 'reseau', 'mood', 'guide']) {
      await p.evaluate(tab => { ui.tab = tab; render(); }, t); await p.waitForTimeout(200);
      await scan(t);
    }
    await p.evaluate(() => { ui.tab = 'quetes'; render(); }); await p.waitForTimeout(150);
    await click('[data-a="qEdit"]').catch(() => {}); await scan('quêtes (édition)'); await click('[data-a="qEditCancel"]').catch(() => {});
    await p.evaluate(() => { ui.tab = 'mood'; render(); }); await p.waitForTimeout(150);
    for (const k of ['image', 'citation', 'couleur', 'note', 'lien']) { await click(`[data-a="moodKind"][data-v="${k}"]`).catch(() => {}); await scan('moodboard › ' + k); }
    await p.evaluate(() => { ui.tab = 'savoir'; render(); }); await p.waitForTimeout(150);
    await click('[data-a="libStart"]').catch(() => {}); await click('[data-a="libFinishOpen"]').catch(() => {}); await scan('savoir (terminer)');
    for (const v of ['semaine', 'mois', 'saison', 'carriere', 'analytics']) {
      await p.evaluate(() => { ui.tab = 'perf'; render(); }); await p.waitForTimeout(120);
      await click(`[data-a="perf"][data-v="${v}"]`);
      await scan('perf › ' + v);
      if (v === 'semaine') { await click('[data-a="coachFacts"]').catch(() => {}); await scan('perf › semaine (rapport)'); }
      if (v === 'saison') { await click('.hm.now').catch(() => {}); await scan('perf › saison (détail)'); }
      if (v === 'carriere') await p.screenshot({ path: `${SHOTS}/${LIGUE ? 'ligue' : 'foot'}-${L}-carriere.png`, fullPage: true });
    }

    // --- Surcouches
    await p.keyboard.press('/'); await p.waitForTimeout(150); await scan('recherche (vide)');
    await p.fill('#srch', 'a'); await p.waitForTimeout(250); await scan('recherche');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    await click('.hdr [data-a="quick"]');
    for (const k of ['quete', 'contact', 'savoir', 'note']) { await click(`[data-a="quickKind"][data-v="${k}"]`).catch(() => {}); await scan('ajout rapide › ' + k); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);

    // --- Jours passés : forfait, imprévu, jour de repos
    await p.evaluate(() => { ui.day = addDays(todayKey(), -3); ui.tab = 'match'; render(); }); await p.waitForTimeout(200);
    await scan('jour passé');
    await click('[data-a="markImprevu"]').catch(() => {}); await scan('imprévu (formulaire)');
    await p.evaluate(() => { ui.day = addDays(todayKey(), 1); ui.tab = 'match'; render(); }); await p.waitForTimeout(200);
    await scan('demain');

    // --- Absence de 12 jours (briefing, forfaits)
    await p.clock.setFixedTime(new Date('2026-10-05T10:00:00+02:00'));
    await p.waitForTimeout(500); await p.reload(); await p.waitForSelector('#bnav .bn', { state: 'attached', timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1200);
    ok(await p.evaluate(l => LANG === l, L), `[${L}] langue conservée après rechargement`);
    await scan('retour après absence');
    for (const v of ['semaine', 'mois', 'analytics']) { await p.evaluate(() => { ui.tab = 'perf'; render(); }); await click(`[data-a="perf"][data-v="${v}"]`); await scan('perf après absence › ' + v); }

    // --- Mobile
    await p.setViewportSize({ width: 390, height: 844 });
    for (const t of ['match', 'quetes', 'perf', 'mood', 'reglages']) {
      await p.evaluate(tab => { ui.day = todayKey(); ui.tab = tab; render(); }, t); await p.waitForTimeout(200);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(ov <= 1, `[${L}] mobile › ${t} sans débordement horizontal (${ov}px)`);
    }
    await p.evaluate(() => { ui.tab = 'match'; render(); }); await p.waitForTimeout(150);
    await click('[data-a="more"]').catch(() => {}); await scan('menu Plus (mobile)');
    await p.screenshot({ path: `${SHOTS}/${LIGUE ? 'ligue' : 'foot'}-${L}-mobile.png` });
    await p.keyboard.press('Escape');

    ok(leftovers.size === 0, `[${L}] aucun reste de français (${leftovers.size})`);
    for (const [f, w] of leftovers) out.push(`     reste « ${f} » — ${w}`);
    out.push(`     suspects (texte non issu des données, mots ou accents français) : ${suspects.size}`);
    for (const [f, w] of suspects) out.push(`     ? « ${f.slice(0, 120)} » — ${w}`);
    ok(weird.size === 0, `[${L}] aucun {n} / undefined / NaN (${weird.size})`);
    for (const [f, w] of weird) out.push(`     ${f} — ${w}`);
    await ctx.close();
  }
  await b.close();
  console.log(out.join('\n'));
  console.log(errs.length ? 'ERREURS JS :\n' + errs.join('\n') : 'ERREURS JS : aucune');
})();
