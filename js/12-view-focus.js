/* =========================================================
   Chrono focus : blocs de concentration de 25, 50 ou 90 minutes.
   Le chrono vit dans la base (visible sur tous les appareils) ;
   il n'influence pas le score du jour, seulement l'XP (plafonnée).
   ========================================================= */
const FOCUS_LENS = [25, 50, 90];
const focusDay = k => { const d = getDay(k); return (d && Array.isArray(d.focus) ? d.focus : []).filter(f => f && Number(f.min) > 0); };
function focusRunning() {
  for (const k of [todayKey(), addDays(todayKey(), -1)]) { const d = getDay(k); if (d && d.focusRun && Number(d.focusRun.s) > 0) return { k, run: d.focusRun }; }
  return null;
}
function focusMinutes(a, b, area) {
  let n = 0;
  for (const k of dayRange(a, b)) focusDay(k).forEach(f => { if (!area || f.area === area) n += Number(f.min) || 0; });
  return n;
}
function focusBlocks(a, b) { let n = 0; for (const k of dayRange(a, b)) n += focusDay(k).filter(f => f.done).length; return n; }
const fmtMin = m => { m = Math.max(0, Math.round(Number(m) || 0)); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h ${pad(r)}` : `${r} min`; };
function focusLeft(run) { const plan = (Number(run.plan) || 25) * 60000; return { plan, left: Math.max(0, plan - (nowTs() - Number(run.s))) }; }
const clockTxt = ms => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor((ms % 60000) / 1000))}`;

function focusCard(k) {
  if (k !== ctx.today) return '';
  const fr = focusRunning();
  const done = focusDay(k);
  const mins = sum(done.map(f => f.min)), blocks = done.filter(f => f.done).length;
  const right = mins ? `${fmtMin(mins)} · ${plural(blocks, 'bloc terminé', 'blocs terminés')}` : `+${xpv('focus')} XP / bloc`;
  let body;
  if (fr) {
    const { plan, left } = focusLeft(fr.run);
    const q = fr.run.qid && S.quests[fr.run.qid] ? S.quests[fr.run.qid] : null;
    body = `<div class="focus-run">
      <div class="focus-clock" id="focus-clock" aria-live="off">${clockTxt(left)}</div>
      <div class="prog"><i id="focus-bar" style="width:${(100 - left / plan * 100).toFixed(1)}%"></i></div>
      <p class="small muted">${q ? esc(q.title) : 'Bloc libre'} · ${Number(fr.run.plan) || 25} min · depuis ${timeOf(fr.run.s)}</p>
      <div class="row-wrap"><button type="button" class="btn btn-sm btn-primary" data-a="focusStop">Terminer maintenant</button><button type="button" class="btn btn-sm btn-ghost" data-a="focusCancel">Abandonner</button></div>
    </div>`;
  } else {
    const ids = ((getDay(k) || {}).coups || []).filter(id => S.quests[id] && !S.quests[id].done);
    const others = questArr().filter(q => !q.done && !ids.includes(q.id)).sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999'))).slice(0, 40);
    const opt = q => `<option value="${esc(q.id)}">${esc(q.title)}</option>`;
    body = `<div class="stack">
      <div><label class="lbl" for="focus-q">Sur quoi ?</label><select id="focus-q" class="draft"><option value="">Bloc libre</option>${ids.length ? `<optgroup label="Coups du jour">${ids.map(id => opt(Object.assign({ id }, S.quests[id]))).join('')}</optgroup>` : ''}${others.length ? `<optgroup label="Autres quêtes">${others.map(opt).join('')}</optgroup>` : ''}</select></div>
      <div class="row-wrap">${FOCUS_LENS.map(n => `<button type="button" class="btn btn-sm" data-a="focusStart" data-v="${n}">${n} min</button>`).join('')}</div>
      <p class="small muted">Un bloc terminé : +${xpv('focus')} XP, ${Number(R().xp.focusCap) || 0} blocs par jour au maximum. Le chrono s’affiche aussi dans l’onglet du navigateur.</p>
    </div>`;
  }
  const log = done.length ? `<div class="hr"></div><ul class="clog">${done.slice().reverse().map(f => `<li><b>${timeOf(f.s)}</b>${f.done ? '✓ ' : ''}${fmtMin(f.min)}${f.qid && S.quests[f.qid] ? ' · ' + esc(S.quests[f.qid].title) : ''}</li>`).join('')}</ul>` : '';
  return sectionCard('Chrono focus', body + log, right, 'focus', 'focus');
}

/* ---------- actions */
let audioCtx = null;
function focusAudioPrime() {
  try { if (!audioCtx) { const A = window.AudioContext || window.webkitAudioContext; if (A) audioCtx = new A(); } if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { audioCtx = null; }
}
function focusBeep() {
  if (!R().focus.sound || !audioCtx) return;
  try {
    const t0 = audioCtx.currentTime;
    [0, 0.28, 0.56].forEach((d, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = i === 2 ? 880 : 660;
      g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.22, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
      o.connect(g); g.connect(audioCtx.destination); o.start(t0 + d); o.stop(t0 + d + 0.24);
    });
  } catch (e) { /* son indisponible */ }
}
ACT.focusStart = b => {
  if (focusRunning()) { toast('Un bloc est déjà en cours.'); return; }
  const plan = Number(b.dataset.v); if (!FOCUS_LENS.includes(plan)) return;
  const sel = document.getElementById('focus-q');
  const qid = sel && S.quests[sel.value] ? sel.value : null;
  if (setDayRaw(ctx.today, d => { d.focusRun = { s: nowTs(), plan, qid, area: qid ? (S.quests[qid].area || null) : null }; })) { dirty.delete('focus-q'); focusAudioPrime(); }
};
function focusFinish(completedByClock) {
  const fr = focusRunning(); if (!fr) return;
  if (baseTitle !== null) document.title = baseTitle;
  const run = fr.run, T = todayKey();
  const planMs = (Number(run.plan) || 25) * 60000;
  const el = Math.min(nowTs() - Number(run.s), planMs);
  const min = Math.floor(el / 60000);
  const done = !!completedByClock || el >= planMs;
  const entry = { s: Number(run.s), e: Number(run.s) + el, min, plan: Number(run.plan) || 25, qid: run.qid || null, area: run.area || null, done };
  if (fr.k !== T) setDayRaw(fr.k, d => { delete d.focusRun; });
  const ok = setDayRaw(T, d => {
    if (fr.k === T) delete d.focusRun;
    if (min >= 1) d.focus = (Array.isArray(d.focus) ? d.focus : []).concat(entry).slice(-40);
  });
  if (!ok) return;
  if (done) {
    const n = focusDay(T).filter(f => f.done).length;
    const cap = Number(R().xp.focusCap) || 0;
    const xp = n <= cap ? xpv('focus') : 0;
    xpAward(`f:${T}:${entry.s}`, T, xp, 'focus', `Bloc de focus · ${entry.plan} min`, { area: entry.area, note: xp ? '' : 'Plafond quotidien de focus atteint' });
    toast(xp ? `Bloc de focus terminé · +${xp} XP` : 'Bloc de focus terminé (plafond d’XP du jour atteint).', 'xp');
  } else if (min >= 1) toast(`${fmtMin(min)} de focus enregistrées.`);
  else toast('Bloc arrêté avant une minute : rien n’est enregistré.');
}
ACT.focusStop = () => focusFinish(false);
ACT.focusCancel = () => {
  const fr = focusRunning(); if (!fr) return;
  setDayRaw(fr.k, d => { delete d.focusRun; });
  if (baseTitle !== null) document.title = baseTitle;
  toast('Bloc abandonné.');
};
/* tic-tac : met à jour l'affichage sans tout redessiner, termine le bloc à l'heure */
let baseTitle = null, focusDoneGuard = null;
function focusTick() {
  if (!ctx || mode === 'boot') return;
  if (baseTitle === null) baseTitle = document.title;
  const fr = focusRunning();
  if (!fr) { if (document.title !== baseTitle) document.title = baseTitle; return; }
  const { plan, left } = focusLeft(fr.run);
  const txt = clockTxt(left);
  const c = document.getElementById('focus-clock'); if (c) c.textContent = txt;
  const bar = document.getElementById('focus-bar'); if (bar) bar.style.width = (100 - left / plan * 100).toFixed(1) + '%';
  document.title = `⏱ ${txt} · ${baseTitle}`;
  if (left <= 0 && focusDoneGuard !== fr.run.s && canWrite(true)) { focusDoneGuard = fr.run.s; focusFinish(true); focusBeep(); }
}
setInterval(focusTick, 1000);
