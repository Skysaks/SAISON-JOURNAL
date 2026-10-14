/*nt-file*/
/* =========================================================
   Moteur de thèmes : le vocabulaire affiché est réécrit à l'exécution,
   à partir d'un lexique par thème et par langue. Le code, les données
   et les identifiants ne changent jamais : seuls les textes visibles.
   ========================================================= */

/* ---------- morphologie minimale (accords) */
const ADJ_FR = /*nt*/ {
  normal: ['normal', 'normale', 'normaux', 'normales'],
  dernier: ['dernier', 'dernière', 'derniers', 'dernières'],
  premier: ['premier', 'première', 'premiers', 'premières'],
  meilleur: ['meilleur', 'meilleure', 'meilleurs', 'meilleures'],
  prochain: ['prochain', 'prochaine', 'prochains', 'prochaines'],
  aucun: ['aucun', 'aucune', 'aucuns', 'aucunes'],
  tout: ['tout', 'toute', 'tous', 'toutes'],
  ce: ['ce', 'cette', 'ces', 'ces'],
  le: ['le', 'la', 'les', 'les'],
  un: ['un', 'une', 'des', 'des'],
  du: ['du', 'de la', 'des', 'des'],
  au: ['au', 'à la', 'aux', 'aux'],
  pire: ['pire', 'pire', 'pires', 'pires'],
  neutre: ['neutre', 'neutre', 'neutres', 'neutres'],
  rouvert: ['rouvert', 'rouverte', 'rouverts', 'rouvertes']
};
const ADJ_ES = /*nt*/ {
  normal: ['normal', 'normal', 'normales', 'normales'],
  último: ['último', 'última', 'últimos', 'últimas'],
  primer: ['primer', 'primera', 'primeros', 'primeras'],
  mejor: ['mejor', 'mejor', 'mejores', 'mejores'],
  peor: ['peor', 'peor', 'peores', 'peores'],
  próximo: ['próximo', 'próxima', 'próximos', 'próximas'],
  ningún: ['ningún', 'ninguna', 'ningunos', 'ningunas'],
  todo: ['todo', 'toda', 'todos', 'todas'],
  este: ['este', 'esta', 'estos', 'estas'],
  el: ['el', 'la', 'los', 'las'],
  un: ['un', 'una', 'unos', 'unas'],
  del: ['del', 'de la', 'de los', 'de las'],
  neutro: ['neutro', 'neutra', 'neutros', 'neutras'],
  reabierto: ['reabierto', 'reabierta', 'reabiertos', 'reabiertas']
};
/* participes réguliers : +e au féminin, +s au pluriel (fr) ; -o/-a/-os/-as (es) */
function frAdj(w, fem, plu) {
  const t = ADJ_FR[w];
  if (t) return t[(fem ? 1 : 0) + (plu ? 2 : 0)];
  return w + (fem ? 'e' : '') + (plu ? 's' : '');
}
function esAdj(w, fem, plu) {
  const t = ADJ_ES[w];
  if (t) return t[(fem ? 1 : 0) + (plu ? 2 : 0)];
  const base = fem && /o$/.test(w) ? w.slice(0, -1) + 'a' : w;
  return base + (plu ? (/[aeiouáéíóú]$/.test(base) ? 's' : 'es') : '');
}
const cap1u = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* ---------- application des règles au texte visible seulement */
const TH_ATTRS = /*nt*/ /(\s(?:title|aria-label|placeholder|alt|data-tip|label)=")([^"]*)(")/g;
function themeReplace(txt, rules) {
  let out = txt;
  for (let i = 0; i < rules.length; i++) out = out.replace(rules[i][0], rules[i][1]);
  return out;
}
/* réécrit le texte hors balises, plus la valeur des attributs visibles */
function __themeText(s, rules) {
  if (!s || !rules || !rules.length) return s;
  if (s.indexOf('<') < 0) return themeReplace(s, rules);
  let out = '';
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) { out += themeReplace(s.slice(i), rules); break; }
    out += themeReplace(s.slice(i, lt), rules);
    const gt = s.indexOf('>', lt);
    if (gt < 0) { out += s.slice(lt); break; }
    out += s.slice(lt, gt + 1).replace(TH_ATTRS, (m, a, v, b) => a + themeReplace(v, rules) + b);
    i = gt + 1;
  }
  return out;
}

/* titres et divisions du texte de base (football), par langue */
const BASE_TITLES = /*nt*/ {
  fr: ["Ballon d'Or", 'Légende du club', 'International', 'Capitaine', 'Cadre du vestiaire', 'Titulaire', 'Groupe pro', 'Équipe réserve', 'Centre de formation'],
  en: ['Ballon d’Or', 'Club legend', 'International', 'Captain', 'Dressing room leader', 'Starter', 'First-team squad', 'Reserve team', 'Academy'],
  es: ['Balón de Oro', 'Leyenda del club', 'Internacional', 'Capitán', 'Líder del vestuario', 'Titular', 'Plantilla profesional', 'Equipo filial', 'Cantera']
};
const BASE_DIVISIONS = /*nt*/ {
  fr: ['Élite', 'Ligue 1', 'Ligue 2', 'National', 'Régional', 'District'],
  en: ['Elite', 'Ligue 1', 'Ligue 2', 'National', 'Regional', 'District'],
  es: ['Élite', 'Liga 1', 'Liga 2', 'Nacional', 'Regional', 'Distrito']
};
function listRules(lang, g) {
  const R = [];
  const T = BASE_TITLES[lang] || BASE_TITLES.fr, DV = BASE_DIVISIONS[lang] || BASE_DIVISIONS.fr;
  if (Array.isArray(g.titles) && g.titles.length === 9) {
    const t = g.titles.slice();
    if (g.role1) t[3] = cap1u(g.role1);          /* le titre de rang 4 partage le mot du rôle principal */
    if (g.role2) t[5] = cap1u(g.role2);
    T.forEach((src, i) => { if (t[i] && t[i] !== src) R.push(lit(src, t[i])); });
  }
  if (Array.isArray(g.divisions) && g.divisions.length === 6) DV.forEach((src, i) => { if (g.divisions[i] && g.divisions[i] !== src) R.push(lit(src, g.divisions[i])); });
  return R;
}

/* ---------- construction des règles à partir du lexique */
const rx = (p, flags) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags || 'g');
/* remplacement qui garde la majuscule initiale de la source */
function pair(from, to) {
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = esc.replace(/^(.)/, (m, c) => '[' + c.toLowerCase() + c.toUpperCase() + ']');
  const re = new RegExp('(^|[^\\p{L}\\p{N}\\-])' + body + '(?![\\p{L}\\p{N}])', 'gu');
  const allCaps = to === to.toUpperCase() && to !== to.toLowerCase();
  const lo = allCaps ? to : to.charAt(0).toLowerCase() + to.slice(1);
  return [re, (m, pre) => {
    const hit = m.slice(pre.length);
    return pre + (!allCaps && hit[0] === hit[0].toUpperCase() && hit[0] !== hit[0].toLowerCase() ? cap1u(to) : lo);
  }];
}
/* élision française : le/la/de/que devant voyelle */
const VOW = /^[aeiouâàéèêîïôûùüh]/i;
function frLe(w, fem) { return VOW.test(w) ? 'l’' + w : (fem ? 'la ' : 'le ') + w; }
function frDu(w, fem) { return VOW.test(w) ? 'de l’' + w : (fem ? 'de la ' : 'du ') + w; }
function frAu(w, fem) { return VOW.test(w) ? 'à l’' + w : (fem ? 'à la ' : 'au ') + w; }
function frUn(w, fem) { return (fem ? 'une ' : 'un ') + w; }
function frCe(w, fem) { return fem ? 'cette ' + w : (VOW.test(w) ? 'cet ' + w : 'ce ' + w); }
/* remplacement littéral (phrase entière, casse respectée telle quelle) */
function lit(from, to) { return [rx(from), to]; }

function frRules(g) {
  const R = listRules('fr', g);
  const D = g.day, Dp = g.days, df = !!g.dayF;
  const A = g.act, Ap = g.acts, af = !!g.actF;
  const adj = (w, plu, fem) => frAdj(w, fem === undefined ? df : fem, plu);
  /* 1. expressions figées du thème (avant tout le reste) */
  (g.idioms || []).forEach(([a, b]) => R.push(lit(a, b)));
  /* 1 bis. phrases d'accueil : le verbe football n'a pas de sens ailleurs */
  if (D) {
    const monPremier = df ? 'ta première ' : 'ton premier ';
    R.push(lit('Siffle ton premier Full Time', 'Clôture ' + monPremier + D));
    R.push(lit('Donne ton premier coup d’envoi', 'Ouvre ' + monPremier + D));
    if (g.role1) R.push(lit('Nomme ton capitaine', 'Désigne ' + (g.role1F ? 'ta ' : 'ton ') + g.role1));
  }
  /* 2. résultats et libellés fixes */
  if (g.draw) { R.push(lit('Match nul', g.draw)); R.push(lit('match nul', g.draw.toLowerCase())); }
  if (g.win) R.push(pair('Victoire', g.win));
  if (g.loss) R.push(pair('Défaite', g.loss));
  if (g.forfeit) R.push(pair('Forfait', g.forfeit));
  if (g.rest) { R.push(pair('Trêves', g.rests || g.rest + 's')); R.push(pair('Trêve', g.rest)); }
  if (g.kickoff) {
    const kf = !!g.kickoffF;
    R.push(lit('le coup d’envoi', frLe(g.kickoff, kf))); R.push(lit('Le coup d’envoi', cap1u(frLe(g.kickoff, kf))));
    R.push(lit('du coup d’envoi', frDu(g.kickoff, kf))); R.push(lit('un coup d’envoi', frUn(g.kickoff, kf)));
    R.push(lit('coup d’envoi', g.kickoff)); R.push(lit('Coup d’envoi', cap1u(g.kickoff))); R.push(lit("coup d'envoi", g.kickoff));
  }
  if (g.fulltime) { R.push(lit('Full Time', g.fulltime)); R.push(lit('coup de sifflet final', g.finalWhistle || g.fulltime.toLowerCase())); R.push(lit('Coup de sifflet final', cap1u(g.finalWhistle || g.fulltime))); }
  if (g.hattrick) { R.push(lit('coup du chapeau', g.hattrick)); R.push(lit('Coup du chapeau', cap1u(g.hattrick))); }
  /* 3. le mot « coup » (action du jour) */
  if (A) {
    R.push(lit('3 Coups du jour', '3 ' + cap1u(Ap) + ' du jour'));
    R.push(lit('Coups du jour', cap1u(Ap) + ' du jour'));
    R.push(lit('coups du jour', Ap + ' du jour'));
    R.push(lit('Coup du jour', cap1u(A) + ' du jour'));
    R.push(lit('coup du jour', A + ' du jour'));
    R.push(lit('après coup', g.afterwards || 'après coup'));
    R.push(lit('Coups requis', cap1u(Ap) + ' requis' + (af ? 'es' : '')));
    R.push(lit('coups requis', Ap + ' requis' + (af ? 'es' : '')));
    R.push(lit('coup requis', A + ' requis' + (af ? 'e' : '')));
    R.push(lit('les 3 coups', 'les 3 ' + Ap)); R.push(lit('Les 3 coups', 'Les 3 ' + Ap));
    R.push(lit('3 coups', '3 ' + Ap));
    R.push(lit('aucun coup', adj('aucun', false, af) + ' ' + A));
    R.push(lit('Aucun coup', cap1u(adj('aucun', false, af)) + ' ' + A));
    R.push(lit('1 coup', '1 ' + A));
    [['le', frLe], ['du', frDu], ['au', frAu], ['un', frUn], ['ce', frCe]].forEach(([w, fn]) => {
      const t = fn(A, af);
      R.push(lit(frAdj(w, false, false) + ' coup', t));
      R.push(lit(cap1u(frAdj(w, false, false)) + ' coup', cap1u(t)));
    });
    ['terminé', 'fait', 'joué', 'choisi', 'réussi', 'requis', 'ajouté', 'retiré', 'bonus'].forEach(w => {
      const sg = w === 'bonus' ? 'bonus' : frAdj(w, af, false), pl = w === 'bonus' ? 'bonus' : frAdj(w, af, true);
      R.push(lit('coups ' + (w === 'bonus' ? 'bonus' : frAdj(w, false, true)), Ap + ' ' + pl));
      R.push(lit('coup ' + w, A + ' ' + sg));
      R.push(lit('Coups ' + cap1u(w === 'bonus' ? 'bonus' : frAdj(w, false, true)), cap1u(Ap) + ' ' + pl));
      R.push(lit('Coup ' + cap1u(w), cap1u(A) + ' ' + sg));
    });
    ['dernier', 'prochain', 'premier', 'meilleur'].forEach(w => {
      R.push(lit(frAdj(w, false, false) + ' coup', frAdj(w, af, false) + ' ' + A));
      R.push(lit(cap1u(frAdj(w, false, false)) + ' coup', cap1u(frAdj(w, af, false)) + ' ' + A));
      R.push(lit(frAdj(w, false, true) + ' coups', frAdj(w, af, true) + ' ' + Ap));
    });
    R.push(pair('coups', Ap));
    R.push(pair('coup', A));
  }
  /* 4. le mot « match » (unité de journée) */
  if (D) {
    ['clôturé', 'figé', 'joué', 'terminé', 'corrigé', 'passé', 'rouvert', 'neutre', 'normal', 'observé', 'disputé', 'enregistré', 'annulé', 'gagné', 'perdu'].forEach(w => {
      R.push(lit('matchs ' + frAdj(w, false, true), Dp + ' ' + adj(w, true)));
      R.push(lit('match ' + w, D + ' ' + adj(w, false)));
      R.push(lit('Matchs ' + frAdj(w, false, true), cap1u(Dp) + ' ' + adj(w, true)));
      R.push(lit('Match ' + w, cap1u(D) + ' ' + adj(w, false)));
    });
    [['le', frLe], ['du', frDu], ['au', frAu], ['un', frUn], ['ce', frCe]].forEach(([w, fn]) => {
      const t = fn(D, df);
      R.push(lit(frAdj(w, false, false) + ' match', t));
      R.push(lit(cap1u(frAdj(w, false, false)) + ' match', cap1u(t)));
    });
    R.push(lit('aucun match', adj('aucun', false) + ' ' + D));
    R.push(lit('Aucun match', cap1u(adj('aucun', false)) + ' ' + D));
    R.push(lit('Avant-match', g.preDay || ('Avant ' + frLe(D, df))));
    R.push(lit('avant-match', g.preDay ? g.preDay.toLowerCase() : ('avant ' + frLe(D, df))));
    R.push(lit('d’après-match', g.postDay || ('d’après ' + D)));
    R.push(lit("d'après-match", g.postDay || ('d’après ' + D)));
    R.push(lit('après-match', (g.postDay || ('après ' + D)).replace(/^d’/, '')));
    ['dernier', 'prochain', 'meilleur', 'premier'].forEach(w => {
      R.push(lit(frAdj(w, false, true) + ' matchs', adj(w, true) + ' ' + Dp));
      R.push(lit(frAdj(w, false, false) + ' match', adj(w, false) + ' ' + D));
      R.push(lit(cap1u(frAdj(w, false, true)) + ' matchs', cap1u(adj(w, true)) + ' ' + Dp));
      R.push(lit(cap1u(frAdj(w, false, false)) + ' match', cap1u(adj(w, false)) + ' ' + D));
    });
    R.push(lit('Pire match', (df ? 'Pire ' : 'Pire ') + D));
    R.push(lit('les matchs', 'les ' + Dp)); R.push(lit('Les matchs', 'Les ' + Dp));
    R.push(lit('des matchs', 'des ' + Dp)); R.push(lit('les 30 derniers matchs', 'les 30 ' + adj('dernier', true) + ' ' + Dp));
    R.push(pair('matchs', Dp));
    R.push(pair('match', D));
  }
  /* 5. compo, mercato, rôles, cups, coach */
  const one = (from, to) => { if (to) { R.push(pair(from, to)); } };
  one('Compo', g.lineup); one('compo', g.lineup);
  one('Mercato', g.window); one('mercato', g.window);
  one('Capitaine', g.role1); one('capitaine', g.role1);
  one('Titulaire', g.role2); one('titulaire', g.role2);
  one('Titulaires', g.role2s || g.role2 + 's'); one('titulaires', g.role2s || g.role2 + 's');
  one('Banc', g.role3); one('banc', g.role3);
  one('Tribune', g.role4); one('tribune', g.role4);
  one('Brassard', g.armband); one('brassard', g.armband);
  if (g.cup) {
    const cf = !!g.cupF;
    ['remporté', 'gagné', 'terminé'].forEach(w => { R.push(lit('Cup ' + frAdj(w, true, false), cap1u(g.cup) + ' ' + frAdj(w, cf, false))); R.push(lit('cup ' + frAdj(w, true, false), g.cup + ' ' + frAdj(w, cf, false))); });
    R.push(lit('une Cup', frUn(g.cup, cf))); R.push(lit('d’une Cup', 'd’' + frUn(g.cup, cf))); R.push(lit('la Cup', frLe(g.cup, cf)));
    R.push(lit('Nouvelle Cup', (cf ? 'Nouvelle ' : 'Nouveau ') + g.cup));
  }
  one('Cup', g.cup); one('Cups', g.cups || g.cup + 's');
  one('Poste', g.slot); one('poste', g.slot); one('Postes', g.slots || g.slot);
  one('Club', g.club); one('club', g.club); one('Clubs', g.clubs || g.club + 's'); one('clubs', g.clubs || g.club + 's');
  one('Coach', g.coach); one('coach', g.coach);
  one('Manager', g.manager); one('manager', g.manager);
  one('Terrain', g.kindField); one('terrain', g.kindField ? g.kindField.toLowerCase() : null);
  one('Forme', g.form); one('forme', g.form ? g.form.toLowerCase() : null);
  return R;
}

function enRules(g) {
  const R = listRules('en', g);
  (g.idioms || []).forEach(([a, b]) => R.push(lit(a, b)));
  const D = g.day, Dp = g.days, A = g.act, Ap = g.acts;
  if (D) {
    R.push(lit('Complete your first Full Time', 'Close your first ' + D));
    R.push(lit('Kick off your first match', 'Open your first ' + D));
    if (g.role1) R.push(lit('Name your captain', 'Name your ' + g.role1));
  }
  if (g.draw) { R.push(lit('Draw', cap1u(g.draw))); R.push(lit('draw', g.draw)); }
  if (g.win) R.push(pair('Win', g.win));
  if (g.loss) R.push(pair('Loss', g.loss));
  if (g.forfeit) R.push(pair('Forfeit', g.forfeit));
  if (g.rest) { R.push(pair('Break', g.rest)); R.push(pair('Breaks', g.rests || g.rest + 's')); }
  if (g.kickoff) { R.push(lit('kick-off', g.kickoff)); R.push(lit('Kick-off', cap1u(g.kickoff))); R.push(lit('kickoff', g.kickoff)); R.push(lit('Kickoff', cap1u(g.kickoff))); R.push(lit('kick off', g.kickoffVerb || g.kickoff)); }
  if (g.fulltime) { R.push(lit('Full Time', g.fulltime)); R.push(lit('final whistle', g.finalWhistle || g.fulltime.toLowerCase())); R.push(lit('Final whistle', cap1u(g.finalWhistle || g.fulltime))); }
  if (g.hattrick) { R.push(lit('hat-trick', g.hattrick)); R.push(lit('Hat-trick', cap1u(g.hattrick))); }
  if (A) {
    R.push(lit('3 Plays of the day', '3 ' + cap1u(Ap) + ' of the day'));
    R.push(lit('Plays of the day', cap1u(Ap) + ' of the day'));
    R.push(lit('plays of the day', Ap + ' of the day'));
    R.push(lit('Play of the day', cap1u(A) + ' of the day'));
    R.push(lit('play of the day', A + ' of the day'));
    R.push(pair('plays', Ap));
    R.push(pair('play', A));
  }
  if (D) {
    R.push(lit('Pre-match', g.preDay || 'Before the ' + D)); R.push(lit('pre-match', (g.preDay || 'before the ' + D).toLowerCase()));
    R.push(lit('Post-match', g.postDay || 'Post-' + D)); R.push(lit('post-match', (g.postDay || 'post-' + D).toLowerCase()));
    R.push(lit('matchday', g.dayNum || D + ' day'));
    R.push(pair('matches', Dp));
    R.push(pair('match', D));
  }
  const one = (from, to) => { if (to) R.push(pair(from, to)); };
  one('Line-up', g.lineup); one('line-up', g.lineup);
  one('Transfer window', g.window); one('transfer window', g.window);
  one('Captain', g.role1); one('captain', g.role1);
  one('Starter', g.role2); one('starter', g.role2); one('Starters', g.role2s || g.role2 + 's'); one('starters', g.role2s || g.role2 + 's');
  one('Bench', g.role3); one('bench', g.role3);
  one('Stands', g.role4); one('stands', g.role4);
  one('Armband', g.armband); one('armband', g.armband);
  one('Cup', g.cup); one('Cups', g.cups || g.cup + 's');
  one('Coach', g.coach); one('coach', g.coach);
  one('Manager', g.manager); one('manager', g.manager);
  one('Field', g.kindField); one('field', g.kindField ? g.kindField.toLowerCase() : null);
  one('Form', g.form); one('form', g.form ? g.form.toLowerCase() : null);
  return R;
}

function esRules(g) {
  const R = listRules('es', g);
  (g.idioms || []).forEach(([a, b]) => R.push(lit(a, b)));
  const D = g.day, Dp = g.days, df = !!g.dayF, A = g.act, Ap = g.acts, af = !!g.actF;
  const adj = (w, plu, fem) => esAdj(w, fem === undefined ? df : fem, plu);
  if (D) {
    const miPrimer = df ? 'tu primera ' : 'tu primer ';
    R.push(lit('Pita el final de tu primer partido', 'Cierra ' + miPrimer + D));
    R.push(lit('Haz tu primer saque inicial', 'Abre ' + miPrimer + D));
    if (g.role1) R.push(lit('Nombra a tu capitán', 'Designa ' + (g.role1F ? 'tu ' : 'tu ') + g.role1));
  }
  if (g.draw) { R.push(pair('Empate', cap1u(g.draw))); }
  if (g.win) R.push(pair('Victoria', g.win));
  if (g.loss) R.push(pair('Derrota', g.loss));
  if (g.forfeit) R.push(pair('Incomparecencia', g.forfeit));
  if (g.rest) { R.push(pair('Descanso', g.rest)); R.push(pair('Descansos', g.rests || g.rest + 's')); }
  if (g.kickoff) { R.push(lit('saque inicial', g.kickoff)); R.push(lit('Saque inicial', cap1u(g.kickoff))); }
  if (g.fulltime) { R.push(lit('Final del partido', cap1u(g.fulltime))); R.push(lit('final del partido', g.fulltime)); R.push(lit('pitido final', g.finalWhistle || g.fulltime)); R.push(lit('Pitido final', cap1u(g.finalWhistle || g.fulltime))); }
  if (g.hattrick) { R.push(lit('triplete', g.hattrick)); R.push(lit('Triplete', cap1u(g.hattrick))); }
  if (A) {
    R.push(lit('3 Jugadas del día', '3 ' + cap1u(Ap) + ' del día'));
    R.push(lit('Jugadas del día', cap1u(Ap) + ' del día'));
    R.push(lit('jugadas del día', Ap + ' del día'));
    R.push(lit('Jugada del día', cap1u(A) + ' del día'));
    R.push(lit('jugada del día', A + ' del día'));
    ['requerido', 'hecho', 'completado', 'terminado', 'elegido', 'jugado', 'conseguido', 'pendiente'].forEach(w => {
      R.push(lit('jugadas ' + esAdj(w, true, true), Ap + ' ' + esAdj(w, af, true)));
      R.push(lit('jugada ' + esAdj(w, true, false), A + ' ' + esAdj(w, af, false)));
      R.push(lit('Jugadas ' + cap1u(esAdj(w, true, true)), cap1u(Ap) + ' ' + esAdj(w, af, true)));
      R.push(lit('Jugada ' + cap1u(esAdj(w, true, false)), cap1u(A) + ' ' + esAdj(w, af, false)));
    });
    [['el', false], ['la', true], ['un', false], ['una', true], ['este', false], ['esta', true], ['del', false], ['de la', true]].forEach(([w, fem]) => {
      const src = fem ? (w === 'la' ? 'la jugada' : w === 'una' ? 'una jugada' : w === 'esta' ? 'esta jugada' : 'de la jugada') : null;
      if (!src) return;
      const key = w === 'la' ? 'el' : w === 'una' ? 'un' : w === 'esta' ? 'este' : 'del';
      const t = (af ? w : esAdj(key, false, false)) + ' ' + A;
      R.push(lit(src, t)); R.push(lit(cap1u(src), cap1u(t)));
    });
    ['último', 'próximo', 'primer', 'mejor'].forEach(w => {
      R.push(lit(esAdj(w, true, false) + ' jugada', esAdj(w, af, false) + ' ' + A));
      R.push(lit(esAdj(w, true, true) + ' jugadas', esAdj(w, af, true) + ' ' + Ap));
    });
    R.push(lit('3 jugadas', '3 ' + Ap));
    R.push(pair('jugadas', Ap));
    R.push(pair('jugada', A));
    if (!af) {                      /* l'action du thème est masculine : corrige les articles laissés au féminin */
      [['Las ', 'Los '], ['las ', 'los '], ['Unas ', 'Unos '], ['unas ', 'unos '], ['estas ', 'estos '], ['Estas ', 'Estos ']].forEach(([a, b]) => R.push(lit(a + Ap, b + Ap)));
      [['La ', 'El '], ['la ', 'el '], ['una ', 'un '], ['Una ', 'Un '], ['esta ', 'este '], ['Esta ', 'Este ']].forEach(([a, b]) => R.push(lit(a + A, b + A)));
    }
    R.push(pair('jugadas', Ap));
    R.push(pair('jugada', A));
  }
  if (D) {
    ['cerrado', 'bloqueado', 'jugado', 'terminado', 'corregido', 'pasado', 'reabierto', 'neutro', 'normal', 'seguido', 'disputado', 'perdido', 'ganado'].forEach(w => {
      R.push(lit('partidos ' + esAdj(w, false, true), Dp + ' ' + adj(w, true)));
      R.push(lit('partido ' + esAdj(w, false, false), D + ' ' + adj(w, false)));
      R.push(lit('Partidos ' + esAdj(w, false, true), cap1u(Dp) + ' ' + adj(w, true)));
      R.push(lit('Partido ' + esAdj(w, false, false), cap1u(D) + ' ' + adj(w, false)));
    });
    [['el', false], ['un', false], ['del', false], ['este', false], ['ningún', false]].forEach(([w]) => {
      R.push(lit(esAdj(w, false, false) + ' partido', adj(w, false) + ' ' + D));
      R.push(lit(cap1u(esAdj(w, false, false)) + ' partido', cap1u(adj(w, false)) + ' ' + D));
    });
    ['último', 'próximo', 'mejor', 'peor', 'primer'].forEach(w => {
      R.push(lit(esAdj(w, false, true) + ' partidos', adj(w, true) + ' ' + Dp));
      R.push(lit(esAdj(w, false, false) + ' partido', adj(w, false) + ' ' + D));
      R.push(lit(cap1u(esAdj(w, false, true)) + ' partidos', cap1u(adj(w, true)) + ' ' + Dp));
      R.push(lit(cap1u(esAdj(w, false, false)) + ' partido', cap1u(adj(w, false)) + ' ' + D));
    });
    R.push(lit('post-partido', g.postDay || 'post-' + D));
    R.push(lit('Pre-partido', g.preDay || 'Antes de ' + (df ? 'la ' : 'el ') + D));
    R.push(lit('previa del partido', g.preDay ? g.preDay.toLowerCase() : 'previa de ' + (df ? 'la ' : 'el ') + D));
    R.push(lit('los partidos', (df ? 'las ' : 'los ') + Dp)); R.push(lit('Los partidos', (df ? 'Las ' : 'Los ') + Dp));
    R.push(lit('de los partidos', (df ? 'de las ' : 'de los ') + Dp));
    R.push(pair('partidos', Dp));
    R.push(pair('partido', D));
  }
  const one = (from, to) => { if (to) R.push(pair(from, to)); };
  one('Alineación', g.lineup); one('alineación', g.lineup);
  one('Mercado de fichajes', g.window); one('mercado de fichajes', g.window);
  one('Ventana de fichajes', g.window); one('ventana de fichajes', g.window);
  one('Capitán', g.role1); one('capitán', g.role1);
  one('Titular', g.role2); one('titular', g.role2); one('Titulares', g.role2s || g.role2 + 'es'); one('titulares', g.role2s || g.role2 + 'es');
  one('Banquillo', g.role3); one('banquillo', g.role3);
  one('Grada', g.role4); one('grada', g.role4);
  one('Brazalete', g.armband); one('brazalete', g.armband);
  one('Copa', g.cup); one('Copas', g.cups || g.cup + 's'); one('copa', g.cup); one('copas', g.cups || g.cup + 's');
  one('Entrenador', g.coach); one('entrenador', g.coach);
  one('Mánager', g.manager); one('mánager', g.manager);
  one('Campo', g.kindField); one('campo', g.kindField ? g.kindField.toLowerCase() : null);
  one('Forma', g.form); one('forma', g.form ? g.form.toLowerCase() : null);
  return R;
}

const RULE_BUILDERS = /*nt*/ { fr: frRules, en: enRules, es: esRules };
let _themeRulesKey = null;
function themeRules(id, lang) {
  const t = THEMES[id];
  if (!t || id === 'foot') return [];
  const g = t.w && t.w[lang];
  if (!g) return [];
  return (RULE_BUILDERS[lang] || frRules)(g);
}
/*nt-end*/
