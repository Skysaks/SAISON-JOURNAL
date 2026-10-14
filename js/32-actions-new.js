/* =========================================================
   Actions : langue, couleurs, premiers pas
   ========================================================= */
ACT.setLang = b => {
  const v = b.dataset.v;
  if (v !== 'auto' && !LANG_NAMES[v]) return;
  saveSettings(s => { s.lang = v; });
};
ACT.setPalette = b => {
  const v = b.dataset.v;
  if (!PALETTE_NAMES[v]) return;
  saveSettings(s => { s.look = Object.assign({}, s.look, { palette: v }); });
};
CHG.lookColor = el => {
  const k = el.dataset.k, v = validHex(el.value);
  if (!v || !['accent', 'reward', 'board'].includes(k)) return;
  saveSettings(s => { const lk = Object.assign({}, s.look); lk.custom = Object.assign({}, R().look.custom, lk.custom, { [k]: v }); lk.palette = 'perso'; s.look = lk; });
};
/* aperçu en direct pendant qu'on déplace le curseur de couleur (sans enregistrer) */
function previewLookColor(el) {
  const k = el.dataset.k, v = validHex(el.value);
  if (!v) return;
  const lk = R().look;
  const base = Object.assign({}, lk.custom, { [k]: v });
  const vars = paletteVars(base, isDarkNow(), lk.tint !== 'neutre');
  Object.keys(vars).forEach(n => document.body.style.setProperty(n, vars[n]));
  lastPaletteKey = '';
}
ACT.onboardHide = () => { saveSettings(s => { s.onboard = Object.assign({}, s.onboard, { hidden: true }); }); toast('Carte masquée. Tu peux la réafficher dans Réglages › Apparence.'); };
