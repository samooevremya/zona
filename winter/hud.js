(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const action = (method, ...args) => window.game?.[method]?.(...args);
  const modal = byId('map-overlay');
  const defeat = byId('dead-overlay');
  const vitalRows = [
    ['health', 'Здоровье', '#cf6050'],
    ['warmth', 'Тепло тела', '#e0a050'],
    ['food', 'Сытость', '#a8aa63'],
    ['water', 'Вода', '#71aabb']
  ].map(([key, label, color]) => {
    const row = document.createElement('div');
    row.className = 'stat';
    row.style.setProperty('--bar', color);
    row.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + key + '"/></svg>' +
      '<div class="reading"><span class="label">' + label + '</span><div class="track"><div class="fill"></div></div></div>' +
      '<div class="value"><b>100</b><i>%</i></div>';
    byId('vitals').appendChild(row);
    return {key, row, fill:row.querySelector('.fill'), value:row.querySelector('b'), last:null};
  });
  const ui = Object.fromEntries([
    'air-temp','clock','weather','gear','gear-pic','place','route','context','interact','sound','sound-pic',
    'eat','drink','ration-count','water-count','toast','hud','reset','map-toggle','map-close','equip','sprint'
  ].map(id => [id, byId(id)]));
  let toastTimer = 0;
  let soundOn;
  let wasDead = false;
  let previousFocus = null;
  const releases = [];

  function write(el, value) {
    const text = String(value ?? '');
    if (el.textContent !== text) el.textContent = text;
  }
  function href(el, id) {
    const value = '#i-' + id;
    if (el.getAttribute('href') !== value) el.setAttribute('href', value);
  }
  function releaseInputs() {
    for (const release of releases) release();
  }
  function toggleMap(force) {
    if (wasDead) return;
    const open = typeof force === 'boolean' ? force : modal.hidden;
    if (open === !modal.hidden) return;
    releaseInputs();
    modal.hidden = !open;
    ui.hud.inert = open;
    action('pause', open);
    if (open) {
      previousFocus = document.activeElement;
      ui['map-close'].focus({preventScroll:true});
    } else if (previousFocus instanceof HTMLElement) {
      previousFocus.focus({preventScroll:true});
    }
  }
  function toast(text) {
    clearTimeout(toastTimer);
    write(ui.toast, text);
    ui.toast.classList.add('show');
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2600);
  }
  function update(state) {
    for (const data of vitalRows) {
      const raw = state[data.key];
      if (!Number.isFinite(raw)) continue;
      const amount = Math.round(Math.min(100, Math.max(0, raw)));
      if (data.last === amount) continue;
      data.last = amount;
      write(data.value, amount);
      data.fill.style.transform = 'scaleX(' + amount / 100 + ')';
      data.row.classList.toggle('low', amount <= 25);
    }
    if (Number.isFinite(state.temp)) write(ui['air-temp'], String(Math.round(state.temp)).replace('-', '−') + '°');
    for (const [key,id] of [['time','clock'],['weather','weather'],['place','place'],['route','route']]) {
      if (key in state) write(ui[id], state[key]);
    }
    if ('gear' in state) {
      const gear = String(state.gear || 'Свободно');
      const icon = /нож|knife/i.test(gear) ? 'knife' : /винтов|ружь|карабин|автомат|rifle|дробовик/i.test(gear) ? 'rifle' : 'empty';
      write(ui.gear, gear);
      href(ui['gear-pic'], icon);
    }
    if ('context' in state) {
      const context = String(state.context || '');
      write(ui.context.lastElementChild, context);
      ui.context.hidden = !context;
      ui.interact.disabled = !context;
    }
    if ('sound' in state && soundOn !== state.sound) {
      soundOn = state.sound;
      href(ui['sound-pic'], soundOn ? 'sound' : 'mute');
      const label = soundOn ? 'Выключить звук' : 'Включить звук';
      ui.sound.title = label;
      ui.sound.setAttribute('aria-label', label);
      ui.sound.setAttribute('aria-pressed', String(soundOn));
    }
    if (Number.isFinite(state.rations)) {
      write(ui['ration-count'], state.rations);
      ui.eat.disabled = state.rations <= 0;
    }
    if (Number.isFinite(state.bottles)) {
      write(ui['water-count'], state.bottles);
      ui.drink.disabled = state.bottles <= 0;
    }
    if ('dead' in state && wasDead !== Boolean(state.dead)) {
      if (state.dead) {
        if (!modal.hidden) toggleMap(false);
        releaseInputs();
      }
      wasDead = Boolean(state.dead);
      defeat.hidden = !wasDead;
      ui.hud.inert = wasDead;
      if (wasDead) ui.reset.focus({preventScroll:true});
    }
  }

  function bindStick(id, method) {
    const pad = byId(id);
    const thumb = pad.querySelector('.thumb');
    let pointer = null;
    function move(event) {
      if (event.pointerId !== pointer) return;
      const rect = pad.getBoundingClientRect();
      const radius = rect.width * 0.36;
      let x = (event.clientX - rect.left - rect.width / 2) / radius;
      let y = (event.clientY - rect.top - rect.height / 2) / radius;
      const length = Math.hypot(x, y);
      if (length > 1) { x /= length; y /= length; }
      if (length < 0.1) { x = 0; y = 0; }
      thumb.style.transform = 'translate(' + (x * radius * .8) + 'px,' + (y * radius * .8) + 'px)';
      action(method, x, y);
    }
    function release(event) {
      if (pointer === null || (event && event.pointerId !== pointer)) return;
      const held = pointer;
      pointer = null;
      if (pad.hasPointerCapture(held)) pad.releasePointerCapture(held);
      pad.classList.remove('active');
      thumb.style.transform = '';
      action(method, 0, 0);
    }
    pad.addEventListener('pointerdown', e => {
      if (pointer !== null || e.button !== 0) return;
      e.preventDefault();
      pointer = e.pointerId;
      pad.setPointerCapture(pointer);
      pad.classList.add('active');
      move(e);
    });
    pad.addEventListener('pointermove', move);
    for (const name of ['pointerup','pointercancel','lostpointercapture']) pad.addEventListener(name, release);
    releases.push(release);
  }
  bindStick('move-pad','move');
  bindStick('aim-pad','aim');
  let sprintPointer = null;
  function stopSprint(e) {
    if (sprintPointer === null || (e && e.pointerId !== sprintPointer)) return;
    const held = sprintPointer;
    sprintPointer = null;
    if (ui.sprint.hasPointerCapture(held)) ui.sprint.releasePointerCapture(held);
    ui.sprint.classList.remove('held');
    action('sprint', false);
  }
  ui.sprint.addEventListener('pointerdown', e => {
    if (sprintPointer !== null || e.button !== 0) return;
    e.preventDefault();
    sprintPointer = e.pointerId;
    ui.sprint.setPointerCapture(sprintPointer);
    ui.sprint.classList.add('held');
    action('sprint', true);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) ui.sprint.addEventListener(event, stopSprint);
  releases.push(stopSprint);
  window.addEventListener('blur', releaseInputs);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseInputs(); });
  for (const [id,method,...args] of [
    ['jump','jump'],['interact','interact'],['context','interact'],['equip','cycleGear'],
    ['eat','consume','food'],['drink','consume','water'],['sound','toggleSound'],['reset','reset']
  ]) byId(id).addEventListener('click', () => action(method, ...args));
  ui['map-toggle'].addEventListener('click', () => toggleMap(true));
  ui['map-close'].addEventListener('click', () => toggleMap(false));
  modal.addEventListener('click', e => { if (e.target === modal) toggleMap(false); });
  document.addEventListener('keydown', e => {
    if (modal.hidden && defeat.hidden) return;
    if (e.key === 'Escape' && !modal.hidden) { e.preventDefault(); toggleMap(false); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const link=modal.querySelector('.credits-link');
      (wasDead ? ui.reset : document.activeElement===ui['map-close'] ? link : ui['map-close']).focus({preventScroll:true});
    }
  });
  window.hud = {update, toast, toggleMap, mapOpen:() => !modal.hidden};
})();
