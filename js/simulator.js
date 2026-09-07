/**
 * PredictIQ What-If Scenario Simulator
 * Interactive live recalculation of risk based on feature perturbations.
 * Database-free live recalculation, with optional "Save this scenario" writing to SQLite.
 */

const Simulator = {
  currentSimulatedProb: 87.4,
  baseProb: 87.4,

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.render();
  },

  render() {
    const state = window.predictiqState;
    if (!state) return;

    const config = state.getDomainConfig();
    this.baseProb = parseFloat(config.primaryProbability);
    this.currentSimulatedProb = this.baseProb;

    const slidersHtml = config.simulatorParams.map(param => `
      <div class="slider-group">
        <div class="slider-header">
          <label for="sim-${param.id}" style="color: var(--color-text); font-weight: 500;">${param.label}</label>
          <span class="slider-val" id="val-${param.id}">${param.default}${param.unit}</span>
        </div>
        <input 
          type="range" 
          id="sim-${param.id}" 
          class="briefing-slider" 
          min="${param.min}" 
          max="${param.max}" 
          step="${param.step}" 
          value="${param.default}"
          data-param-id="${param.id}"
          data-unit="${param.unit}"
          aria-label="${param.label}"
        />
      </div>
    `).join('');

    this.container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; align-items: start;">
        <div>
          <h3 style="margin-bottom: 0.5rem;">Input variable controls</h3>
          <p class="body-copy" style="margin-bottom: 1.5rem;">Adjust operational variables to evaluate sensitivity on the predicted outcome.</p>
          <form id="simulator-form" onsubmit="return false;">
            ${slidersHtml}
          </form>
          <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">
            <button type="button" class="btn btn-primary" id="btn-save-scenario">Save this scenario</button>
            <button type="button" class="btn btn-subtle" id="btn-reset-scenario">Reset baseline</button>
          </div>
          <div id="sim-save-feedback" style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--color-secondary-data); display: none;">
            Scenario saved to local SQLite database.
          </div>
        </div>

        <div style="background: var(--color-panel-alt); border: var(--border-hairline); border-radius: var(--radius-sm); padding: 1.5rem;">
          <h3 style="margin-bottom: 1.25rem;">Projected outcome comparison</h3>
          
          <div style="border-bottom: var(--border-hairline); padding-bottom: 1rem; margin-bottom: 1rem;">
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">Current baseline risk</div>
            <div class="figure-serif figure-card" style="color: var(--color-accent); margin-top: 0.25rem;">${this.baseProb.toFixed(1)}%</div>
            <div style="font-size: 0.8rem; color: var(--color-text-faint); margin-top: 0.25rem;">High risk tier</div>
          </div>

          <div style="border-bottom: var(--border-hairline); padding-bottom: 1rem; margin-bottom: 1rem;">
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">Simulated prospective risk</div>
            <div class="figure-serif figure-card" id="sim-outcome-val" style="color: var(--color-text); margin-top: 0.25rem;">${this.currentSimulatedProb.toFixed(1)}%</div>
            <div id="sim-delta-badge" class="badge badge-low" style="margin-top: 0.4rem;">
              0.0 percentage points
            </div>
          </div>

          <div>
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">Estimated exposure impact</div>
            <div class="figure-serif" id="sim-impact-val" style="font-size: 1.6rem; color: #EDEAE3; margin-top: 0.25rem;">
              $0 protected
            </div>
            <div style="font-size: 0.78rem; color: var(--color-text-faint); margin-top: 0.25rem;">
              Derived from ${config.exposureLabel.toLowerCase()}
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents(config);
  },

  _bindEvents(config) {
    const form = document.getElementById('simulator-form');
    if (!form) return;

    const sliders = form.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      slider.addEventListener('input', () => {
        const paramId = slider.getAttribute('data-param-id');
        const unit = slider.getAttribute('data-unit');
        const valEl = document.getElementById(`val-${paramId}`);
        if (valEl) valEl.textContent = `${slider.value}${unit}`;

        this._recalculate(config);
      });
    });

    const resetBtn = document.getElementById('btn-reset-scenario');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.render();
      });
    }

    const saveBtn = document.getElementById('btn-save-scenario');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this._saveScenarioToDb(config);
      });
    }
  },

  _recalculate(config) {
    const form = document.getElementById('simulator-form');
    if (!form) return;

    const sliders = form.querySelectorAll('input[type="range"]');
    let deltaSum = 0;

    sliders.forEach(s => {
      const min = parseFloat(s.min);
      const max = parseFloat(s.max);
      const val = parseFloat(s.value);
      const norm = (val - min) / (max - min); // 0 to 1
      // Sliders 0 and 1 reduce risk as they increase; slider 2 (tickets) increases risk
      const id = s.getAttribute('data-param-id');
      if (id === 'tickets') {
        deltaSum += (norm - 0.5) * 30; // complaints increase risk
      } else {
        deltaSum -= (norm - 0.5) * 35; // engagement / spend decrease risk
      }
    });

    let simulated = this.baseProb + deltaSum;
    if (simulated < 5) simulated = 5;
    if (simulated > 98) simulated = 98;
    this.currentSimulatedProb = simulated;

    // Drive The Signal & MotionSceneController live from slider state
    // Low simulated risk → high norm (calm line), high risk → low norm (chaotic)
    if (window.Signal && window.Signal.setSimulatorValue) {
      window.Signal.setSimulatorValue(1 - simulated / 100);
    }
    if (window.MotionSceneController) {
      window.MotionSceneController.setSimulatorState(simulated, deltaSum);
    }

    const outcomeEl = document.getElementById('sim-outcome-val');
    const deltaBadge = document.getElementById('sim-delta-badge');
    const impactEl = document.getElementById('sim-impact-val');

    if (outcomeEl) outcomeEl.textContent = `${simulated.toFixed(1)}%`;

    const delta = simulated - this.baseProb;
    if (deltaBadge) {
      if (delta <= -5) {
        deltaBadge.className = 'badge badge-low';
        deltaBadge.textContent = `${delta.toFixed(1)} percentage points (favorable)`;
      } else if (delta >= 5) {
        deltaBadge.className = 'badge badge-high';
        deltaBadge.textContent = `+${delta.toFixed(1)} percentage points (elevated)`;
      } else {
        deltaBadge.className = 'badge badge-medium';
        deltaBadge.textContent = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} percentage points`;
      }
    }

    if (impactEl) {
      const pctReduction = Math.max(0, -delta / 100);
      const protectedAmt = Math.round(config.primaryImpactVal * pctReduction);
      impactEl.textContent = `$${protectedAmt.toLocaleString()} protected`;
    }
  },

  _saveScenarioToDb(config) {
    if (!window.predictiqDb) return;

    const newRecord = {
      id: `pred_sim_${Date.now()}`,
      model_run_id: 'mr_ret_xgb',
      record_ref: `Scenario ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      outcome_label: this.currentSimulatedProb > 70 ? 'High Risk' : (this.currentSimulatedProb > 35 ? 'Medium Risk' : 'Low Risk'),
      probability: parseFloat(this.currentSimulatedProb.toFixed(1)),
      confidence: 93.0,
      risk_tier: this.currentSimulatedProb > 70 ? 'high' : (this.currentSimulatedProb > 35 ? 'medium' : 'low'),
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    window.predictiqDb.insertRow('predictions', newRecord);

    const feedback = document.getElementById('sim-save-feedback');
    if (feedback) {
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 3500);
    }
  }
};

window.Simulator = Simulator;
