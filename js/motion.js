/**
 * PredictIQ — MotionSceneController
 * 
 * MotionSites-inspired scroll-reactive cinematic background system.
 * Independent visual layer reading state without mutating state.
 * 
 * Visual Progression:
 * 0.00–0.15 : EXECUTIVE BRIEFING (Subtle data particles & atmospheric grid — CHAOS / Rest)
 * 0.15–0.32 : DATASET STUDIO (Chaotic particles progressively organize — STRUCTURE)
 * 0.32–0.48 : MODEL BENCHMARK (Organized particles flow into an abstract ML network — MODEL)
 * 0.48–0.63 : PREDICTION CENTER (Network transforms into forecast curve & confidence envelope — PREDICTION)
 * 0.63–0.80 : RISK RADAR (Prediction curve expands into 2D probability field — RISK)
 * 0.80–0.92 : WHAT-IF SIMULATOR (Risk field responds live to slider sensitivity — SENSITIVITY)
 * 0.92–1.00 : REPORTS / DECISION (Visual system crystallizes into connected decision nodes — DECISION)
 * 
 * Design Tokens:
 * Base: #12151C, Hairline: #2A2F3B, Accent: #D9A441, Secondary: #6B8F8A, Text: #EDEAE3
 */

const MotionSceneController = (() => {
  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = null;
  let isRunning = false;
  let reducedMotion = false;

  // Scroll interpolation tracking
  let targetProgress = 0;
  let currentProgress = 0;
  const LERP_SPEED = 0.14; // Smooth cinematic damping

  // Application State Snapshot (Read-only)
  const appState = {
    domain: 'retail',
    datasetQuality: 94.2,
    prepProgress: 1.0,
    recommendedModel: 'Logistic Regression',
    recommendedAuc: 83.9,
    predictionProbability: 82.4,
    riskFilter: 'all',
    simulatorProbability: 68.0,
    simulatorDelta: 0.0,
    activeSection: 'overview'
  };

  // Color Tokens
  const COLOR = {
    base: '#12151C',
    hairline: 'rgba(42, 47, 59, 0.45)',
    hairlineFaint: 'rgba(42, 47, 59, 0.22)',
    accent: '#D9A441',
    accentAlpha: (a) => `rgba(217, 164, 65, ${a})`,
    secondary: '#6B8F8A',
    secondaryAlpha: (a) => `rgba(107, 143, 138, ${a})`,
    textMuted: 'rgba(237, 234, 227, 0.45)',
    textFaint: 'rgba(237, 234, 227, 0.25)'
  };

  // Scene Progress Boundaries
  const SCENES = [
    { id: 'overview',    start: 0.00, end: 0.15, name: 'Executive Briefing' },
    { id: 'dataset',     start: 0.15, end: 0.32, name: 'Dataset Studio' },
    { id: 'models',      start: 0.32, end: 0.48, name: 'Model Benchmark' },
    { id: 'predictions', start: 0.48, end: 0.63, name: 'Prediction Center' },
    { id: 'radar',       start: 0.63, end: 0.80, name: 'Risk Radar' },
    { id: 'simulator',   start: 0.80, end: 0.92, name: 'What-If Simulator' },
    { id: 'reports',     start: 0.92, end: 1.00, name: 'Reports / Decision' }
  ];

  // Particle System
  let particles = [];
  const PARTICLE_COUNT_DESKTOP = 90;
  const PARTICLE_COUNT_TABLET = 52;
  const PARTICLE_COUNT_MOBILE = 26;

  function getParticleCount() {
    const w = window.innerWidth;
    if (w < 768) return PARTICLE_COUNT_MOBILE;
    if (w < 1024) return PARTICLE_COUNT_TABLET;
    return PARTICLE_COUNT_DESKTOP;
  }

  function initParticles() {
    const count = getParticleCount();
    particles = [];
    for (let i = 0; i < count; i++) {
      // Deterministic seed for reproducible layout
      const seed1 = pseudoRand(i * 13 + 7);
      const seed2 = pseudoRand(i * 37 + 19);
      const seed3 = pseudoRand(i * 71 + 31);
      
      particles.push({
        id: i,
        seedX: seed1,
        seedY: seed2,
        seedSpeed: seed3,
        radius: 1.2 + seed1 * 1.5,
        alpha: 0.25 + seed2 * 0.45,
        // Current rendered coordinate
        x: 0,
        y: 0,
        renderAlpha: 0.3,
        isOutlier: i % 11 === 0, // matches dataset outlier ratio
        tier: i < count * 0.35 ? 'high' : (i < count * 0.70 ? 'medium' : 'low')
      });
    }
  }

  function pseudoRand(n) {
    const x = Math.sin(n) * 10000;
    return x - Math.floor(x);
  }

  // Smooth Hermite blend
  function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  // Linear interpolation
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Scene Target Coordinate Generators
   * Each returns normalized coordinate [0..1, 0..1] for particle i
   */
  function getSceneTarget(sceneIndex, p, time) {
    const i = p.id;
    const N = particles.length;

    switch (sceneIndex) {
      // 0: EXECUTIVE BRIEFING — Ambient Brownian drift / Data at Rest
      case 0: {
        const driftX = Math.sin(time * 0.0004 * p.seedSpeed + p.seedX * 10) * 0.035;
        const driftY = Math.cos(time * 0.0003 * p.seedSpeed + p.seedY * 10) * 0.035;
        const x = 0.08 + p.seedX * 0.84 + driftX;
        const y = 0.12 + p.seedY * 0.76 + driftY;
        return { x, y, alpha: p.alpha * 0.7, color: COLOR.secondaryAlpha(0.35) };
      }

      // 1: DATASET STUDIO — CHAOS -> STRUCTURE Matrix
      case 1: {
        const cols = 6;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const totalRows = Math.ceil(N / cols);

        // Matrix base positions
        const baseX = 0.18 + (col / (cols - 1)) * 0.64;
        const baseY = 0.22 + (row / Math.max(1, totalRows - 1)) * 0.58;

        // Jitter diminishes with prepProgress and datasetQuality
        const chaos = (1 - appState.prepProgress) * 0.08 + ((100 - appState.datasetQuality) / 100) * 0.025;
        const jitterX = (p.seedX - 0.5) * chaos;
        const jitterY = (p.seedY - 0.5) * chaos;

        const isOutlier = p.isOutlier && appState.prepProgress < 0.8;
        const colColor = isOutlier ? COLOR.accentAlpha(0.85) : COLOR.secondaryAlpha(0.45);

        return {
          x: baseX + jitterX,
          y: baseY + jitterY,
          alpha: isOutlier ? 0.85 : 0.45,
          color: colColor
        };
      }

      // 2: MODEL BENCHMARK — STRUCTURE -> ML SYNAPTIC GRAPH
      case 2: {
        // Multi-layer network: Inputs (left) -> Hidden (mid) -> 4 Output Heads (right)
        let x, y, color = COLOR.secondaryAlpha(0.3);
        const third = Math.floor(N / 3);

        if (i < third) {
          // Input Feature Nodes
          x = 0.16 + (p.seedX - 0.5) * 0.04;
          y = 0.22 + (i / third) * 0.56;
          color = COLOR.secondaryAlpha(0.5);
        } else if (i < third * 2) {
          // Hidden Synaptic Layers
          const subIdx = i - third;
          const layerX = subIdx % 2 === 0 ? 0.38 : 0.56;
          x = layerX + (p.seedX - 0.5) * 0.05;
          y = 0.20 + (subIdx / third) * 0.60;
          color = COLOR.secondaryAlpha(0.35);
        } else {
          // Output Model Heads (4 benchmark candidates)
          const modelIdx = i % 4;
          const modelY = [0.28, 0.42, 0.56, 0.70][modelIdx];
          x = 0.82 + (p.seedX - 0.5) * 0.03;
          y = modelY + (p.seedY - 0.5) * 0.03;

          // Highlight recommended model (Logistic Regression is head 0)
          if (modelIdx === 0) {
            color = COLOR.accentAlpha(0.9);
          } else {
            color = COLOR.secondaryAlpha(0.3);
          }
        }

        return { x, y, alpha: 0.55, color };
      }

      // 3: PREDICTION CENTER — MODEL -> FORECAST TRAJECTORY CURVE
      case 3: {
        // Particles line up along the continuous historical & future forecast curve
        const tVal = i / (N - 1); // 0 to 1 across screen
        const x = 0.12 + tVal * 0.76;
        const splitPoint = 0.52; // Now

        let y, color, alpha;
        const probNorm = appState.predictionProbability / 100; // e.g. 0.824

        if (tVal <= splitPoint) {
          // Historical Segment (gentle incline)
          const normHist = tVal / splitPoint;
          y = 0.60 - normHist * 0.12 + Math.sin(normHist * 8) * 0.015;
          color = COLOR.secondaryAlpha(0.5);
          alpha = 0.45;
        } else {
          // Future Forecast Segment (curving upward into high churn risk)
          const normFore = (tVal - splitPoint) / (1 - splitPoint);
          // Higher prediction probability curves steeper towards top
          y = 0.48 - normFore * (0.16 + probNorm * 0.18) + Math.sin(normFore * 6) * 0.01;
          color = COLOR.accentAlpha(0.85);
          alpha = 0.75;
        }

        // Add subtle confidence interval spread for particles
        const spread = (p.seedY - 0.5) * (0.01 + (tVal > splitPoint ? (tVal - splitPoint) * 0.08 : 0.01));
        return { x, y: y + spread, alpha, color };
      }

      // 4: RISK RADAR — 2D PROBABILITY DENSITY FIELD
      case 4: {
        // Particles cluster into Risk Tiers: High, Medium, Low
        let centerX, centerY, radiusSpread;
        let color = COLOR.secondaryAlpha(0.4);
        let alpha = 0.4;

        if (p.tier === 'high') {
          centerX = 0.68;
          centerY = 0.30;
          radiusSpread = 0.14;
          color = COLOR.accentAlpha(0.85);
          alpha = 0.8;
          // Respond to filter
          if (appState.riskFilter === 'high') {
            alpha = 1.0;
            radiusSpread = 0.09; // tightly concentrated
          } else if (appState.riskFilter !== 'all') {
            alpha = 0.15;
          }
        } else if (p.tier === 'medium') {
          centerX = 0.50;
          centerY = 0.52;
          radiusSpread = 0.16;
          color = COLOR.accentAlpha(0.5);
          alpha = 0.5;
          if (appState.riskFilter === 'medium') {
            alpha = 0.95;
            radiusSpread = 0.10;
          } else if (appState.riskFilter !== 'all') {
            alpha = 0.15;
          }
        } else {
          centerX = 0.32;
          centerY = 0.70;
          radiusSpread = 0.18;
          color = COLOR.secondaryAlpha(0.6);
          alpha = 0.4;
          if (appState.riskFilter === 'low') {
            alpha = 0.95;
            radiusSpread = 0.10;
          } else if (appState.riskFilter !== 'all') {
            alpha = 0.15;
          }
        }

        const angle = p.seedSpeed * Math.PI * 2 + time * 0.0002;
        const dist = p.seedX * radiusSpread;
        const x = centerX + Math.cos(angle) * dist * 1.4; // elliptical
        const y = centerY + Math.sin(angle) * dist;

        return { x, y, alpha, color };
      }

      // 5: WHAT-IF SIMULATOR — SENSITIVITY MODULATION
      case 5: {
        // Streamlines responding live to simulator output
        const streamIdx = i % 5;
        const baseY = 0.25 + streamIdx * 0.12;
        const xProgress = (i / N);
        const x = 0.14 + xProgress * 0.72;

        // Higher simulator probability -> turbulent wave; lower probability -> serene laminar line
        const riskFactor = appState.simulatorProbability / 100;
        const amp = 0.015 + riskFactor * 0.06;
        const freq = 6 + riskFactor * 16;
        const wave = Math.sin(xProgress * freq + time * 0.001) * amp;

        // Favorable intervention brings calming teal; high risk warms to gold
        const isFavorable = appState.simulatorDelta <= -5;
        const color = isFavorable 
          ? COLOR.secondaryAlpha(0.7) 
          : (riskFactor > 0.65 ? COLOR.accentAlpha(0.8) : COLOR.accentAlpha(0.45));

        return {
          x,
          y: baseY + wave,
          alpha: 0.35 + (1 - riskFactor) * 0.3,
          color
        };
      }

      // 6: REPORTS / DECISION — CRYSTALLINE DECISION NODES
      case 6: {
        // 4 primary strategic executive decision nodes
        const nodes = [
          { x: 0.20, y: 0.48 }, // 1. Cohort Ingested
          { x: 0.40, y: 0.38 }, // 2. Model Validated
          { x: 0.60, y: 0.54 }, // 3. Risk Stratified
          { x: 0.80, y: 0.44 }  // 4. Exposure Protected
        ];

        const nodeIdx = i % 4;
        const center = nodes[nodeIdx];
        
        // Particles orbit or lock onto the 4 decision nodes
        const isCore = i < 16;
        let x, y, alpha, color;

        if (isCore) {
          x = center.x;
          y = center.y;
          alpha = 0.9;
          color = COLOR.accent;
        } else {
          const orbitAngle = p.seedX * Math.PI * 2 + time * 0.0003 * (p.seedSpeed > 0.5 ? 1 : -1);
          const orbitRadius = 0.02 + p.seedY * 0.06;
          x = center.x + Math.cos(orbitAngle) * orbitRadius * 1.2;
          y = center.y + Math.sin(orbitAngle) * orbitRadius;
          alpha = 0.4;
          color = nodeIdx === 3 ? COLOR.accentAlpha(0.7) : COLOR.secondaryAlpha(0.5);
        }

        return { x, y, alpha, color };
      }

      default:
        return { x: 0.5, y: 0.5, alpha: 0.2, color: COLOR.secondaryAlpha(0.3) };
    }
  }

  /**
   * Continuous interpolation between scenes based on scroll progress
   */
  function calculateParticleCoordinates(time) {
    const p = currentProgress;

    // Find active scene bracket
    let sceneA = 0;
    let sceneB = 1;
    let blend = 0;

    for (let k = 0; k < SCENES.length - 1; k++) {
      if (p >= SCENES[k].start && p <= SCENES[k + 1].start) {
        sceneA = k;
        sceneB = k + 1;
        blend = smoothstep(SCENES[k].start, SCENES[k + 1].start, p);
        break;
      }
    }

    if (p >= SCENES[SCENES.length - 1].start) {
      sceneA = SCENES.length - 1;
      sceneB = SCENES.length - 1;
      blend = 1.0;
    }

    particles.forEach(pt => {
      const targetA = getSceneTarget(sceneA, pt, time);
      const targetB = getSceneTarget(sceneB, pt, time);

      pt.x = lerp(targetA.x, targetB.x, blend) * width;
      pt.y = lerp(targetA.y, targetB.y, blend) * height;
      pt.renderAlpha = lerp(targetA.alpha, targetB.alpha, blend);
      pt.color = blend > 0.5 ? targetB.color : targetA.color;
    });
  }

  /**
   * Render contextual background geometries (grid, synaptic links, isolines, decision vectors)
   */
  function renderAtmosphericElements(time) {
    const p = currentProgress;

    // 1. Persistent Subtle Coordinate Grid (Overview & Dataset, 0.00 - 0.32)
    if (p < 0.35) {
      const gridAlpha = (1 - smoothstep(0.25, 0.35, p)) * 0.12;
      if (gridAlpha > 0.01) {
        ctx.strokeStyle = `rgba(42, 47, 59, ${gridAlpha})`;
        ctx.lineWidth = 1;

        // Horizontal coordinate lines
        [0.25, 0.50, 0.75].forEach(yFrac => {
          const y = height * yFrac;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        });

        // Vertical coordinate markers
        [0.20, 0.40, 0.60, 0.80].forEach(xFrac => {
          const x = width * xFrac;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        });
      }
    }

    // 2. Abstract ML Synaptic Connections (Model Benchmark, 0.30 - 0.50)
    if (p >= 0.28 && p <= 0.52) {
      const netAlpha = Math.sin(smoothstep(0.28, 0.52, p) * Math.PI) * 0.35;
      if (netAlpha > 0.02) {
        // Draw synaptic paths from inputs -> hidden -> recommended model
        const inputX = width * 0.16;
        const hiddenX = width * 0.45;
        const recModelX = width * 0.82;
        const recModelY = height * 0.28;

        ctx.lineWidth = 1.2;
        ctx.strokeStyle = COLOR.accentAlpha(netAlpha * 0.7);

        // Illuminating path to recommended model (Logistic Regression)
        [0.25, 0.40, 0.55, 0.70].forEach(yFrac => {
          const inY = height * yFrac;
          ctx.beginPath();
          ctx.moveTo(inputX, inY);
          ctx.bezierCurveTo(hiddenX * 0.7, inY, hiddenX * 1.1, recModelY, recModelX, recModelY);
          ctx.stroke();
        });

        // Other algorithm candidate branches (fainter)
        ctx.strokeStyle = COLOR.secondaryAlpha(netAlpha * 0.3);
        [0.42, 0.56, 0.70].forEach(otherYFrac => {
          const outY = height * otherYFrac;
          ctx.beginPath();
          ctx.moveTo(hiddenX, height * 0.5);
          ctx.lineTo(recModelX, outY);
          ctx.stroke();
        });
      }
    }

    // 3. Prediction Horizon & Confidence Envelope (0.46 - 0.65)
    if (p >= 0.46 && p <= 0.65) {
      const predAlpha = Math.sin(smoothstep(0.46, 0.65, p) * Math.PI);
      if (predAlpha > 0.02) {
        const splitX = width * 0.52;

        // Vertical inference reference hairline
        ctx.strokeStyle = `rgba(217, 164, 65, ${predAlpha * 0.35})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(splitX, height * 0.15);
        ctx.lineTo(splitX, height * 0.85);
        ctx.stroke();
        ctx.setLineDash([]);

        // Confidence Envelope band (+/- sigma)
        const probNorm = appState.predictionProbability / 100;
        const startY = height * 0.48;
        const endY = height * (0.48 - (0.16 + probNorm * 0.18));
        const endX = width * 0.88;

        ctx.fillStyle = `rgba(217, 164, 65, ${predAlpha * 0.05})`;
        ctx.beginPath();
        ctx.moveTo(splitX, startY - 8);
        ctx.bezierCurveTo(splitX + (endX - splitX) * 0.5, startY - 20, endX - 50, endY - 35, endX, endY - 40);
        ctx.lineTo(endX, endY + 40);
        ctx.bezierCurveTo(endX - 50, endY + 35, splitX + (endX - splitX) * 0.5, startY + 20, splitX, startY + 8);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 4. Probability Density Contour Rings (Risk Radar, 0.62 - 0.82)
    if (p >= 0.62 && p <= 0.82) {
      const radarAlpha = Math.sin(smoothstep(0.62, 0.82, p) * Math.PI) * 0.35;
      if (radarAlpha > 0.02) {
        // High Risk Centroid Rings
        const hX = width * 0.68;
        const hY = height * 0.30;
        ctx.lineWidth = 1;

        [40, 80, 130].forEach((r, idx) => {
          ctx.strokeStyle = COLOR.accentAlpha(radarAlpha * (0.4 - idx * 0.1));
          ctx.beginPath();
          ctx.ellipse(hX, hY, r * 1.5, r, 0, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Coordinate label
        ctx.fillStyle = COLOR.textMuted;
        ctx.font = '10px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('CRITICAL EXPOSURE CLUSTER [P > 0.75]', hX - 90, hY - 95);
      }
    }

    // 5. Connected Strategic Decision Vector Backbone (Reports, 0.90 - 1.00)
    if (p >= 0.90) {
      const decAlpha = smoothstep(0.90, 1.00, p);
      const nodes = [
        { x: width * 0.20, y: height * 0.48, label: '01. Ingestion' },
        { x: width * 0.40, y: height * 0.38, label: '02. Benchmark' },
        { x: width * 0.60, y: height * 0.54, label: '03. Stratification' },
        { x: width * 0.80, y: height * 0.44, label: '04. Executive Action' }
      ];

      // Connecting Vector Line
      ctx.strokeStyle = COLOR.accentAlpha(decAlpha * 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      nodes.forEach((n, idx) => {
        if (idx === 0) ctx.moveTo(n.x, n.y);
        else ctx.lineTo(n.x, n.y);
      });
      ctx.stroke();

      // Decision Node Halo Rings
      nodes.forEach((n, idx) => {
        ctx.strokeStyle = COLOR.accentAlpha(decAlpha * 0.6);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(n.x, n.y, 16 + Math.sin(time * 0.002 + idx) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR.accentAlpha(decAlpha * 0.25);
        ctx.stroke();

        // Node Label
        ctx.fillStyle = COLOR.textMuted;
        ctx.font = '11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(n.label, n.x - 30, n.y + 32);
      });
    }
  }

  /**
   * Main Render Loop
   */
  function render(time) {
    if (!ctx) return;

    // Smoothly interpolate scroll progress
    if (Math.abs(targetProgress - currentProgress) > 0.0005) {
      currentProgress += (targetProgress - currentProgress) * LERP_SPEED;
    } else {
      currentProgress = targetProgress;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Compute particle target coordinates
    calculateParticleCoordinates(time);

    // Render atmospheric contextual vectors & isolines
    renderAtmosphericElements(time);

    // Render particles
    particles.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
    });

    if (isRunning && !reducedMotion) {
      rafId = requestAnimationFrame(render);
    }
  }

  /**
   * Calculate Scroll Progress across the full briefing document
   */
  function updateScrollProgress() {
    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (maxScroll <= 0) {
      targetProgress = 0;
    } else {
      targetProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
    }

    // If reduced motion is requested, snap instantly and draw one frame
    if (reducedMotion) {
      currentProgress = targetProgress;
      render(performance.now());
    }
  }

  /**
   * Resize Canvas Buffer
   */
  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    initParticles();

    if (reducedMotion) {
      render(performance.now());
    }
  }

  /**
   * Initialize Controller
   */
  function init(canvasId = 'signal-canvas') {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    resize();
    window.addEventListener('resize', debounce(resize, 100));
    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    updateScrollProgress();

    // Conserve CPU & Battery: Pause canvas animation when tab is inactive or hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isRunning = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        if (!isRunning && !reducedMotion) {
          isRunning = true;
          rafId = requestAnimationFrame(render);
        }
      }
    });

    isRunning = true;
    if (!reducedMotion) {
      rafId = requestAnimationFrame(render);
    } else {
      render(performance.now());
    }
  }

  /**
   * State update methods (Read-only from UI state)
   */
  function setDomain(domain) {
    appState.domain = domain;
  }

  function setDatasetMetrics(quality, rowCount) {
    appState.datasetQuality = quality;
  }

  function setPrepProgress(progress) {
    appState.prepProgress = Math.max(0, Math.min(1, progress));
  }

  function setModelMetrics(modelName, auc) {
    appState.recommendedModel = modelName;
    appState.recommendedAuc = auc;
  }

  function setPredictionMetrics(prob, confidence) {
    appState.predictionProbability = prob;
  }

  function setRiskFilter(filter) {
    appState.riskFilter = filter;
  }

  function setSimulatorState(prob, delta) {
    appState.simulatorProbability = prob;
    appState.simulatorDelta = delta;
  }

  function setActiveSection(sectionId) {
    appState.activeSection = sectionId;
    // Calculate targeted progress based on section
    const sec = SCENES.find(s => s.id === sectionId);
    if (sec) {
      // Gentle nudge target progress if jump triggered
      targetProgress = (sec.start + sec.end) * 0.5;
      if (reducedMotion) {
        currentProgress = targetProgress;
        render(performance.now());
      }
    }
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  return {
    init,
    setDomain,
    setDatasetMetrics,
    setPrepProgress,
    setModelMetrics,
    setPredictionMetrics,
    setRiskFilter,
    setSimulatorState,
    setActiveSection,
    getProgress: () => currentProgress
  };
})();

window.MotionSceneController = MotionSceneController;
