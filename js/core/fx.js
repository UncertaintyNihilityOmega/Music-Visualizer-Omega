/* =========================================================================
   PICTURE LAYER
   Moves the whole picture, the way the visualiser videos that were studied
   do (docs/RESEARCH.md section 4): a small zoom on each kick drum, a short
   shake on a strong beat, a lift in brightness on a snare. All three are
   scaled by A.drive squared, so a calm passage leaves the picture still.

   The maths (create / step) is pure and shared with engine/test.js. The
   browser half wraps a mode's draw call: begin() before, end() after.
   A mode can also ask for a one-off effect: App.fx.jolt(1) for thunder,
   App.fx.flashNow(0.3) for lightning.

   Units: zoom is a scale factor (1 = none). x and y are a shake offset in
   "shake units"; the browser half turns 1 unit into 1.2% of the short side.
   flash is the opacity of a white wash.
   ========================================================================= */
(function(root){
  'use strict';

  function create(){
    return { zoom: 1, kickZ: 0, x: 0, y: 0, shake: 0, flash: 0, clock: 0 };
  }
  // inp: { kick, snare, beat, beatStrength, drive }   amount: 0 (off) .. 2
  function step(s, inp, dt, amount){
    var gate = inp.drive * inp.drive * amount;
    // zoom follows the kick pulse: in fast, out slower
    var zt = inp.kick * 0.045 * gate;
    s.kickZ += (zt - s.kickZ) * (1 - Math.exp(-(zt > s.kickZ ? 40 : 7) * dt));
    if (s.kickZ < 1e-5) s.kickZ = 0;
    s.zoom = 1 + s.kickZ;
    // shake: one push on a strong beat, gone in about a quarter of a second
    if (inp.beat && inp.beatStrength > 0.55) s.shake = Math.max(s.shake, (inp.beatStrength - 0.4) * gate);
    s.shake *= Math.exp(-11 * dt);
    if (s.shake < 1e-4) s.shake = 0;
    s.clock += dt * 61;
    s.x = Math.sin(s.clock * 1.9) * s.shake;
    s.y = Math.cos(s.clock * 2.7) * s.shake;
    // brightness: a snare in a loud passage lifts the whole picture a little
    var ft = inp.snare * 0.1 * gate;
    s.flash += (ft - s.flash) * (1 - Math.exp(-(ft > s.flash ? 50 : 8) * dt));
    if (s.flash < 1e-4) s.flash = 0;
    return s;
  }

  var api = { create: create, step: step };
  if (typeof module !== 'undefined' && module.exports){ module.exports = api; return; }

  /* ---------- browser half ---------- */
  var App = root.App, F = App.fx = api;
  var st = create(), open = false, weight = 1;
  var calmMotion = false;
  try {
    var mq = root.matchMedia('(prefers-reduced-motion: reduce)');
    calmMotion = mq.matches;
    if (mq.addEventListener) mq.addEventListener('change', function(e){ calmMotion = e.matches; });
  } catch (e) {}

  F.state = st;
  // one-off effects a mode can ask for
  F.jolt = function(power){ st.shake = Math.max(st.shake, power * weight * App.cfg.CFG.look.fx * (calmMotion ? 0 : 1)); };
  F.flashNow = function(a){ st.flash = Math.max(st.flash, a * (calmMotion ? 0.4 : 1)); };

  // w: how much this mode wants of the automatic effects (0 = none)
  F.begin = function(ctx, w, h, modeWeight){
    var A = App.audio.A, amount = App.cfg.CFG.look.fx;
    weight = modeWeight === undefined ? 1 : modeWeight;
    step(st, A, A.dt, amount * weight);
    if (calmMotion){ st.shake = 0; st.x = st.y = 0; st.kickZ *= 0.3; st.zoom = 1 + st.kickZ; }
    open = false;
    if (st.zoom > 1.0005 || st.shake > 0.002){
      var unit = Math.min(w, h) * 0.012;
      // a little extra zoom while shaking, so the edge of the picture never shows
      var z = st.zoom + st.shake * 0.03;
      ctx.save();
      ctx.translate(w / 2 + st.x * unit, h / 2 + st.y * unit);
      ctx.scale(z, z);
      ctx.translate(-w / 2, -h / 2);
      open = true;
    }
  };
  F.end = function(ctx, w, h){
    if (open){ ctx.restore(); open = false; }
    if (st.flash > 0.004){
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, st.flash).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  };
  F.reset = function(){ st.kickZ = 0; st.zoom = 1; st.shake = 0; st.x = st.y = 0; st.flash = 0; };
})(typeof window !== 'undefined' ? window : this);
