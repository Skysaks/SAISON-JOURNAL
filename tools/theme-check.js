/* Étalonnage du moteur de thèmes : on applique les règles générées pour le thème
   « ligue » aux textes français, et on compare au thème Ligue écrit à la main
   (tools/theme-ligue.js). Usage : node tools/theme-check.js [themeId] [lang] */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const [themeId = 'ligue', lang = 'fr'] = process.argv.slice(2);

/* charge le moteur et les lexiques dans un contexte isolé */
const src = ['js/35-theme-engine.js', 'js/36-themes.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const ctx = {};
new Function('exports', src + '\nexports.themeRules = themeRules; exports.__themeText = __themeText; exports.THEMES = THEMES;')(ctx);

const allUnits = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'app-units.json'), 'utf8'));
const TR = JSON.parse(fs.readFileSync(path.join(root, 'i18n', 'tr.json'), 'utf8'));
const units = lang === 'fr' ? allUnits : allUnits.map(u => ({ text: (TR[u.text] && TR[u.text][lang]) || u.text })).filter(u => u.text);
const rules = ctx.themeRules(themeId, lang);

/* règles écrites à la main (référence) */
const ligSrc = fs.readFileSync(path.join(root, 'tools', 'theme-ligue.js'), 'utf8');
const hand = lang !== 'fr' ? [] : [...ligSrc.matchAll(/\['((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\]/g)]
  .map(m => [m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'), m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\')]);
const applyHand = s => hand.reduce((x, [a, b]) => x.split(a).join(b), s);

let same = 0, diff = 0, missed = 0, over = 0;
const samples = { diff: [], missed: [], over: [] };
const FOOTW = {
  fr: 'matchs?|coups?|trêves?|compo|mercato|capitaine|titulaires?|brassard|tribune|full ?time|chapeau|sifflet|banc|forfait|terrain|coach|club',
  en: 'match(es)?|plays?|kick-?off|full ?time|hat-?trick|line-?up|transfer window|captain|starters?|bench|stands|armband|cup|coach|manager|field|forfeit|break',
  es: 'partidos?|jugadas?|saque inicial|final del partido|pitido|triplete|alineación|fichajes|capitán|titulares?|banquillo|grada|brazalete|copa|entrenador|mánager|campo|incomparecencia|descanso'
};
const FOOT = new RegExp('(?<![\\p{L}\\d])(' + (FOOTW[lang] || FOOTW.fr) + ')(?![\\p{L}\\d])', 'giu');
for (const u of units) {
  const gen = ctx.__themeText(u.text, rules);
  const ref = applyHand(u.text);
  const touchedRef = ref !== u.text;
  if (gen === ref) { same++; continue; }
  if (touchedRef && gen === u.text) { missed++; if (samples.missed.length < 25) samples.missed.push([u.text, ref]); continue; }
  if (!touchedRef && gen !== u.text) { over++; if (samples.over.length < 25) samples.over.push([u.text, gen]); continue; }
  diff++; if (samples.diff.length < 30) samples.diff.push([u.text, ref, gen]);
}
/* restes de vocabulaire football dans la sortie générée */
const leftovers = new Map();
for (const u of units) {
  const gen = ctx.__themeText(u.text, rules);
  let m; FOOT.lastIndex = 0;
  const vis = gen.replace(/<[^>]*>/g, ' ');
  while ((m = FOOT.exec(vis))) if (!leftovers.has(m[1].toLowerCase())) leftovers.set(m[1].toLowerCase(), vis.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' '));
}
console.log(`${themeId}/${lang} · identiques ${same} · variantes ${diff} · non traités ${missed} · en trop ${over} · règles ${rules.length}`);
console.log('\n--- restes de vocabulaire (' + leftovers.size + ')');
for (const [w, c] of leftovers) console.log('  ' + w + ' « ' + c + ' »');
const show = (t, l, n) => { console.log('\n--- ' + t + ' (' + l.length + ')'); l.slice(0, n).forEach(x => console.log(x.map(y => JSON.stringify(y.slice(0, 110))).join('\n      → '))); };
show('non traités par le moteur', samples.missed, 12);
show('traités en trop', samples.over, 8);
show('variantes (référence puis moteur)', samples.diff, 12);
