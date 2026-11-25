// Foot positions are kept in map coordinates so the supporting boot stays on the ground.
(() => {
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const halfWidth = .137;
  function rest(p, side) {
    return {x:p.x - Math.sin(p.legHeading)*side*halfWidth,
            y:p.y + Math.cos(p.legHeading)*side*halfWidth, height:0};
  }
  function reset(p) {
    p.gait = {feet:[rest(p, 1), rest(p, -1)], next:0, swing:null, phase:0};
  }
  function advance(p, dt, landed, onContact) {
    if (!p.gait || p.jump > 0 || landed) {
      reset(p);
      if (landed) onContact(p.gait.feet);
      return;
    }
    const gait = p.gait;
    const neutral = [rest(p, 1), rest(p, -1)];
    if (!gait.swing) {
      const error = gait.feet.map((f,i) => Math.hypot(neutral[i].x-f.x, neutral[i].y-f.y));
      let i = gait.next;
      if (p.speed < .10 && error[1-i] > error[i]) i = 1-i;
      if (Math.max(...error) < .025) return;
      gait.swing = {i, x:gait.feet[i].x, y:gait.feet[i].y, t:0};
    }
    const s = gait.swing, foot = gait.feet[s.i], home = neutral[s.i];
    const run = clamp((p.speed-1.6)/1.9, 0, 1);
    const duration = .33 - .115*run;
    s.t = Math.min(1, s.t+dt/duration);
    const t = s.t, ease = t*t*(3-2*t), arc = Math.sin(Math.PI*t);
    // Predict half the next stance; limiting the lead also keeps sprint strides reachable.
    const lead = Math.min(duration*(1.5-t), .33/Math.max(.01,p.speed));
    foot.x = s.x + (home.x + p.vx*lead - s.x)*ease;
    foot.y = s.y + (home.y + p.vy*lead - s.y)*ease;
    foot.height = arc*(.035+.12*clamp(p.speed/1.6,0,1)+.055*run);
    gait.phase = Math.PI*(s.i+t);
    if (t === 1) {
      foot.height = 0;
      if (Math.hypot(foot.x-s.x,foot.y-s.y) > .075) onContact([foot]);
      gait.next = 1-s.i;
      gait.swing = null;
    }
  }
  window.workerGait = {reset, advance};
})();
