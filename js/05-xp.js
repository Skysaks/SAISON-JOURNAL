/* =========================================================
   Moteur XP : journal d'événements (chaque gain est tracé)
   L'XP ne se perd jamais ; seule une saisie annulée retire son propre gain.
   ========================================================= */
const XP_SRC = { routine: 'Routine', quete: 'Quête', chapeau: 'Coup du chapeau', cloture: 'Clôture du match', objectif: 'Objectif', cap: 'Étape du cap', cup: 'Cup', savoir: 'Savoir', reseau: 'Réseau', focus: 'Focus', bilan: 'Bilan' };

function findEv(id) {
  const months = Object.keys(S.xp_events);
  for (let i = 0; i < months.length; i++) {
    const doc = S.xp_events[months[i]];
    if (doc && isObj(doc.ev) && doc.ev[id]) return { mk: months[i], e: doc.ev[id] };
  }
  return null;
}
function xpAward(id, d, xp, src, label, extra) {
  if (!isKey(d)) d = todayKey();
  const mk = monthOf(d);
  const ex = findEv(id);
  if (ex && ex.mk !== mk) {
    const old = clone(S.xp_events[ex.mk]); delete old.ev[id];
    put('xp_events', ex.mk, old, { system: true, silent: true });
  }
  const doc = clone(S.xp_events[mk]) || { ev: {} };
  if (!isObj(doc.ev)) doc.ev = {};
  doc.ev[id] = Object.assign({ d, xp: Math.max(0, Math.round(Number(xp) || 0)), src, label: String(label || '').slice(0, 140), ts: nowTs() }, extra || {});
  return put('xp_events', mk, doc, { system: true, silent: true });
}
function xpRevoke(id) {
  const ex = findEv(id);
  if (!ex) return false;
  const doc = clone(S.xp_events[ex.mk]); delete doc.ev[id];
  return put('xp_events', ex.mk, doc, { system: true, silent: true });
}
function xpAllEvents() {
  const out = [];
  Object.keys(S.xp_events).forEach(mk => {
    const doc = S.xp_events[mk];
    if (!doc || !isObj(doc.ev)) return;
    Object.keys(doc.ev).forEach(id => { const e = doc.ev[id]; if (e && isKey(e.d)) out.push(Object.assign({ id }, e, { xp: Math.max(0, Number(e.xp) || 0) })); });
  });
  return out.sort((a, b) => a.d.localeCompare(b.d) || (a.ts || 0) - (b.ts || 0));
}
function xpScanDay(k) { return sum(xpAllEvents().filter(e => e.d === k).map(e => e.xp)); }
function xpOn(k) { return ctx && ctx.xpByDay ? (ctx.xpByDay[k] || 0) : sum(xpAllEvents().filter(e => e.d === k).map(e => e.xp)); }
function xpBetween(a, b) { return sum(ctx.xpEv.filter(e => e.d >= a && e.d <= b).map(e => e.xp)); }
function levelInfo(xp) {
  let L = Math.max(1, Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2));
  while (50 * (L + 1) * L <= xp) L++;
  while (L > 1 && 50 * L * (L - 1) > xp) L--;
  const lo = 50 * L * (L - 1), hi = 50 * (L + 1) * L;
  const title = (TITLES.find(t => L >= t[0]) || TITLES[TITLES.length - 1])[1];
  return { L, lo, hi, into: xp - lo, need: hi - lo, title };
}

/* ---------- XP d'une quête au moment où elle est terminée */
function questXpCalc(q, id, d, planned) {
  const kind = KIND[q.kind] ? q.kind : 'fond';
  const a = areaInfo(q.area, d);
  const mult = Number.isFinite(a.mult) ? a.mult : 1;
  let xp = Math.round(xpv(kind) * mult);
  let note = mult !== 1 ? `× ${fmt1(mult)}${a.status ? ' (' + STATUS[a.status].toLowerCase() + ')' : ''}` : '';
  const sameDay = xpAllEvents().filter(e => e.src === 'quete' && e.d === d && e.id !== 'q:' + id && e.xp > 0);
  if (sameDay.length >= (Number(R().xp.dailyQuestCap) || 8)) { xp = 0; note = 'Plafond quotidien de quêtes atteint'; }
  else if (!planned && sameDay.filter(e => e.unplanned).length >= (Number(R().xp.unplannedCap) || 4)) { xp = 0; note = 'Plafond des quêtes non planifiées atteint'; }
  return { xp, note, mult };
}
function isPlanned(q, id, d) {
  if (!q.createdAt || q.createdAt < d) return true;
  const day = getDay(d);
  return !!(day && day.ko && Array.isArray(day.ko.coups) && day.ko.coups.includes(id));
}

/* ---------- coup du chapeau : 3 coups sur 3 terminés le jour même */
function syncHat(k) {
  if (!isKey(k)) return;
  const day = getDay(k);
  const type = dayType(day);
  const ids = ((day && day.coups) || []).filter(id => S.quests[id]).slice(0, 3);
  const ok = (type === 'normal' || type === 'intense') && ids.length === 3 && ids.every(id => { const q = S.quests[id]; return q.done && q.doneDate === k; });
  const has = !!findEv('hat:' + k);
  if (ok && !has) xpAward('hat:' + k, k, xpv('hat'), 'chapeau', 'Coup du chapeau');
  else if (!ok && has) xpRevoke('hat:' + k);
}
