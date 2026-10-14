/* Contrôle d'un lexique de thème : node tools/check-theme.js <fichier.json>
   Vérifie la structure, les collisions avec le vocabulaire de l'application,
   les longueurs, puis affiche un rendu d'exemple dans les trois langues. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const file = process.argv[2];
const th = JSON.parse(fs.readFileSync(file, 'utf8'));

const engine = ['js/35-theme-engine.js', 'js/36-themes.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const ctx = {};
new Function('exports', engine + '\nexports.frRules = frRules; exports.enRules = enRules; exports.esRules = esRules; exports.__themeText = __themeText;')(ctx);
const BUILD = { fr: ctx.frRules, en: ctx.enRules, es: ctx.esRules };

const REQ = ['day', 'days', 'act', 'acts', 'draw', 'rest', 'kickoff', 'fulltime', 'hattrick', 'lineup', 'window', 'cup', 'role1', 'role2', 'role3', 'role4', 'coach', 'kindField', 'titles', 'divisions'];
/* mots déjà utilisés par l'application pour autre chose : interdits comme cible */
const RESERVED = {
  fr: ['quête', 'quêtes', 'objectif', 'objectifs', 'routine', 'habitude', 'projet', 'domaine', 'saison', 'semaine', 'mois', 'bilan', 'niveau', 'division', 'trophée', 'récompense', 'focus', 'moodboard', 'réseau', 'savoir', 'score', 'série', 'jour', 'journée'],
  en: ['quest', 'quests', 'goal', 'goals', 'routine', 'habit', 'project', 'area', 'season', 'week', 'month', 'review', 'level', 'division', 'trophy', 'reward', 'focus', 'moodboard', 'network', 'knowledge', 'score', 'streak', 'day'],
  es: ['misión', 'misiones', 'objetivo', 'objetivos', 'rutina', 'hábito', 'proyecto', 'área', 'temporada', 'semana', 'mes', 'balance', 'nivel', 'división', 'trofeo', 'recompensa', 'foco', 'moodboard', 'red', 'saber', 'puntuación', 'racha', 'día']
};
const MAXLEN = { day: 14, days: 15, act: 14, acts: 15, draw: 14, rest: 16, fulltime: 18, lineup: 16, cup: 16, role1: 18, role2: 16, role3: 16, role4: 16 };
const errs = [], warns = [];
if (!th.id || !/^[a-z][a-z0-9]{1,11}$/.test(th.id)) errs.push('id manquant ou invalide');
if (!th.name || !th.sub) errs.push('name/sub manquants');
if (!th.pal || !['accent', 'reward', 'board'].every(k => /^#[0-9a-fA-F]{6}$/.test(th.pal[k] || ''))) errs.push('palette incomplète (accent, reward, board en #rrggbb)');
for (const lang of ['fr', 'en', 'es']) {
  const g = (th.w || {})[lang];
  if (!g) { errs.push('lexique ' + lang + ' manquant'); continue; }
  REQ.forEach(k => { if (!g[k] || (Array.isArray(g[k]) && !g[k].length)) errs.push(`${lang}.${k} manquant`); });
  if (g.titles && g.titles.length !== 9) errs.push(`${lang}.titles doit contenir 9 titres (${g.titles.length})`);
  if (g.divisions && g.divisions.length !== 6) errs.push(`${lang}.divisions doit contenir 6 paliers (${g.divisions.length})`);
  Object.keys(MAXLEN).forEach(k => { if (typeof g[k] === 'string' && g[k].length > MAXLEN[k]) warns.push(`${lang}.${k} long (${g[k].length}) : « ${g[k]} »`); });
  (RESERVED[lang] || []).forEach(w => {
    Object.keys(g).forEach(k => {
      const v = g[k];
      if (typeof v === 'string' && v.toLowerCase().split(/[\s’']/).includes(w)) errs.push(`${lang}.${k} utilise « ${w} », déjà pris par l'application`);
    });
  });
  if (g.day === g.act) errs.push(lang + ' : day et act identiques');
  if (g.dayF !== undefined && typeof g.dayF !== 'boolean') errs.push(lang + '.dayF doit être true/false');
}
if (errs.length) { console.log('ERREURS\n' + errs.join('\n')); if (warns.length) console.log('\nAVERTISSEMENTS\n' + warns.join('\n')); process.exit(1); }

/* rendu d'exemple */
const SAMPLES = {
  fr: ['Match du jour', '3 Coups du jour', 'Coup d’envoi', 'Full Time', 'Coup du chapeau', 'Trêve : récupère. Le match ne compte pas.', 'Meilleur match : ', 'matchs joués', 'Match clôturé. Prépare les coups de demain.', 'Compo', 'Mercato', 'Capitaine', 'Le coup d’envoi se donne le jour du match.', 'Tu restes sur {0} matchs sans défaite.'],
  en: ['Today’s match', '3 Plays of the day', 'Kick-off', 'Full Time', 'Hat-trick', 'Break: recover. The match does not count.', 'Best match: ', 'matches played', 'Line-up', 'Transfer window', 'Captain'],
  es: ['Partido del día', '3 Jugadas del día', 'Saque inicial', 'Final del partido', 'Triplete', 'Descanso: recupera. El partido no cuenta.', 'Mejor partido: ', 'partidos jugados', 'Alineación', 'Mercado de fichajes', 'Capitán']
};
for (const lang of ['fr', 'en', 'es']) {
  const rules = BUILD[lang](th.w[lang]);
  console.log('\n=== ' + lang + ' (' + rules.length + ' règles)');
  SAMPLES[lang].forEach(s => console.log('  ' + s + '  →  ' + ctx.__themeText(s, rules)));
  console.log('  titres : ' + th.w[lang].titles.join(' · '));
  console.log('  divisions : ' + th.w[lang].divisions.join(' · '));
}
console.log(warns.length ? '\nAVERTISSEMENTS\n' + warns.join('\n') : '\nOK · structure valide');
