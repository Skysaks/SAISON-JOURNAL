/* =========================================================
   Couleurs de l'interface : palettes prédéfinies ou personnalisées.
   Toutes les couleurs dérivées sont recalculées pour garder un contraste
   lisible (texte ≥ 4,8:1) en mode clair comme en mode sombre.
   ========================================================= */
const PALETTES = /*nt*/ {
  amethyste: { accent: '#6B34A0', reward: '#D9A21B', board: '#1B1726' },
  marine: { accent: '#1F4FD1', reward: '#D0843A', board: '#0E1726' },
  ocean: { accent: '#0F7C8C', reward: '#E3A33B', board: '#0B1E24' },
  framboise: { accent: '#B0195A', reward: '#D9A21B', board: '#22111A' },
  indigo: { accent: '#4338CA', reward: '#E0B341', board: '#141433' },
  graphite: { accent: '#3F4654', reward: '#B8925A', board: '#16181D' },
  sable: { accent: '#8A5A2B', reward: '#B7791F', board: '#2A2118' }
};
const PALETTE_DEFAULT_SWATCH = () => (TH && TH.pal) || /*nt*/ { accent: '#5B2A86', reward: '#D9A21B', board: '#1B1726' };
const PALETTE_NAMES = { defaut: 'Par défaut', amethyste: 'Améthyste', marine: 'Marine', ocean: 'Océan', framboise: 'Framboise', indigo: 'Indigo', graphite: 'Graphite', sable: 'Sable', perso: 'Personnalisée' };

/* ---------- calculs de couleur */
const hex2rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb2hex = c => '#' + c.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const validHex = h => (hex2rgb(h) ? rgb2hex(hex2rgb(h)) : null);
function mixC(a, b, t) { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); }
function lumOf(h) { return hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
function contrastOf(a, b) { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hsl2rgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const withL = (h, fn) => { const [H, S, L] = rgb2hsl(hex2rgb(h)); return rgb2hex(hsl2rgb([H, S, clamp(fn(L), 0, 1)])); };
/* éclaircit (dir = 1) ou fonce (dir = -1) jusqu'au contraste visé contre le fond donné */
function towardContrast(h, bg, target, dir) {
  let [H, S, L] = rgb2hsl(hex2rgb(h));
  let c = rgb2hex(hsl2rgb([H, S, L]));
  for (let i = 0; i < 120 && contrastOf(c, bg) < target; i++) { L = clamp(L + dir * 0.01, 0, 1); c = rgb2hex(hsl2rgb([H, S, L])); }
  return c;
}

/* ---------- palette complète à partir de 3 couleurs */
function paletteVars(base, dark, tinted) {
  const a = validHex(base.accent) || '#6B34A0', r = validHex(base.reward) || '#D9A21B', bd = validHex(base.board) || '#1B1726';
  const t = tinted ? 1 : 0;
  const board = withL(bd, L => clamp(L, 0.07, dark ? 0.16 : 0.15));
  const boardInk = mixC('#FFFFFF', board, 0.05);
  const common = {
    '--board': board, '--board-ink': boardInk,
    '--board-muted': towardContrast(mixC('#FFFFFF', board, 0.36), board, 4.6, 1),
    '--board-line': mixC(board, '#FFFFFF', 0.17)
  };
  if (!dark) {
    const surface = '#FFFFFF', bg = mixC('#F3F3F6', a, 0.035 * t);
    const accent = towardContrast(a, surface, 4.8, -1);
    const goldBar = towardContrast(withL(r, L => clamp(L, 0.42, 0.66)), '#16151C', 4.8, 1);
    return Object.assign(common, {
      '--bg': bg, '--surface': surface, '--surface-2': mixC('#F7F7F9', a, 0.03 * t),
      '--ink': mixC('#16151C', a, 0.06 * t), '--ink-2': mixC('#3C3B46', a, 0.08 * t),
      '--muted': towardContrast(mixC('#5F5E6B', a, 0.06 * t), bg, 4.8, -1),
      '--line': mixC('#E1E0E8', a, 0.06 * t), '--line-2': mixC('#C9C8D3', a, 0.06 * t),
      '--accent': accent, '--accent-mid': mixC(accent, '#FFFFFF', 0.45), '--accent-ink': '#FFFFFF', '--accent-soft': mixC(accent, '#FFFFFF', 0.9),
      '--gold': towardContrast(r, surface, 4.8, -1), '--gold-bar': goldBar, '--gold-soft': mixC(goldBar, '#FFFFFF', 0.84),
      '--on-gold': '#16151C'
    });
  }
  const bg = mixC('#0F0F13', a, 0.05 * t), surface = mixC('#17171D', a, 0.05 * t);
  const accent = towardContrast(withL(a, L => Math.max(L, 0.6)), surface, 5, 1);
  const goldBar = towardContrast(withL(r, L => Math.max(L, 0.56)), '#16151C', 5, 1);
  return Object.assign(common, {
    '--bg': bg, '--surface': surface, '--surface-2': mixC('#1E1E25', a, 0.06 * t),
    '--ink': mixC('#ECECF2', a, 0.04 * t), '--ink-2': mixC('#CFCED9', a, 0.05 * t),
    '--muted': towardContrast(mixC('#A6A5B3', a, 0.05 * t), surface, 4.8, 1),
    '--line': mixC('#2A2A33', a, 0.08 * t), '--line-2': mixC('#3A3A45', a, 0.08 * t),
    '--accent': accent, '--accent-mid': mixC(accent, surface, 0.45), '--accent-ink': '#0E0E12', '--accent-soft': mixC(accent, surface, 0.84),
    '--gold': towardContrast(goldBar, surface, 5, 1), '--gold-bar': goldBar, '--gold-soft': mixC(goldBar, surface, 0.85),
    '--on-gold': '#16151C'
  });
}
/* couleurs de résultat lisibles par les daltoniens (bleu / gris / vermillon) */
const RES_CB = /*nt*/ {
  light: { '--win': '#0B62A4', '--win-bg': '#DCEBF7', '--draw-c': '#6E6E78', '--draw-t': '#4D4D57', '--draw-bg': '#ECECEF', '--loss': '#A34400', '--loss-bg': '#FBE6D6' },
  dark: { '--win': '#6CB6F2', '--win-bg': '#12283A', '--draw-c': '#A9A9B4', '--draw-t': '#C9C9D2', '--draw-bg': '#26262D', '--loss': '#F29A5C', '--loss-bg': '#3A2213' }
};
const LOOK_VARS = ['--bg', '--surface', '--surface-2', '--ink', '--ink-2', '--muted', '--line', '--line-2', '--accent', '--accent-mid', '--accent-ink', '--accent-soft', '--gold', '--gold-bar', '--gold-soft', '--on-gold', '--board', '--board-ink', '--board-muted', '--board-line', '--win', '--win-bg', '--draw-c', '--draw-t', '--draw-bg', '--loss', '--loss-bg'];

function isDarkNow() {
  const th = R().look.theme;
  if (th === 'dark') return true;
  if (th === 'light') return false;
  const dt = document.documentElement.getAttribute('data-theme');
  if (dt === 'dark') return true;
  if (dt === 'light') return false;
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
}
function paletteBase(lk) {
  if (lk.palette === 'perso') return lk.custom || null;
  if (lk.palette === 'defaut' || !lk.palette) return (TH && TH.pal) || null;
  return PALETTES[lk.palette] || null;
}
let lastPaletteKey = '';
function applyPalette() {
  const lk = R().look;
  const dark = isDarkNow();
  const base = paletteBase(lk);
  const vars = base ? paletteVars(base, dark, lk.tint !== 'neutre') : {};
  if (lk.results === 'cb') Object.assign(vars, RES_CB[dark ? 'dark' : 'light']);
  const key = JSON.stringify(vars);
  if (key === lastPaletteKey) return;
  lastPaletteKey = key;
  const st = document.body.style;
  LOOK_VARS.forEach(v => st.removeProperty(v));
  Object.keys(vars).forEach(v => st.setProperty(v, vars[v]));
}
function watchScheme() {
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { lastPaletteKey = ''; scheduleRender(); }); } catch (e) { /* navigateur ancien */ }
  try { new MutationObserver(() => { lastPaletteKey = ''; scheduleRender(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] }); } catch (e) { /* ignore */ }
}
