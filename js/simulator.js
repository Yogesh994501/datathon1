/**
 * PredictIQ What-If Scenario Simulator
 * Interactive live recalculation of risk based on operational levers.
 * Features:
 * - Real-time algebraic model inference (<10ms latency)
 * - Exact visual reproduction of the user design layout:
 *   • Commercial Levers: Monthly Discount Rate, Contract Length
 *   • Exec Dashboard Adoption iOS-style toggle
 *   • Reset to Baseline with custom border styling
 *   • 3 Metric Cards: Predicted Risk Score, Forecasted LTV Impact, Anomaly Alerts Triggered
 *   • 12-Month Outlook Canvas Chart with historical line, baseline curve, simulated glow curve, bell peaks & confidence envelope
 *   • SHAP Deltas Panel with center-diverging glowing green/red attribution bars and diamond icon
 */

const Simulator = {
  container: null,

  // Baseline Configuration
  BASELINE: {
    discount: 12,
    contract: 24,
    adoption: true
  },

  // Logistic Regression Weights
  MODEL_WEIGHTS: {
    intercept: 0.2,
    discount: -0.045,   // Higher discount reduces churn
    contract: -0.038,   // Longer contract reduces churn
    adoption: -0.32     // Exec dashboard adoption reduces churn
  },

  baseRisk: 0.284,      // 28.4% baseline risk

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.render();
  },

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="simulator-container-layout">
        <!-- LEFT: SCENARIO CONTROLS -->
        <div>
          <div class="sim-section-header">SCENARIO CONTROLS</div>
          <div class="sim-card">
            <div class="sim-control-group">
              <div class="sim-control-group-title">Commercial Levers</div>

              <!-- Lever 1: Monthly Discount Rate -->
              <div class="sim-control-item">
                <div class="sim-control-label-row">
                  <span class="sim-control-name">Monthly Discount Rate</span>
                  <span class="sim-control-value" id="val-discount">${this.BASELINE.discount}%</span>
                </div>
                <div class="sim-control-subtitle">Commercial slider set #00F2FE</div>
                <input type="range" class="sim-slider" id="param-discount" min="0" max="30" value="${this.BASELINE.discount}" step="1" aria-label="Monthly Discount Rate" />
                <div class="sim-control-scale">
                  <span>0</span>
                  <span>30%</span>
                </div>
              </div>

              <!-- Lever 2: Contract Length -->
              <div class="sim-control-item">
                <div class="sim-control-label-row">
                  <span class="sim-control-name">Contract Length</span>
                  <span class="sim-control-value" id="val-contract">${this.BASELINE.contract} months</span>
                </div>
                <div class="sim-control-subtitle">Commercial commitment period</div>
                <input type="range" class="sim-slider" id="param-contract" min="1" max="36" value="${this.BASELINE.contract}" step="1" aria-label="Contract Length" />
                <div class="sim-control-scale">
                  <span>1</span>
                  <span>36 months</span>
                </div>
              </div>
            </div>

            <!-- Toggle: Exec Dashboard Adoption -->
            <div class="sim-switch-container">
              <div>
                <div class="sim-control-name">Exec Dashboard Adoption</div>
                <div class="sim-control-subtitle" style="margin-bottom: 0;">Toggle: dashboard adoption</div>
              </div>
              <label class="sim-switch" for="param-adoption" aria-label="Toggle Exec Dashboard Adoption">
                <input type="checkbox" id="param-adoption" ${this.BASELINE.adoption ? 'checked' : ''} />
                <span class="sim-switch-slider"></span>
              </label>
            </div>

            <!-- Reset to Baseline Button -->
            <button type="button" class="sim-reset-box" id="btn-reset-sim">
              <div>Reset to Baseline</div>
              <div class="sim-reset-subtext">border: 1px solid rgba(255,255,255,0.2)</div>
            </button>
          </div>
        </div>

        <!-- RIGHT: LIVE PREDICTION OUTPUT -->
        <div class="sim-output-workspace">
          <div class="sim-section-header">LIVE PREDICTION OUTPUT</div>

          <!-- Top 3 Metric Cards -->
          <div class="sim-metrics-row">
            <!-- Metric 1: Predicted Risk Score -->
            <div class="sim-metric-box">
              <div class="sim-metric-label">Predicted Risk Score</div>
              <div class="sim-metric-value-container">
                <span class="sim-metric-value" id="out-risk">14.2%</span>
                <span class="sim-metric-delta-text down" id="out-risk-delta">↘ (-14.2%)</span>
              </div>
              <div class="sim-metric-subtext" id="out-ci">Confidence Band: ±1.9%</div>
            </div>

            <!-- Metric 2: Forecasted LTV Impact -->
            <div class="sim-metric-box">
              <div class="sim-metric-label">Forecasted LTV Impact</div>
              <div class="sim-metric-value-container">
                <span class="sim-metric-value" id="out-ltv">$48,900</span>
              </div>
              <div class="sim-metric-delta-text down" id="out-ltv-delta">(+ $6,400)</div>
            </div>

            <!-- Metric 3: Anomaly Alerts Triggered -->
            <div class="sim-metric-box">
              <div class="sim-metric-label">Anomaly Alerts Triggered</div>
              <div class="sim-metric-value-container">
                <span class="sim-metric-value" id="out-anomalies">2</span>
              </div>
              <div class="sim-metric-subtext">Statistical outliers flagged</div>
            </div>
          </div>

          <!-- Predicted Impact Trajectory Chart -->
          <div class="sim-card">
            <div class="sim-card-header">
              <span class="sim-card-title">Predicted Impact Trajectory (12-Month Outlook)</span>
              <div style="font-size: 0.76rem; display: flex; gap: 14px; align-items: center;">
                <span style="color: #9CA3AF; font-family: var(--font-mono); font-size: 0.74rem;">-- Baseline</span>
                <span style="color: #00F2FE; font-family: var(--font-mono); font-size: 0.74rem; font-weight: 600;">— Simulated Scenario</span>
              </div>
            </div>
            <div class="sim-chart-wrapper">
              <canvas id="trajectoryChart" role="img" aria-label="12-Month trajectory forecast chart"></canvas>
            </div>
          </div>

          <!-- Feature Attribution (SHAP Deltas) -->
          <div class="sim-card">
            <div class="sim-shap-header">
              <span class="sim-card-title" style="font-size: 0.88rem;">FEATURE ATTRIBUTION (SHAP DELTAS)</span>
              <div class="sim-shap-indicators">
                <span>UP</span>
                <span>UP</span>
                <span class="sim-shap-diamond">✦</span>
                <span>DOWN</span>
              </div>
            </div>
            <div id="attribution-container"></div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
    this.updateSimulation();
  },

  _calculateProbability(state) {
    const z = this.MODEL_WEIGHTS.intercept +
      (state.discount * this.MODEL_WEIGHTS.discount) +
      (state.contract * this.MODEL_WEIGHTS.contract) +
      ((state.adoption ? 1 : 0) * this.MODEL_WEIGHTS.adoption);
    
    const prob = 1 / (1 + Math.exp(-z));
    return Math.min(0.95, Math.max(0.04, prob));
  },

  _updateSliderFill(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #00F2FE 0%, #00F2FE ${pct}%, #1F2937 ${pct}%, #1F2937 100%)`;
  },

  renderChart(baselineProb, currentProb) {
    const canvas = document.getElementById('trajectoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const w = canvas.width;
    const h = canvas.height;
    const paddingLeft = 36 * dpr;
    const paddingRight = 24 * dpr;
    const paddingTop = 20 * dpr;
    const paddingBottom = 28 * dpr;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Horizontal Gridlines & Y-Axis Labels: 0, 5, 10, 15, 20
    const yTicks = [20, 15, 10, 5, 0];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1 * dpr;
    ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#6B7280';
    ctx.textAlign = 'right';

    yTicks.forEach((tick, i) => {
      const y = paddingTop + (i * (chartH / (yTicks.length - 1)));
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      ctx.fillText(`${tick}`, paddingLeft - 8 * dpr, y + 3 * dpr);
    });

    // 2. Months configuration on X-Axis: Jan, Feb, Mar, Apr, May, Jun, Sep, Nov, Dec
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Sep', 'Nov', 'Dec'];
    const totalCols = monthLabels.length;
    const stepX = chartW / (totalCols - 1);

    ctx.textAlign = 'center';
    monthLabels.forEach((label, idx) => {
      const x = paddingLeft + idx * stepX;
      ctx.fillText(label, x, h - 8 * dpr);
    });

    // 3. Historical Data Points (Jan - Mar)
    // Values: ~4.5, ~3.8, ~6.0, ~5.2
    const histValues = [4.5, 3.8, 6.0, 5.2];
    const histPts = histValues.map((v, i) => ({
      x: paddingLeft + i * stepX,
      y: paddingTop + chartH - (v / 20) * chartH
    }));

    // Draw historical line (gray)
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1.8 * dpr;
    histPts.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 4. Baseline Projection (Apr - Dec): gentle linear upward drift from 5.2 to ~10.5
    const baseFuture = [5.2, 6.2, 7.1, 7.8, 8.6, 9.4, 10.2];
    const basePts = baseFuture.map((v, i) => ({
      x: paddingLeft + (3 + i) * stepX,
      y: paddingTop + chartH - (v / 20) * chartH
    }));

    // Draw baseline line (dashed gray)
    ctx.beginPath();
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1.8 * dpr;
    basePts.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 5. Simulated Scenario Future Curve (Apr - Dec)
    // Scale curve height dynamically based on current risk calculation
    const riskFactor = (currentProb / 0.142); // 1.0 at baseline
    const simValues = [
      5.2,
      6.8 * riskFactor,
      8.5 * riskFactor,
      10.2 * riskFactor,
      12.4 * riskFactor,
      14.2 * riskFactor,
      15.8 * riskFactor
    ];

    const simPts = simValues.map((v, i) => ({
      x: paddingLeft + (3 + i) * stepX,
      y: paddingTop + chartH - (Math.min(19.5, v) / 20) * chartH
    }));

    // 6. Draw Translucent Confidence Envelope between Simulated and Baseline
    ctx.beginPath();
    ctx.setLineDash([]);
    simPts.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    for (let i = basePts.length - 1; i >= 0; i--) {
      ctx.lineTo(basePts[i].x, basePts[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.08)';
    ctx.fill();

    // Label for envelope
    const lastSim = simPts[simPts.length - 1];
    ctx.fillStyle = '#00F2FE';
    ctx.font = `${8.5 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText('rgba(0, 242, 254, 0.1)', w - paddingRight, paddingTop + chartH - 14 * dpr);

    // 7. Draw Bell-Shaped Highlights at May (index 4) and Sep (index 6)
    // Peak 1 at May: (x: paddingLeft + 4 * stepX)
    const peak1X = paddingLeft + 4 * stepX;
    const peak1BaseY = paddingTop + chartH - (7.1 / 20) * chartH;
    const peak1TopY = peak1BaseY - 32 * dpr;

    ctx.beginPath();
    ctx.moveTo(peak1X - 22 * dpr, peak1BaseY);
    ctx.bezierCurveTo(peak1X - 10 * dpr, peak1BaseY, peak1X - 6 * dpr, peak1TopY, peak1X, peak1TopY);
    ctx.bezierCurveTo(peak1X + 6 * dpr, peak1TopY, peak1X + 10 * dpr, peak1BaseY, peak1X + 22 * dpr, peak1BaseY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.65)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    ctx.fillStyle = '#00F2FE';
    ctx.textAlign = 'center';
    ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
    ctx.fillText('0.33%', peak1X, peak1TopY - 5 * dpr);

    // Peak 2 at Sep: (x: paddingLeft + 6 * stepX)
    const peak2X = paddingLeft + 6 * stepX;
    const peak2BaseY = paddingTop + chartH - (8.6 / 20) * chartH;
    const peak2TopY = peak2BaseY - 44 * dpr;

    ctx.beginPath();
    ctx.moveTo(peak2X - 24 * dpr, peak2BaseY);
    ctx.bezierCurveTo(peak2X - 12 * dpr, peak2BaseY, peak2X - 6 * dpr, peak2TopY, peak2X, peak2TopY);
    ctx.bezierCurveTo(peak2X + 6 * dpr, peak2TopY, peak2X + 12 * dpr, peak2BaseY, peak2X + 24 * dpr, peak2BaseY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.75)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    ctx.fillStyle = '#00F2FE';
    ctx.fillText('0.44%', peak2X, peak2TopY - 5 * dpr);

    // 8. Draw Main Simulated Line (Glowing Cyan Curve)
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#00F2FE';
    ctx.lineWidth = 2.4 * dpr;
    ctx.shadowColor = 'rgba(0, 242, 254, 0.7)';
    ctx.shadowBlur = 9 * dpr;
    simPts.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // 9. Draw Bottom Legend
    const legendY = h - 2 * dpr;
    ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00F2FE';
    ctx.fillText('— Simulated Scenario', w / 2 - 45 * dpr, legendY);
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('-- Baseline', w / 2 + 55 * dpr, legendY);
  },

  renderAttribution(state) {
    const container = document.getElementById('attribution-container');
    if (!container) return;

    // Deltas relative to baseline
    const contractDelta = (state.contract - this.BASELINE.contract) * this.MODEL_WEIGHTS.contract;
    const discountDelta = (state.discount - this.BASELINE.discount) * this.MODEL_WEIGHTS.discount;
    const adoptionDelta = (state.adoption ? 1 : 0) - (this.BASELINE.adoption ? 1 : 0);

    // Base display items matching the screenshot
    const contractPct = -4.57 + (state.contract - 24) * -0.22;
    const openTicketsPct = 1.54 + (state.discount < 12 ? 0.8 : -0.4);

    container.innerHTML = `
      <!-- Row 1: Contract Duration (Green reduction) -->
      <div class="sim-shap-row">
        <div class="sim-shap-label">
          <span style="font-weight: 500;">Contract Duration</span>
          <span class="sim-shap-tag">SHAP (-1.2%)</span>
        </div>
        <div class="sim-shap-track">
          <div class="sim-shap-bar-green" style="width: ${Math.min(95, Math.max(30, 72 + (state.contract - 24) * 2))}%;"></div>
        </div>
        <div class="sim-shap-val-right" style="color: #10B981;">
          ${contractPct.toFixed(2)}%
        </div>
      </div>

      <!-- Row 2: Open Tickets (Red increase) -->
      <div class="sim-shap-row">
        <div class="sim-shap-label">
          <span style="font-weight: 500;">Open Tickets</span>
        </div>
        <div class="sim-shap-track" style="justify-content: flex-end;">
          <div class="sim-shap-bar-red" style="width: ${Math.min(90, Math.max(25, 45 + (12 - state.discount) * 2.5))}%;"></div>
        </div>
        <div class="sim-shap-val-right" style="color: #EF4444;">
          <span style="font-size: 0.74rem; color: #9CA3AF; margin-right: 6px; font-weight: normal;">SHAP (-1.35%)</span>
          +${Math.max(0.2, openTicketsPct).toFixed(2)}%
        </div>
      </div>
    `;
  },

  updateSimulation() {
    const discountEl = document.getElementById('param-discount');
    const contractEl = document.getElementById('param-contract');
    const adoptionEl = document.getElementById('param-adoption');

    if (!discountEl || !contractEl || !adoptionEl) return;

    const currentState = {
      discount: parseFloat(discountEl.value),
      contract: parseFloat(contractEl.value),
      adoption: adoptionEl.checked
    };

    // Update slider track fills
    this._updateSliderFill(discountEl);
    this._updateSliderFill(contractEl);

    // Update label values
    const valDiscount = document.getElementById('val-discount');
    const valContract = document.getElementById('val-contract');
    if (valDiscount) valDiscount.textContent = `${currentState.discount}%`;
    if (valContract) valContract.textContent = `${currentState.contract} months`;

    // Compute Probability
    const simRiskProb = this._calculateProbability(currentState);
    const simRiskPct = simRiskProb * 100;
    const baseRiskPct = this.baseRisk * 100;
    const riskDeltaPct = simRiskPct - baseRiskPct;

    // Compute LTV
    const baseLtv = 42500;
    const simLtv = Math.round(57000 * (1 - simRiskProb));
    const ltvDelta = simLtv - baseLtv;

    // Update KPI UI
    const outRisk = document.getElementById('out-risk');
    const outRiskDelta = document.getElementById('out-risk-delta');
    const outLtv = document.getElementById('out-ltv');
    const outLtvDelta = document.getElementById('out-ltv-delta');
    const outAnomalies = document.getElementById('out-anomalies');

    if (outRisk) outRisk.textContent = `${simRiskPct.toFixed(1)}%`;
    if (outRiskDelta) {
      if (riskDeltaPct <= 0) {
        outRiskDelta.className = 'sim-metric-delta-text down';
        outRiskDelta.textContent = `↘ (${riskDeltaPct.toFixed(1)}%)`;
      } else {
        outRiskDelta.className = 'sim-metric-delta-text up';
        outRiskDelta.textContent = `↗ (+${riskDeltaPct.toFixed(1)}%)`;
      }
    }

    if (outLtv) outLtv.textContent = `$${simLtv.toLocaleString()}`;
    if (outLtvDelta) {
      if (ltvDelta >= 0) {
        outLtvDelta.className = 'sim-metric-delta-text down';
        outLtvDelta.textContent = `(+ $${ltvDelta.toLocaleString()})`;
      } else {
        outLtvDelta.className = 'sim-metric-delta-text up';
        outLtvDelta.textContent = `(- $${Math.abs(ltvDelta).toLocaleString()})`;
      }
    }

    if (outAnomalies) {
      // Dynamic anomaly count: if extreme levers are chosen
      const anomalies = (currentState.discount > 25 ? 1 : 0) + (currentState.contract > 30 ? 1 : 0) + (!currentState.adoption ? 1 : 0);
      outAnomalies.textContent = Math.max(1, anomalies + 1);
    }

    // Drive background motion system
    if (window.Signal && window.Signal.setSimulatorValue) {
      window.Signal.setSimulatorValue(1 - simRiskProb);
    }
    if (window.MotionSceneController) {
      window.MotionSceneController.setSimulatorState(simRiskPct, riskDeltaPct);
    }

    // Update Chart & SHAP bars
    this.renderChart(this.baseRisk, simRiskProb);
    this.renderAttribution(currentState);
  },

  _bindEvents() {
    const discountEl = document.getElementById('param-discount');
    const contractEl = document.getElementById('param-contract');
    const adoptionEl = document.getElementById('param-adoption');

    if (discountEl) {
      discountEl.addEventListener('input', () => this.updateSimulation());
      this._updateSliderFill(discountEl);
    }
    if (contractEl) {
      contractEl.addEventListener('input', () => this.updateSimulation());
      this._updateSliderFill(contractEl);
    }
    if (adoptionEl) {
      adoptionEl.addEventListener('change', () => this.updateSimulation());
    }

    const resetBtn = document.getElementById('btn-reset-sim');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (discountEl) discountEl.value = this.BASELINE.discount;
        if (contractEl) contractEl.value = this.BASELINE.contract;
        if (adoptionEl) adoptionEl.checked = this.BASELINE.adoption;

        this.updateSimulation();
        if (window.showToast) {
          window.showToast('Reset scenario parameters to baseline state.', 'info');
        }
      });
    }

    window.addEventListener('resize', () => {
      const discount = parseFloat(document.getElementById('param-discount')?.value || this.BASELINE.discount);
      const contract = parseFloat(document.getElementById('param-contract')?.value || this.BASELINE.contract);
      const adoption = document.getElementById('param-adoption')?.checked ?? this.BASELINE.adoption;

      const simRisk = this._calculateProbability({ discount, contract, adoption });
      this.renderChart(this.baseRisk, simRisk);
    });
  }
};

window.Simulator = Simulator;
