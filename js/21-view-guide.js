/* =========================================================
   Guide intégré : le mode d'emploi, avec les valeurs réelles des réglages
   (le contenu propre à chaque thème est dans 21-guide.<thème>.js)
   ========================================================= */
VIEWS.guide = () => {
  const g = GUIDE();
  return `
  <div class="viewhead"><div class="grow"><div class="eyebrow">Mode d’emploi</div><h1>Guide</h1></div><button type="button" class="btn btn-sm" data-a="go" data-tab="match" data-today="1">Retour au jeu</button></div>
  <div class="chips guide-toc">${g.map((s, i) => `<button type="button" class="chipbtn sm" data-a="scrollTo" data-id="guide-${i}">${s[0]}</button>`).join('')}</div>
  <div class="guide">${g.map((s, i) => `<section class="card" id="guide-${i}"><h2 class="h3">${s[0]}</h2><div class="guide-b">${s[1]}</div></section>`).join('')}</div>`;
};
