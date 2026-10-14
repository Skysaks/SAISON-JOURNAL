/* =========================================================
   Choix du thème : grille de cartes (nom, vocabulaire, couleurs).
   Le thème se choisit à la création de la saison et se change
   ensuite dans Réglages › Apparence.
   ========================================================= */
function themeGrid(cur) {
  return `<div class="th-grid">${THEME_IDS.map(id => {
    const t = THEMES[id];
    const on = id === cur;
    const nm = (t.names && t.names[LANG]) || t.name;
    const sub = (t.subs && t.subs[LANG]) || '';
    return `<button type="button" class="th-card ${on ? 'on' : ''}" aria-pressed="${on}" data-a="setTheme" data-v="${id}">
      <span class="th-ic" style="background:${esc(t.pal.board)};color:${esc(t.pal.accent)}">${ICON[t.icon] || ICON.ball}</span>
      <span class="th-txt"><b>${esc(nm)}</b><span>${esc(sub)}</span></span>
      <span class="pal-sw" aria-hidden="true"><i style="background:${esc(t.pal.board)}"></i><i style="background:${esc(t.pal.accent)}"></i><i style="background:${esc(t.pal.reward)}"></i></span>
    </button>`;
  }).join('')}</div>`;
}
function themeCard() {
  if (THEME_ID !== 'foot') return '';
  return sectionCard('Univers', `<p class="small muted">Le vocabulaire de tout le tableau de bord suit le thème choisi : la journée, les 3 actions, les titres de niveau, les divisions. Tes données ne changent jamais.</p>
    ${themeGrid(resolveTheme())}`, thName(), '', 'themes');
}
ACT.setTheme = b => {
  const id = b.dataset.v;
  if (!THEMES[id] || THEME_ID !== 'foot') return;
  if (id === resolveTheme()) return;
  saveSettings(s => { s.theme = id; }, `Univers : ${THEMES[id].name}`);
  applyVocab();
  applyLook();
  toast(`Univers : ${thName()}`);
  render();
};
