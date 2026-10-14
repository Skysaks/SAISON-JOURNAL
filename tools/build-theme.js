/* Génère le JS d'un thème dérivé à partir des sources Football, sans toucher au code :
   seules les chaînes (Literal string / TemplateElement) sont réécrites.
   Usage : node build-theme.js <theme> <sortie.js> [rapport.txt] */
const fs = require('fs'), path = require('path');
const acorn = require('acorn'), walk = require('acorn-walk');

const themeId = process.argv[2];
const outFile = process.argv[3];
const reportFile = process.argv[4];
const T = require(`./theme-${themeId}.js`);
const dir = path.join(__dirname, '..', 'js');
const EXCL = process.env.EXCLUDE || '';
const SKIP = new Set(['35-theme-engine.js', '36-themes.js']);   /* vocabulaire des thèmes à l'exécution : copié tel quel */
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !(EXCL && f.endsWith(EXCL))).sort();
const IDENT = /^[A-Za-z0-9_.:\-\/]*$/;

const usedAt = new Set(), usedRule = new Set();
const report = [], leftovers = [];

function escFor(q, s) {
  if (q === '`') return s.replace(/\\?`/g, m => (m.length === 2 ? m : '\\`')).replace(/\$\{/g, '\\${');
  return s.replace(new RegExp(`\\\\?${q}`, 'g'), m => (m.length === 2 ? m : '\\' + q));
}

const out = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  if (SKIP.has(f)) { out.push(src); continue; }
  const ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true });
  const edits = [];
  const nodes = [];
  walk.full(ast, n => { if ((n.type === 'Literal' && typeof n.value === 'string') || n.type === 'TemplateElement') nodes.push(n); });
  nodes.sort((a, b) => a.start - b.start);
  const seen = {};
  nodes.forEach(n => {
    let raw, start, end, q;
    if (n.type === 'Literal') { start = n.start + 1; end = n.end - 1; raw = src.slice(start, end); q = src[n.start]; }
    else { start = n.start; end = n.end; raw = src.slice(start, end); q = '`'; }
    seen[raw] = (seen[raw] || 0) + 1;
    const key = `${f}|${raw}|${seen[raw] - 1}`;
    let next = raw;
    if (Object.prototype.hasOwnProperty.call(T.at, key)) { next = T.at[key]; usedAt.add(key); }
    else if (!IDENT.test(raw.trim())) {
      T.rules.forEach(([a, b], i) => { if (next.includes(a)) { next = next.split(a).join(b); usedRule.add(i); } });
    }
    if (next !== raw) { edits.push({ start, end, text: escFor(q, next) }); report.push(`${f}:${n.loc.start.line}\n  - ${raw}\n  + ${next}`); }
    const vis = next.replace(/<[^>]*>/g, ' ').replace(/(class|id|for|href|data-[\w-]+|name|type)="[^"]*"/g, ' ');
    if (!IDENT.test(next.trim()) && T.banned.test(vis) && !T.allowed.some(r => r.test(vis))) leftovers.push(`${f}:${n.loc.start.line}  ${next.slice(0, 200)}`);
  });
  let s = src;
  edits.sort((a, b) => b.start - a.start).forEach(e => { s = s.slice(0, e.start) + e.text + s.slice(e.end); });
  acorn.parse(s, { ecmaVersion: 'latest' }); // doit rester du JS valide
  out.push(s);
}
const js = out.join('\n');
fs.writeFileSync(outFile, js, 'utf8');
const unusedAt = Object.keys(T.at).filter(k => !usedAt.has(k));
const unusedRules = T.rules.map((r, i) => i).filter(i => !usedRule.has(i)).map(i => T.rules[i][0]);
const summary = `${report.length} fragments modifiés · at inutilisés : ${unusedAt.length} · règles inutilisées : ${unusedRules.length} · restes suspects : ${leftovers.length}`;
if (reportFile) fs.writeFileSync(reportFile, [summary, '', '## at inutilisés', ...unusedAt, '', '## règles inutilisées', ...unusedRules, '', '## restes suspects', ...leftovers, '', '## modifications', ...report].join('\n'), 'utf8');
console.log(summary);
if (unusedAt.length || unusedRules.length) { console.log('INUTILISÉS:', unusedAt, unusedRules); }
