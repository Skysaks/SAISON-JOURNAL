/* Contrôle mécanique d'une traduction.
   Usage : node check-tr.js <chunk.json> <sortie.json>
   chunk : [{ k, fr, ... }]  ·  sortie : { k: "traduction" }
   Vérifie : présence, placeholders {n}, squelette HTML (balises et attributs non traduisibles),
   espaces de bord, mots de confirmation. Code de sortie 1 s'il reste des erreurs. */
const fs = require('fs');
const [chunkFile, outFile] = process.argv.slice(2);
const chunk = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
const out = JSON.parse(fs.readFileSync(outFile, 'utf8'));
const TRANSL = /\s(title|aria-label|placeholder|alt|data-tip|label)="[^"]*"/g;
const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(',');
const tags = s => (s.match(/<[^>]*>/g) || []).map(t => t.replace(TRANSL, ' $1=""')).sort().join('\n');
const lead = s => s.match(/^\s*/)[0], trail = s => s.match(/\s*$/)[0];
const errs = [];
for (const u of chunk) {
  const t = out[u.k];
  if (typeof t !== 'string' || !t.trim()) { errs.push(`${u.k} : manquante`); continue; }
  if (ph(t) !== ph(u.fr)) errs.push(`${u.k} : placeholders ${ph(u.fr)} ≠ ${ph(t)}`);
  if (tags(t) !== tags(u.fr)) errs.push(`${u.k} : balises HTML différentes`);
  if (!/^\s[:;!?]/.test(u.fr) && lead(t) !== lead(u.fr)) errs.push(`${u.k} : espace de début différent (${JSON.stringify(lead(u.fr))} attendu)`);
  if (trail(t) !== trail(u.fr)) errs.push(`${u.k} : espace de fin différent (${JSON.stringify(trail(u.fr))} attendu)`);
  if ((u.fr.match(/\n/g) || []).length !== (t.match(/\n/g) || []).length && u.fr.length < 400) errs.push(`${u.k} : nombre de retours à la ligne différent`);
}
const extra = Object.keys(out).filter(k => !chunk.some(u => u.k === k));
if (extra.length) errs.push('clés inconnues : ' + extra.slice(0, 10).join(', '));
console.log(errs.length ? errs.join('\n') : `OK · ${chunk.length} entrées`);
process.exit(errs.length ? 1 : 0);
