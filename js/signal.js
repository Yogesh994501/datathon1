/**
 * PredictIQ — "The Signal" Background System
 *
 * A single continuous waveform line drawn on a fixed <canvas>, morphing
 * shape based on active view. Every frame change is driven by a state
 * transition or direct user input (slider drag) — never a setInterval
 * or ambient loop.
 *
 * Sections:
 *   overview   – Flat, slightly noisy drift (data at rest)
 *   dataset    – Jagged / high-frequency, smoothing as prep completes
 *   models     – 4 faint parallel traces, recommended one brightens
 *   predictions – Clean forecast curve, historical / predicted split
 *   radar      – Dissolves into scatter dots
 *   simulator  – Redraws live in response to slider values
 *   reports    – Calm, nearly-flat pulse
 *
 * Constraints (from brief):
 *   • Amber #D9A441 at full opacity for the primary trace
 *   • All secondary traces at 15–25 % opacity
 *   • One continuous object across all transitions
 *   • prefers-reduced-motion → static resting shape, no interpolation
 */

const Signal = (() => {
  // ── state ──────────────────────────────────────────────────────────
  let canvas, ctx;
  let W = 0, H = 0;
  let currentView = 'overview';
  let morphProgress = 1;          // 0 → 1  (transition complete)
  let prevPoints = [];             // previous shape sample
  let nextPoints = [];             // target shape sample
  let activePoints = [];           // interpolated shape being drawn
  let rafId = null;
  let reducedMotion = false;
  let simulatorNorm = 0.5;         // normalised 0–1 value from sliders
  let prepProgress = 1;            // 0–1 for dataset prep checklist

  const ACCENT      = '#D9A441';
  const ACCENT_20   = 'rgba(217,164,65,0.18)';
  const ACCENT_12   = 'rgba(217,164,65,0.10)';
  const TEAL_15     = 'rgba(107,143,138,0.15)';
  const LINE_FAINT  = 'rgba(42,47,59,0.35)';
  const SAMPLES     = 200;         // number of x-samples per line
  const TRANSITION_MS = 600;       // morph duration

  // ── public API ─────────────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    resize();
    window.addEventListener('resize', debounce(resize, 120));

    // Initial shape
    prevPoints = generateShape('overview');
    nextPoints = prevPoints.map(p => ({...p}));
    activePoints = prevPoints.map(p => ({...p}));
    draw();
  }

  function setView(viewName) {
    if (viewName === currentView && morphProgress >= 1) return;
    currentView = viewName;
    prevPoints = activePoints.map(p => ({...p}));
    nextPoints = generateShape(viewName);

    if (reducedMotion) {
      activePoints = nextPoints.map(p => ({...p}));
      draw();
      return;
    }

    morphProgress = 0;
    startMorphAnimation();
  }

  /** Called continuously by the Simulator sliders (the one place
   *  motion is fully user-driven). */
  function setSimulatorValue(norm) {
    simulatorNorm = Math.max(0, Math.min(1, norm));
    if (currentView === 'simulator') {
      nextPoints = generateShape('simulator');
      activePoints = nextPoints.map(p => ({...p}));
      draw();
    }
  }

  /** Called by Dataset Studio prep checklist progress (0 to 1). */
  function setPrepProgress(val) {
    prepProgress = Math.max(0, Math.min(1, val));
    if (currentView === 'dataset') {
      nextPoints = generateShape('dataset');
      activePoints = nextPoints.map(p => ({...p}));
      draw();
    }
  }

  // ── shape generators ───────────────────────────────────────────────
  // Each returns an array of { x, y } normalised to [0,1] range.
  // The draw() function scales to actual canvas size.

  function generateShape(view) {
    const pts = [];
    switch (view) {

      case 'overview': {
        // Flat, slightly noisy sine — data at rest
        const seed = Date.now() * 0.0001;
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          const noise = Math.sin(t * 14 + seed) * 0.02
                      + Math.sin(t * 23 + seed * 1.3) * 0.012
                      + Math.sin(t * 47 + seed * 0.7) * 0.006;
          pts.push({ x: t, y: 0.5 + noise });
        }
        break;
      }

      case 'dataset': {
        // Jagged high-frequency noise that smooths as prepProgress → 1
        const chaos = 1 - prepProgress;   // 1 = max noise, 0 = smooth
        const seed2 = 42;
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          const raw = Math.sin(t * 9 + seed2) * 0.04
                    + Math.sin(t * 31 + seed2) * 0.06 * chaos
                    + Math.sin(t * 67 + seed2) * 0.04 * chaos
                    + Math.sin(t * 113 + seed2) * 0.025 * chaos * chaos
                    + (pseudoRand(i * 7 + 3) - 0.5) * 0.08 * chaos;
          pts.push({ x: t, y: 0.50 + raw });
        }
        break;
      }

      case 'models': {
        // 4 parallel traces with slightly different amplitudes;
        // we encode them as a single path (primary trace) here and
        // draw the faint ones in the render pass.
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          const wave = Math.sin(t * 8) * 0.035
                     + Math.sin(t * 17) * 0.015;
          pts.push({ x: t, y: 0.5 + wave });
        }
        break;
      }

      case 'predictions': {
        // Clean forecast curve with visible historical ↔ predicted split
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          const splitT = 0.55;
          let y;
          if (t <= splitT) {
            // Historical region — gentle upward trend with micro-noise
            y = 0.58 - t * 0.10 + Math.sin(t * 20) * 0.008;
          } else {
            // Forecast region — steeper climb, dashed feel via amplitude
            const ft = (t - splitT) / (1 - splitT);
            y = 0.58 - splitT * 0.10 - ft * 0.14
              + Math.sin(ft * 12) * 0.005;
          }
          pts.push({ x: t, y });
        }
        break;
      }

      case 'radar': {
        // Dissolves into scattered dots — we use a wavy line that
        // breaks apart (big vertical jumps at intervals)
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          const breakChance = pseudoRand(i * 13 + 5);
          const isGap = breakChance > 0.8;
          const base = 0.5 + Math.sin(t * 11) * 0.03;
          const scatter = isGap
            ? (pseudoRand(i * 37 + 11) - 0.5) * 0.25
            : 0;
          pts.push({ x: t, y: base + scatter, isScatter: isGap });
        }
        break;
      }

      case 'simulator': {
        // Reacts to simulatorNorm: low norm → high amplitude chaos,
        // high norm → calm flat line (risk reduced)
        const amp = 0.06 + (1 - simulatorNorm) * 0.12;
        const freq = 8 + (1 - simulatorNorm) * 25;
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          const wave = Math.sin(t * freq) * amp
                     + Math.sin(t * freq * 2.3) * amp * 0.3;
          pts.push({ x: t, y: 0.5 + wave });
        }
        break;
      }

      default: {
        // Reports / fallback — calm low pulse
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          pts.push({ x: t, y: 0.5 + Math.sin(t * 6) * 0.015 });
        }
        break;
      }
    }
    return pts;
  }

  // ── morph animation ────────────────────────────────────────────────
  let morphStart = 0;

  function startMorphAnimation() {
    morphStart = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    tickMorph();
  }

  function tickMorph() {
    const elapsed = performance.now() - morphStart;
    morphProgress = Math.min(1, elapsed / TRANSITION_MS);

    // Ease-out cubic
    const ease = 1 - Math.pow(1 - morphProgress, 3);

    activePoints = prevPoints.map((p, i) => {
      const n = nextPoints[i] || p;
      return {
        x: p.x + (n.x - p.x) * ease,
        y: p.y + (n.y - p.y) * ease,
        isScatter: n.isScatter
      };
    });

    draw();

    if (morphProgress < 1) {
      rafId = requestAnimationFrame(tickMorph);
    } else {
      rafId = null;
    }
  }

  // ── draw ───────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const yCenter = H * 0.5;
    const yRange  = H * 0.45;   // max vertical extent
    const xPad    = 0;

    // Helper: normalised → pixel
    const px = (t) => xPad + t * (W - xPad * 2);
    const py = (n) => yCenter + (n - 0.5) * yRange * 2;

    // ── Draw secondary / parallel traces for model training view
    if (currentView === 'models' && morphProgress >= 0.85) {
      const offsets = [-0.045, -0.015, 0.015, 0.045];
      const alphas  = [0.12, 0.15, 0.12, 0.15];
      offsets.forEach((off, idx) => {
        ctx.beginPath();
        ctx.strokeStyle = idx === 0
          ? TEAL_15         // LR
          : ACCENT_12;      // others faint amber
        ctx.lineWidth = 1.5;
        activePoints.forEach((p, i) => {
          const x = px(p.x);
          const y = py(p.y + off);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    }

    // ── Draw scatter dots for radar view
    if (currentView === 'radar') {
      activePoints.forEach(p => {
        if (p.isScatter) {
          const x = px(p.x);
          const y = py(p.y);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = ACCENT_20;
          ctx.fill();
        }
      });
    }

    // ── Draw the primary signal line
    ctx.beginPath();
    ctx.lineWidth = 2;

    if (currentView === 'predictions') {
      // Two-segment rendering: historical (teal-grey) + forecast (amber)
      const splitIdx = Math.floor(SAMPLES * 0.55);

      ctx.strokeStyle = TEAL_15;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= splitIdx; i++) {
        const p = activePoints[i];
        const x = px(p.x);
        const y = py(p.y);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Forecast portion
      ctx.beginPath();
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      for (let i = splitIdx; i < activePoints.length; i++) {
        const p = activePoints[i];
        const x = px(p.x);
        const y = py(p.y);
        i === splitIdx ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Split-point marker
      const sp = activePoints[splitIdx];
      ctx.beginPath();
      ctx.arc(px(sp.x), py(sp.y), 4, 0, Math.PI * 2);
      ctx.fillStyle = ACCENT;
      ctx.fill();

    } else {
      // Standard single continuous line
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let drawing = true;

      activePoints.forEach((p, i) => {
        if (currentView === 'radar' && p.isScatter) {
          drawing = false;
          return;
        }
        const x = px(p.x);
        const y = py(p.y);
        if (!drawing || i === 0) {
          ctx.moveTo(x, y);
          drawing = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // ── subtle baseline hairline
    ctx.beginPath();
    ctx.strokeStyle = LINE_FAINT;
    ctx.lineWidth = 0.5;
    ctx.moveTo(0, yCenter);
    ctx.lineTo(W, yCenter);
    ctx.stroke();
  }

  // ── utilities ──────────────────────────────────────────────────────
  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    W = rect.width * dpr;
    H = rect.height * dpr;
    canvas.width = W;
    canvas.height = H;
    ctx.scale(dpr, dpr);
    W = rect.width;
    H = rect.height;

    // Redraw at new size
    if (activePoints.length) draw();
  }

  function pseudoRand(seed) {
    // Deterministic hash for consistent shapes
    let x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function debounce(fn, ms) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ── public interface ──────────────────────────────────────────────
  return {
    init,
    setView,
    setSimulatorValue,
    setPrepProgress
  };
})();

window.Signal = Signal;
