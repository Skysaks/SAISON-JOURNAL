/* Internationalisation au build.
   Chaque texte visible du code (littéral ou gabarit) devient une entrée de table ;
   le code appelle __s(id) ou __t(id, [valeurs]) et lit la langue courante à l'exécution.
   Usage : node build-i18n.js <entrée.js> <sortie.js> <unités.json> [rapport.txt]
   Les traductions sont lues dans i18n/tr.json : { "texte FR": { "en": "...", "es": "..." } } */
const fs = require('fs'), path = require('path');
const acorn = require('acorn'), walk = require('acorn-walk');

const [inFile, outFile, unitsFile, reportFile] = process.argv.slice(2);
const src = fs.readFileSync(inFile, 'utf8');
const trPath = path.join(__dirname, '..', 'i18n', 'tr.json');
const TR = fs.existsSync(trPath) ? JSON.parse(fs.readFileSync(trPath, 'utf8')) : {};
const LANGS = ['en', 'es'];

/* noms de classes CSS : une chaîne faite uniquement de classes connues n'est pas un texte */
const cssClasses = new Set();
for (const f of ['a.css', 'b.css', 'c.css', 'theme-ligue.css']) {
  const p = path.join(__dirname, '..', 'css', f);
  if (fs.existsSync(p)) (fs.readFileSync(p, 'utf8').match(/\.[a-zA-Z][\w-]*/g) || []).forEach(c => cssClasses.add(c.slice(1)));
}
/* appels dont certains arguments sont toujours du texte affiché */
const LABEL_ARGS = { kpi: [1], pill: [0], sectionCard: [0, 2], nextStep: [0], emptyState: [0], toast: [0], banner: [0], numField: [1], boolField: [1], selField: [1], fb: [1], vbtn: [1], plural: [1, 2], checkBtn: [2], delBtn: [2], navHead: [0, 1] };
/* méthodes techniques : leurs arguments ne sont jamais traduits */
const TECH = new Set(['getElementById', 'querySelector', 'querySelectorAll', 'closest', 'createElement', 'addEventListener', 'removeEventListener', 'setAttribute', 'getAttribute', 'removeAttribute', 'toggle', 'add', 'remove', 'contains', 'matchMedia', 'setProperty', 'removeProperty', 'getPropertyValue', 'use', 'get', 'set', 'del', 'doc', 'collection', 'where', 'orderBy', 'normalize', 'toLocaleString', 'padStart', 'split', 'join', 'startsWith', 'endsWith', 'includes', 'indexOf', 'replace', 'test', 'getContext', 'toDataURL', 'createObjectURL', 'observe', 'setItem', 'getItem', 'removeItem', 'uid', 'put', 'addLog', 'logItems', 'dataset']);
/* valeurs forcées (mots de confirmation à taper) */
const FORCE = new Set(['REMPLACER', 'RESTAURER', 'SUPPRIMER']);
/* déclarations dont toutes les valeurs de propriété sont des libellés */
const FORCE_DECL = new Set(['HORIZON']);

const comments = [];
const zones = [];   // plages « ne pas traduire » : /*nt-file*/ … /*nt-end*/
let zoneOpen = null;
const ast = acorn.parse(src, {
  ecmaVersion: 'latest', locations: true,
  onComment: (block, text, start, end) => {
    const t = text.trim();
    if (!block) return;
    if (t === 'nt') comments.push(end);
    else if (t === 'nt-file') zoneOpen = start;
    else if (t === 'nt-end' && zoneOpen != null) { zones.push([zoneOpen, end]); zoneOpen = null; }
  }
});
if (zoneOpen != null) zones.push([zoneOpen, src.length]);
const inZone = pos => zones.some(z => pos >= z[0] && pos <= z[1]);
const ntStarts = new Set(comments.map(e => { let i = e; while (/\s/.test(src[i])) i++; return i; }));

const hasLetters = s => /[A-Za-zÀ-ÿ]{2,}/.test(s);
/* identifiants techniques : camelCase, chemins pointés, codes de langue */
const isIdent = s => /^[a-z]+[A-Z][A-Za-z0-9]*$/.test(s) || /^[a-z]+(\.[a-zA-Z0-9]+)+$/.test(s) || /^[a-z]{2}-[A-Z]{2}$/.test(s);
function literalVisible(v) {
  if (!hasLetters(v)) return false;
  if (/^[a-z0-9_:\-.\/#@~?=&%+]+$/.test(v)) return false;          // identifiant, chemin, clé
  if (!/[a-zà-ÿ]/.test(v)) return false;                              // tout en majuscules : sigle, code
  if (/^[\x20-\x7E]+$/.test(v) && !/[A-Z]/.test(v)) {                 // ascii minuscule
    const toks = v.trim().split(/\s+/);
    if (toks.every(t => cssClasses.has(t) || /^[a-z0-9]+-[\w-]*$/.test(t))) return false; // liste de classes
    if (toks.length === 1) return false;                              // mot seul en minuscules : clé
  }
  if (/\s(title|aria-label|placeholder|alt|data-tip|label)="[^"]*[A-Za-zÀ-ÿ]{2,}/.test(v)) return true;   // libellé dans un attribut
  if (/^<[^>]*>$/.test(v.trim())) return false;
  if (/^[\w-]+(:[^;]+;?)+$/.test(v) && !/\s[a-zà-ÿ]{3,}\s/.test(v)) return false; // déclaration CSS
  const vis = v.replace(/<[^>]*>/g, ' ');
  return hasLetters(vis);
}
function templatePattern(n) { return n.quasis.map(q => q.value.cooked).reduce((acc, q, i) => acc + (i ? `{${i - 1}}` : '') + q, ''); }
function templateVisible(p) {
  if (/^[\w-]+[:~][^\s]*$/.test(p)) return false;                   // clé technique (ex. cm:{0}:{1})
  let visAttr = false;
  let t = p.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, tag => {
    const re = /(title|aria-label|placeholder|alt|data-tip|label)="([^"]*)"/g; let m;
    while ((m = re.exec(tag))) if (hasLetters(m[2].replace(/\{\d+\}/g, ''))) visAttr = true;
    return ' ';
  });
  if (visAttr) return true;
  t = t.replace(/[\w-]+="[^"]*"?/g, ' ').replace(/\{\d+\}/g, ' ').replace(/&[a-z]+;/g, ' ');
  // fragments de balise ouverts ou fermés en bord de gabarit
  t = t.replace(/^[^<]*?"\s*>/, m => (/[a-zà-ÿ]{2,}\s[a-zà-ÿ]{2,}/i.test(m) ? m : ' ')).replace(/<[\w-]+[^>]*$/, ' ');
  const tr = t.replace(/\s+/g, ' ').trim();
  if (!hasLetters(tr)) return false;
  const words = (' ' + tr + ' ').match(/\s[A-Za-zÀ-ÿ'’]{2,}(?=[\s.,;:!?)»…])/g) || [];
  if (!words.length) return false;
  if (/^[a-z0-9 _-]+$/.test(tr) && words.every(w => cssClasses.has(w.trim()))) return false;
  return true;
}

/* ---------- repérage des cibles */
const targets = []; // { node, kind: 'lit'|'tpl'|'ins', text, pos }
const unitIndex = new Map(), units = [];
function unitId(text, kind, node) {
  if (/\{\d+\}/.test(kind === 'lit' ? text : '') && kind === 'lit') { /* littéral contenant {n} : laissé tel quel */ }
  let id = unitIndex.get(text);
  if (id == null) { id = units.length; unitIndex.set(text, id); units.push({ id, text, kind, ctx: src.slice(Math.max(0, node.start - 90), Math.min(src.length, node.end + 60)).replace(/\s+/g, ' ') }); }
  return id;
}
const skippedReview = [];
function isFnNode(n) { return n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'; }

walk.fullAncestor(ast, (node, state, anc) => {
  const isLit = node.type === 'Literal' && typeof node.value === 'string';
  const isTpl = node.type === 'TemplateLiteral';
  if (!isLit && !isTpl) return;
  const parent = anc[anc.length - 2];
  if (inZone(node.start)) return;
  if (anc.some(a => ntStarts.has(a.start) && a !== ast)) return;
  if (parent && parent.type === 'CallExpression' && parent.callee.type === 'Identifier' && parent.callee.name === 'NT') return;
  if (isTpl && parent && parent.type === 'TaggedTemplateExpression') return;
  if (parent && parent.type === 'ExpressionStatement' && parent.directive) return;
  let forced = anc.some(a => a.type === 'CallExpression' && a.callee.type === 'Identifier' && a.callee.name === 'TX'), techSkip = false;
  if (isLit && !forced && isIdent(node.value)) return;
  if (isLit) {
    if (FORCE.has(node.value)) forced = true;
    if (parent) {
      if (parent.type === 'Property' && parent.key === node && !parent.computed) return;
      if (parent.type === 'MemberExpression' && parent.property === node) return;
      if (parent.type === 'BinaryExpression' && ['===', '!==', '==', '!=', 'in'].includes(parent.operator) && !forced) return;
      if (parent.type === 'SwitchCase') return;
      if (parent.type === 'ImportDeclaration') return;
      if (parent.type === 'CallExpression' && parent.arguments.includes(node)) {
        const c = parent.callee, name = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && !c.computed ? c.property.name : null;
        const idx = parent.arguments.indexOf(node);
        if (name && LABEL_ARGS[name] && c.type === 'Identifier' && LABEL_ARGS[name].includes(idx) && hasLetters(node.value)) forced = true;
        else if (name === 'setAttribute' && idx === 1 && parent.arguments[0].type === 'Literal' && /^(aria-label|title|placeholder|alt|data-tip)$/.test(parent.arguments[0].value)) forced = true;
        else if (name && TECH.has(name)) techSkip = true;
      }
      if (parent.type === 'Property' && parent.value === node) {
        const decl = anc.slice().reverse().find(a => a.type === 'VariableDeclarator');
        if (decl && decl.id.type === 'Identifier' && FORCE_DECL.has(decl.id.name) && hasLetters(node.value)) forced = true;
      }
    }
    if (techSkip && !forced) return;
    if (!forced && !literalVisible(node.value)) { if (hasLetters(node.value) && /[a-zà-ÿ]{3,}/.test(node.value) && !/[:\/_.#-]/.test(node.value) && !cssClasses.has(node.value)) skippedReview.push(node.value); return; }
    targets.push({ node, kind: 'lit', start: node.start, end: node.end, id: unitId(node.value, 'lit', node), load: !anc.some(isFnNode) });
    // plural(n, 'x') sans pluriel explicite : on ajoute le pluriel français comme unité à part
    if (parent && parent.type === 'CallExpression' && parent.callee.type === 'Identifier' && parent.callee.name === 'plural' && parent.arguments.length === 2 && parent.arguments[1] === node) {
      targets.push({ kind: 'ins', start: parent.end - 1, end: parent.end - 1, id: unitId(node.value + 's', 'lit', node), load: false });
    }
    return;
  }
  // gabarit
  const p = templatePattern(node);
  if (node.quasis.some(q => /\{\d+\}/.test(q.value.cooked))) throw new Error('Gabarit contenant {n} littéral : ' + p.slice(0, 80));
  if (!forced && !templateVisible(p)) { if (hasLetters(p.replace(/<[^>]*>/g, ' ').replace(/\{\d+\}/g, ' '))) skippedReview.push('`' + p.slice(0, 120) + '`'); return; }
  targets.push({ node, kind: 'tpl', start: node.start, end: node.end, id: unitId(p, 'tpl', node), load: !anc.some(isFnNode) });
});
targets.sort((a, b) => a.start - b.start || (a.kind === 'ins' ? 1 : -1));

/* ---------- réécriture (les gabarits contiennent d'autres cibles dans leurs expressions) */
function render(from, to) {
  let out = '', pos = from;
  for (const t of targets) {
    if (t.start < pos || t.start < from || t.end > to) continue;
    if (t.kind === 'ins' && t.start >= to) continue;
    out += src.slice(pos, t.start);
    if (t.kind === 'lit') out += `__s(${t.id})`;
    else if (t.kind === 'ins') out += `, __s(${t.id})`;
    else out += `__t(${t.id}, [${t.node.expressions.map(e => render(e.start, e.end)).join(', ')}])`;
    pos = t.end;
  }
  return out + src.slice(pos, to);
}

/* ---------- constantes évaluées au chargement : ré-évaluées quand la langue change */
const edits = []; // { start, end, text }
const warnings = [];
for (const st of ast.body) {
  if (st.type !== 'VariableDeclaration') continue;
  const loadT = targets.filter(t => t.load && t.start >= st.start && t.end <= st.end);
  if (!loadT.length) continue;
  if (st.kind === 'const') edits.push({ start: st.start, end: st.start + 5, text: 'let  ' });
  const re = st.declarations.filter(d => d.id.type === 'Identifier' && d.init).map(d => `__RI.push(() => { ${d.id.name} = ${render(d.init.start, d.init.end)}; });`).join('\n');
  edits.push({ start: st.end, end: st.end, text: '\n' + re });
}
for (const t of targets) {
  if (!t.load) continue;
  const inDecl = ast.body.some(st => st.type === 'VariableDeclaration' && t.start >= st.start && t.end <= st.end);
  if (!inDecl) warnings.push('Texte évalué au chargement hors constante : ' + src.slice(t.start, Math.min(t.end, t.start + 80)));
}
/* rendu final : texte réécrit + petites éditions (const → let, ré-évaluations) */
let js = '';
let pos = 0;
const bounds = edits.sort((a, b) => a.start - b.start);
for (const e of bounds) { js += render(pos, e.start) + e.text; pos = e.end; }
js += render(pos, src.length);

/* ---------- tables */
const missing = { en: 0, es: 0 };
const table = l => units.map(u => { const t = TR[u.text] && TR[u.text][l]; if (typeof t !== 'string' || !t) { missing[l]++; return null; } return t; });
const FRt = units.map(u => u.text);
const tables = Object.fromEntries(LANGS.map(l => [l, table(l)]));
const prelude = `const __FR = ${JSON.stringify(FRt)};
const __TR = ${JSON.stringify(tables)};
let __BASE = __FR, __CUR = __FR, __THR = null;
const __RI = [];
function __retheme() { __CUR = (__THR && __THR.length && typeof __themeText === 'function') ? __BASE.map(s => __themeText(s, __THR)) : __BASE; }
function __setTable(l) { __BASE = l === 'fr' ? __FR : (__TR[l] || __FR); __retheme(); }
function __setTheme(r) { __THR = r; __retheme(); }
function __s(i) { const v = __CUR[i]; return v == null ? __FR[i] : v; }
function __t(i, a) { return __s(i).replace(/\\{(\\d+)\\}/g, (m, n) => String(a[n])); }
`;
const us = js.indexOf("'use strict';");
js = us === 0 ? "'use strict';\n" + prelude + js.slice("'use strict';".length) : prelude + js;
acorn.parse(js, { ecmaVersion: 'latest' });
fs.writeFileSync(outFile, js, 'utf8');
fs.writeFileSync(unitsFile, JSON.stringify(units, null, 1), 'utf8');
const summary = `${units.length} unités · ${targets.filter(t => t.kind === 'tpl').length} gabarits · manquantes en ${missing.en} / es ${missing.es} · avertissements ${warnings.length}`;
const missList = units.filter(u => !(TR[u.text] && TR[u.text].en && TR[u.text].es)).map(u => JSON.stringify(u.text));
if (reportFile) fs.writeFileSync(reportFile, [summary, '', '## sans traduction', ...missList, '', '## avertissements', ...warnings, '', '## ignorés à vérifier', ...Array.from(new Set(skippedReview))].join('\n'), 'utf8');
console.log(summary);
