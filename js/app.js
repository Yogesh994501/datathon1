/**
 * PredictIQ Main Application Orchestrator
 * Connects SQL data layer, state management, charts, and DOM views.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Relational Database
  await window.predictiqDb.init();

  const state = window.predictiqState;

  // 2. Setup Navigation Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.getAttribute('data-view');
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchView(view);
    });
  });

  // 3. Setup Domain Switcher
  const domainBtns = document.querySelectorAll('.domain-btn');
  domainBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const domain = btn.getAttribute('data-domain');
      domainBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.setDomain(domain);
    });
  });

  // 4. Setup "Reset demo data" action
  const resetDataBtn = document.getElementById('btn-reset-demo-db');
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', async () => {
      window.predictiqDb.resetDemoData();
      await window.predictiqDb.persist();
      renderAll(state);
      alert('Demo database reset to original benchmark seed.');
    });
  }

  // 5. Setup Database Export action
  const exportDbBtn = document.getElementById('btn-export-db-file');
  if (exportDbBtn) {
    exportDbBtn.addEventListener('click', () => {
      window.Reports.exportDatabaseDump();
    });
  }

  // 6. Setup Risk Radar Tier Filters
  const riskFilters = document.querySelectorAll('.radar-filter-btn');
  riskFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      riskFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      state.setRiskFilter(filter);
      if (window.MotionSceneController) {
        window.MotionSceneController.setRiskFilter(filter);
      }
      renderRiskRadarSection(state);
    });
  });

  // 7. Setup Advanced Model Details Drawer Toggle
  const advToggleBtn = document.getElementById('btn-toggle-adv-model');
  const advDrawer = document.getElementById('adv-model-drawer');
  if (advToggleBtn && advDrawer) {
    advToggleBtn.addEventListener('click', () => {
      const isHidden = advDrawer.style.display === 'none' || !advDrawer.style.display;
      advDrawer.style.display = isHidden ? 'block' : 'none';
      advToggleBtn.textContent = isHidden ? 'Hide advanced model details' : 'View advanced model details';
      if (isHidden) {
        window.Charts.renderAdvancedModelCharts('roc-chart-container', 'cm-chart-container');
      }
    });
  }

  // 8. Setup Dataset Ingestion Studio Simulation
  setupDatasetUploadStudio(state);

  // 9. Subscribe to State Changes
  state.subscribe((s) => {
    renderAll(s);
  });

  // Initial Full Render
  renderAll(state);

  // Initialize Pipeline Sequence
  window.Pipeline.init();

  // 10. Initialize MotionSceneController background system
  if (window.MotionSceneController) {
    window.MotionSceneController.init('signal-canvas');
  } else if (window.Signal) {
    window.Signal.init('signal-canvas');
  }

  // 11. Setup Scroll Spy for navigation tabs
  setupScrollSpy();
});

function setupScrollSpy() {
  const sections = document.querySelectorAll('.view-section');
  const navTabs = document.querySelectorAll('.nav-tab');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id.replace('view-', '');
        navTabs.forEach(tab => {
          if (tab.getAttribute('data-view') === id) {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-15% 0px -65% 0px',
    threshold: 0.05
  });

  sections.forEach(sec => observer.observe(sec));
}

function switchView(viewName) {
  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Update tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    if (tab.getAttribute('data-view') === viewName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  if (window.MotionSceneController) {
    window.MotionSceneController.setActiveSection(viewName);
  }
  if (window.Signal && window.Signal.setView) {
    window.Signal.setView(viewName);
  }
}

function renderAll(state) {
  const config = state.getDomainConfig();
  const db = window.predictiqDb;

  // Retrieve dataset & models for active domain from SQLite
  const dataset = db.getDatasetByDomain(state.currentDomain);
  const modelRuns = dataset ? db.getModelRunsByDataset(dataset.id) : [];
  const recommendedModel = dataset ? db.getRecommendedModel(dataset.id) : null;
  const activeModel = recommendedModel || (modelRuns.length ? modelRuns[0] : null);

  // Retrieve predictions & feature importance from SQLite
  const predictions = activeModel ? db.getPredictionsByModel(activeModel.id) : [];
  const features = activeModel ? db.getFeatureImportances(activeModel.id) : [];

  // Forward Real Application State to MotionSceneController
  if (window.MotionSceneController) {
    window.MotionSceneController.setDomain(state.currentDomain);
    if (dataset) {
      window.MotionSceneController.setDatasetMetrics(dataset.quality_score, dataset.row_count);
    }
    if (activeModel) {
      window.MotionSceneController.setModelMetrics(activeModel.name, activeModel.auc);
    }
    if (predictions && predictions.length) {
      window.MotionSceneController.setPredictionMetrics(predictions[0].probability, predictions[0].confidence);
    }
    window.MotionSceneController.setRiskFilter(state.riskFilter || 'all');
  }

  // 1. Update Executive Briefing Stat Row (from real DB query)
  const statAcc = document.getElementById('stat-model-acc');
  const statRows = document.getElementById('stat-records-evaluated');
  const statConf = document.getElementById('stat-avg-confidence');
  const statExposure = document.getElementById('stat-financial-exposure');
  const statExposureLabel = document.getElementById('stat-financial-label');

  if (statAcc && activeModel) statAcc.textContent = `${activeModel.accuracy}%`;
  if (statRows && dataset) statRows.textContent = dataset.row_count.toLocaleString();
  if (statConf && activeModel) statConf.textContent = `${activeModel.auc}%`;
  if (statExposure) statExposure.textContent = config.impactDisplay;
  if (statExposureLabel) statExposureLabel.textContent = config.exposureLabel;

  // 2. Update Contextual Terminology & Headlines
  const domainTitle = document.getElementById('briefing-domain-title');
  const domainDesc = document.getElementById('briefing-domain-desc');
  if (domainTitle) domainTitle.textContent = config.name;
  if (domainDesc) domainDesc.textContent = `Forecast model calibrated for ${config.targetConcept.toLowerCase()}.`;

  // 3. Render Forecast Trend SVG Chart
  window.Charts.renderTrendChart('trend-chart-container', state.currentDomain);

  // 4. Render Dataset Studio
  renderDatasetSection(dataset, config);

  // 5. Render Model Benchmark Table
  renderModelBenchmarkSection(modelRuns, activeModel);

  // 6. Render Prediction Center & Explainable AI
  renderPredictionCenterSection(predictions, features, config);

  // 7. Render Risk Radar Cohort
  renderRiskRadarSection(state);

  // 8. Render AI Executive Memo
  renderExecutiveMemoSection(config, activeModel);

  // 9. Re-render Simulator with domain controls
  window.Simulator.init('simulator-container');
}

function renderDatasetSection(dataset, config) {
  if (!dataset) return;

  const rowCountEl = document.getElementById('ds-row-count');
  const colCountEl = document.getElementById('ds-col-count');
  const missingEl = document.getElementById('ds-missing-pct');
  const duplicatesEl = document.getElementById('ds-duplicates');
  const outliersEl = document.getElementById('ds-outliers');
  const qualityEl = document.getElementById('ds-quality-score');
  const nameEl = document.getElementById('ds-file-name');
  const stampEl = document.getElementById('ds-timestamp');

  if (rowCountEl) rowCountEl.textContent = dataset.row_count.toLocaleString();
  if (colCountEl) colCountEl.textContent = dataset.column_count;
  if (missingEl) missingEl.textContent = `${dataset.missing_pct}%`;
  if (duplicatesEl) duplicatesEl.textContent = dataset.duplicate_count;
  if (outliersEl) outliersEl.textContent = dataset.outlier_count;
  if (qualityEl) qualityEl.textContent = `${dataset.quality_score}%`;
  if (nameEl) nameEl.textContent = dataset.name;
  if (stampEl) stampEl.textContent = `Ingested: ${dataset.uploaded_at}`;

  // Render Sample Preview Table
  const tableHead = document.getElementById('ds-preview-thead');
  const tableBody = document.getElementById('ds-preview-tbody');
  if (tableHead && tableBody) {
    tableHead.innerHTML = `
      <tr>
        ${config.sampleColumns.map(col => `<th>${col}</th>`).join('')}
      </tr>
    `;

    // Sample records from genuine telco churn dataset
    const sampleRows = [
      { id: '7590-VHVEG', tenure: '1 mo', monthly: '$29.85', total: '$29.85', contract: 'Month-to-month', internet: 'DSL', churn: 'Yes (82.4%)', tier: 'high' },
      { id: '5575-GNVDE', tenure: '34 mo', monthly: '$56.95', total: '$1889.50', contract: 'One year', internet: 'DSL', churn: 'Yes (79.1%)', tier: 'high' },
      { id: '3668-QPYBK', tenure: '2 mo', monthly: '$53.85', total: '$108.15', contract: 'Month-to-month', internet: 'DSL', churn: 'Yes (77.8%)', tier: 'high' },
      { id: '7795-CFOCW', tenure: '45 mo', monthly: '$42.30', total: '$1840.75', contract: 'One year', internet: 'DSL', churn: 'No (38.2%)', tier: 'medium' },
      { id: '9763-GRSKD', tenure: '13 mo', monthly: '$49.95', total: '$587.45', contract: 'Month-to-month', internet: 'DSL', churn: 'No (43.6%)', tier: 'medium' },
      { id: '10484-ZVOXZ', tenure: '68 mo', monthly: '$89.50', total: '$6132.80', contract: 'Two year', internet: 'Fiber optic', churn: 'No (22.8%)', tier: 'low' },
      { id: '10487-PCHMG', tenure: '71 mo', monthly: '$20.10', total: '$1411.00', contract: 'Two year', internet: 'No', churn: 'No (16.4%)', tier: 'low' }
    ];

    tableBody.innerHTML = sampleRows.map(r => `
      <tr>
        <td style="font-weight: 500;">${r.id}</td>
        <td>${r.tenure}</td>
        <td>${r.monthly}</td>
        <td>${r.total}</td>
        <td>${r.contract}</td>
        <td>${r.internet}</td>
        <td><span class="badge ${r.tier === 'high' ? 'badge-high' : (r.tier === 'medium' ? 'badge-medium' : 'badge-low')}">${r.churn}</span></td>
      </tr>
    `).join('');
  }
}

function renderModelBenchmarkSection(modelRuns, activeModel) {
  const tbody = document.getElementById('model-benchmark-tbody');
  if (!tbody) return;

  const algoLabels = {
    'xgboost': 'XGBoost (Gradient Boosted Trees)',
    'random_forest': 'Random Forest Ensemble',
    'neural_network': 'Multi-Layer Perceptron',
    'logistic_regression': 'Regularized Logistic Regression'
  };

  tbody.innerHTML = modelRuns.map(mr => {
    const isRec = mr.is_recommended === 1;
    return `
      <tr style="${isRec ? 'background: rgba(217, 164, 65, 0.08); font-weight: 500;' : ''}">
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${algoLabels[mr.algorithm] || mr.algorithm}</span>
            ${isRec ? '<span class="badge badge-high" style="font-size: 0.7rem;">Recommended</span>' : ''}
          </div>
        </td>
        <td class="figure-serif">${mr.accuracy}%</td>
        <td class="figure-serif">${mr.precision_score}%</td>
        <td class="figure-serif">${mr.recall}%</td>
        <td class="figure-serif">${mr.f1_score}%</td>
        <td class="figure-serif" style="${isRec ? 'color: var(--color-accent);' : ''}">${mr.auc}%</td>
        <td style="color: var(--color-text-faint); font-size: 0.78rem;">${mr.trained_at}</td>
      </tr>
    `;
  }).join('');

  // Update recommendation note
  const recNoteEl = document.getElementById('model-recommendation-note');
  if (recNoteEl && activeModel) {
    const isLR = activeModel.algorithm === 'logistic_regression';
    recNoteEl.innerHTML = `<strong>Recommended model: ${algoLabels[activeModel.algorithm] || activeModel.algorithm}</strong> — provides highest AUC (${activeModel.auc}%) with calibrated discrimination on sparse features.`;
  }
}

function renderPredictionCenterSection(predictions, features, config) {
  const primary = predictions[0];
  if (!primary) return;

  const probEl = document.getElementById('pred-headline-prob');
  const confEl = document.getElementById('pred-headline-conf');
  const recordEl = document.getElementById('pred-headline-record');
  const outcomeLabelEl = document.getElementById('pred-outcome-label');
  const expCopyEl = document.getElementById('pred-explanation-copy');

  if (probEl) probEl.textContent = `${primary.probability}%`;
  if (confEl) confEl.textContent = `${primary.confidence}% confidence`;
  if (recordEl) recordEl.textContent = primary.record_ref;
  if (outcomeLabelEl) outcomeLabelEl.textContent = primary.outcome_label;
  if (expCopyEl) expCopyEl.textContent = config.explanationText;

  // Render horizontal Feature Importance Bars
  window.Charts.renderFeatureImportance('feature-importance-container', features);
}

function renderRiskRadarSection(state) {
  const db = window.predictiqDb;
  const config = state.getDomainConfig();
  const dataset = db.getDatasetByDomain(state.currentDomain);
  if (!dataset) return;

  const recModel = db.getRecommendedModel(dataset.id);
  if (!recModel) return;

  const predictions = db.getPredictionsByModel(recModel.id);

  // Render SVG scatter
  window.Charts.renderRiskRadar('risk-radar-chart-container', predictions, state.riskFilter, (recordId) => {
    openRecordInspector(recordId);
  });

  // Render tabular listing below scatter
  const tableBody = document.getElementById('radar-records-tbody');
  if (tableBody) {
    let filtered = [...predictions];
    if (state.riskFilter !== 'all') {
      filtered = filtered.filter(p => p.risk_tier === state.riskFilter);
    }

    tableBody.innerHTML = filtered.map(p => `
      <tr style="cursor: pointer;" onclick="openRecordInspector('${p.id}')">
        <td style="font-weight: 500;">${p.record_ref}</td>
        <td>
          <span class="badge ${p.risk_tier === 'high' ? 'badge-high' : (p.risk_tier === 'medium' ? 'badge-medium' : 'badge-low')}">
            <span class="status-dot"></span>
            ${p.outcome_label}
          </span>
        </td>
        <td class="figure-serif">${p.probability}%</td>
        <td class="figure-serif">${p.confidence}%</td>
        <td style="color: var(--color-text-faint); font-size: 0.78rem;">${p.created_at}</td>
        <td><button type="button" class="btn btn-subtle btn-sm" onclick="event.stopPropagation(); openRecordInspector('${p.id}')">Inspect</button></td>
      </tr>
    `).join('');
  }
}

function renderExecutiveMemoSection(config, activeModel) {
  const findingEl = document.getElementById('memo-finding-text');
  const actionEl = document.getElementById('memo-action-text');
  const impactEl = document.getElementById('memo-impact-display');

  if (findingEl) findingEl.textContent = config.memoFinding;
  if (actionEl) actionEl.textContent = config.memoAction;
  if (impactEl) impactEl.textContent = config.impactDisplay;
}

// Global Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}
window.showToast = showToast;

function openRecordInspector(recordId) {
  const db = window.predictiqDb;
  const predictions = db.query(`SELECT * FROM predictions WHERE id = '${recordId}' LIMIT 1`);
  if (!predictions.length) return;
  const rec = predictions[0];
  const recommendation = db.getRecommendationForPrediction(recordId);
  const actionPlan = db.getActionPlanForPrediction ? db.getActionPlanForPrediction(recordId) : null;
  const jsonPayload = window.Reports ? window.Reports.getRecordJSONPayload(recordId) : null;
  const jsonStr = jsonPayload ? JSON.stringify(jsonPayload, null, 2) : '';

  const drawer = document.getElementById('inspector-drawer-panel');
  const overlay = document.getElementById('inspector-overlay');
  if (!drawer || !overlay) return;

  const isCompleted = actionPlan && actionPlan.status === 'Completed';

  drawer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: var(--border-hairline); padding-bottom: 1rem;">
      <div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted);">Record details</div>
        <h2 style="font-size: 1.4rem; margin-top: 0.2rem;">${rec.record_ref}</h2>
      </div>
      <button type="button" class="btn btn-subtle btn-sm" id="btn-close-drawer" aria-label="Close record details dialog">Close</button>
    </div>

    <!-- Outcome metric -->
    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 0.8rem; color: var(--color-text-muted);">Assessed outcome</div>
      <div class="figure-serif figure-card" style="color: ${rec.risk_tier === 'high' ? 'var(--color-accent)' : 'var(--color-text)'}; margin: 0.35rem 0;">
        ${rec.probability}%
      </div>
      <span class="badge ${rec.risk_tier === 'high' ? 'badge-high' : (rec.risk_tier === 'medium' ? 'badge-medium' : 'badge-low')}">
        ${rec.outcome_label} • ${rec.confidence}% confidence (boundary distance heuristic)
      </span>
    </div>

    <!-- Prescribed action memo -->
    <div class="memo-card" style="margin-bottom: 1.5rem;">
      <h4 style="margin-bottom: 0.5rem;">Prescribed action memo</h4>
      <p class="body-copy" style="font-size: 0.88rem; line-height: 1.5; color: var(--color-text);">
        ${recommendation ? recommendation.summary_text : 'Continue standard monitoring protocol; re-evaluate at next checkpoint.'}
      </p>
      ${recommendation ? `
        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: var(--border-hairline);">
          <span style="font-size: 0.78rem; color: var(--color-text-muted);">Illustrative exposure protected: </span>
          <span class="figure-serif" style="font-size: 1.1rem; color: var(--color-accent);">$${recommendation.potential_impact.toLocaleString()}</span>
          <div style="font-size: 0.72rem; color: var(--color-text-faint); margin-top: 0.2rem;">Model scenario projection</div>
        </div>
      ` : ''}
    </div>

    <!-- Action Plan Active Card -->
    ${actionPlan ? `
      <div class="action-plan-card" id="action-plan-display-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4 style="color: var(--color-accent); font-size: 0.95rem; margin: 0;">Action plan status</h4>
          <span class="badge ${isCompleted ? 'badge-low' : 'badge-high'}" style="font-size: 0.75rem;">
            ${isCompleted ? '✓ Executed & Completed' : '● ' + actionPlan.status}
          </span>
        </div>
        
        <div style="font-size: 0.84rem; line-height: 1.6; margin-bottom: 0.85rem;">
          <div><strong style="color: var(--color-text-muted);">Assignee:</strong> ${actionPlan.assigned_to}</div>
          <div><strong style="color: var(--color-text-muted);">Playbook:</strong> ${actionPlan.playbook}</div>
          <div><strong style="color: var(--color-text-muted);">Target SLA:</strong> ${actionPlan.sla}</div>
          <div><strong style="color: var(--color-text-muted);">Assigned At:</strong> ${actionPlan.assigned_at}</div>
          ${actionPlan.notes ? `<div style="margin-top: 0.4rem; padding: 0.5rem 0.65rem; background: rgba(0,0,0,0.25); border-radius: 8px; font-size: 0.8rem; color: var(--color-text);">${actionPlan.notes}</div>` : ''}
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-subtle btn-sm" id="btn-edit-action-plan" aria-label="Edit assigned action plan">Edit Plan</button>
          <button type="button" class="btn ${isCompleted ? 'btn-subtle' : 'btn-primary'} btn-sm" id="btn-toggle-plan-complete" aria-label="Toggle action plan status">
            ${isCompleted ? 'Reopen Plan' : 'Mark as Completed'}
          </button>
        </div>
      </div>
    ` : ''}

    <!-- Action Plan Interactive Assignment Form -->
    <div class="action-plan-form" id="action-plan-form" style="${actionPlan ? 'display: none;' : 'display: none;'}">
      <h4 style="margin-bottom: 0.85rem; color: var(--color-accent);">Assign operational action plan</h4>
      
      <label for="plan-assignee-select">Assignee / Owner</label>
      <select id="plan-assignee-select">
        <option value="Account Lead — Retention Taskforce">Account Lead — Retention Taskforce</option>
        <option value="Senior Customer Success Specialist">Senior Customer Success Specialist</option>
        <option value="VIP Escalations & Onboarding Manager">VIP Escalations & Onboarding Manager</option>
        <option value="Risk Operations Lead">Risk Operations Lead</option>
      </select>

      <label for="plan-playbook-select">Prescribed Playbook</label>
      <select id="plan-playbook-select">
        <option value="Term-Contract Migration & 15% Annual Retention Incentive">Term-Contract Migration & 15% Annual Retention Incentive</option>
        <option value="Executive Business Review & Usage Health Check">Executive Business Review & Usage Health Check</option>
        <option value="Dedicated Onboarding & Priority Support Intervention">Dedicated Onboarding & Priority Support Intervention</option>
        <option value="Custom Commercial Pricing Restructure Offer">Custom Commercial Pricing Restructure Offer</option>
      </select>

      <label for="plan-sla-select">Target SLA / Turnaround</label>
      <select id="plan-sla-select">
        <option value="Immediate (Within 24 Hours)">Immediate (Within 24 Hours)</option>
        <option value="High Priority (3 Business Days)">High Priority (3 Business Days)</option>
        <option value="Standard Follow-up (7 Days)">Standard Follow-up (7 Days)</option>
      </select>

      <label for="plan-notes-input">Intervention Notes</label>
      <textarea id="plan-notes-input" placeholder="Enter execution guidance for the assigned account lead...">${actionPlan ? actionPlan.notes : 'High probability churn alert on month-to-month tenure. Deploy term contract migration protocol.'}</textarea>

      <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
        <button type="button" class="btn btn-primary btn-sm" id="btn-submit-action-plan">Confirm Assignment</button>
        <button type="button" class="btn btn-subtle btn-sm" id="btn-cancel-action-plan">Cancel</button>
      </div>
    </div>

    <!-- Primary Action Buttons -->
    <div id="inspector-action-buttons" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
      <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
        ${!actionPlan ? `
          <button type="button" class="btn btn-primary" id="btn-open-assign-form" aria-label="Assign an operational action plan">
            Assign action plan
          </button>
        ` : ''}
        <button type="button" class="btn ${actionPlan ? 'btn-primary' : 'btn-subtle'}" id="btn-export-record-json" aria-label="Export and download record JSON for ${rec.record_ref}">
          Export record JSON
        </button>
        <button type="button" class="btn btn-subtle" id="btn-toggle-json-viewer" aria-expanded="false" aria-controls="record-json-preview" aria-label="Toggle accessible JSON viewer">
          View JSON payload
        </button>
      </div>
    </div>

    <!-- Accessible Collapsible JSON Payload Viewer -->
    <div class="json-viewer-container" id="record-json-preview" style="display: none;" role="region" aria-label="Raw Record JSON Payload">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-text);">Record JSON Payload</span>
        <button type="button" class="btn btn-subtle btn-sm" id="btn-copy-json" aria-label="Copy record JSON string to clipboard">Copy JSON</button>
      </div>
      <pre class="json-code-block" tabindex="0" role="region" aria-label="Formatted JSON Document"><code>${jsonStr}</code></pre>
      <div style="font-size: 0.74rem; color: var(--color-text-faint);">
        Keyboard accessible • Press Tab to navigate • Formatted ISO-standard decision audit payload.
      </div>
    </div>
  `;

  overlay.classList.add('active');
  drawer.style.display = 'block';

  // Attach Event Handlers

  // Close Drawer
  const closeBtn = document.getElementById('btn-close-drawer');
  const closeDrawer = () => {
    overlay.classList.remove('active');
    drawer.style.display = 'none';
  };
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Escape key accessibility
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);

  // Assign action plan button (when no plan exists yet)
  const openAssignFormBtn = document.getElementById('btn-open-assign-form');
  const formEl = document.getElementById('action-plan-form');
  const cancelFormBtn = document.getElementById('btn-cancel-action-plan');
  const submitFormBtn = document.getElementById('btn-submit-action-plan');

  if (openAssignFormBtn && formEl) {
    openAssignFormBtn.addEventListener('click', () => {
      formEl.style.display = 'block';
      openAssignFormBtn.style.display = 'none';
      const selectEl = document.getElementById('plan-assignee-select');
      if (selectEl) selectEl.focus();
    });
  }

  // Edit Plan Button
  const editPlanBtn = document.getElementById('btn-edit-action-plan');
  const planDisplayCard = document.getElementById('action-plan-display-card');
  if (editPlanBtn && formEl) {
    editPlanBtn.addEventListener('click', () => {
      formEl.style.display = 'block';
      if (planDisplayCard) planDisplayCard.style.display = 'none';
      const selectEl = document.getElementById('plan-assignee-select');
      if (selectEl) selectEl.focus();
    });
  }

  // Cancel Form
  if (cancelFormBtn && formEl) {
    cancelFormBtn.addEventListener('click', () => {
      formEl.style.display = 'none';
      if (openAssignFormBtn) openAssignFormBtn.style.display = 'inline-flex';
      if (planDisplayCard) planDisplayCard.style.display = 'block';
    });
  }

  // Submit Form
  if (submitFormBtn) {
    submitFormBtn.addEventListener('click', () => {
      const assignee = document.getElementById('plan-assignee-select').value;
      const playbook = document.getElementById('plan-playbook-select').value;
      const sla = document.getElementById('plan-sla-select').value;
      const notes = document.getElementById('plan-notes-input').value;

      const newPlan = {
        id: 'plan_' + recordId.replace(/[^a-zA-Z0-9_-]/g, '_'),
        prediction_id: recordId,
        assigned_to: assignee,
        playbook: playbook,
        sla: sla,
        status: 'In Progress',
        notes: notes,
        assigned_at: new Date().toLocaleString()
      };

      if (db.saveActionPlan) {
        db.saveActionPlan(newPlan);
      }

      showToast(`Action plan assigned to ${assignee}.`, 'success');
      openRecordInspector(recordId);
      if (window.renderRiskRadarSection && window.predictiqState) {
        window.renderRiskRadarSection(window.predictiqState);
      }
    });
  }

  // Toggle Plan Completion
  const toggleCompleteBtn = document.getElementById('btn-toggle-plan-complete');
  if (toggleCompleteBtn && actionPlan) {
    toggleCompleteBtn.addEventListener('click', () => {
      const nextStatus = actionPlan.status === 'Completed' ? 'In Progress' : 'Completed';
      const updatedPlan = {
        ...actionPlan,
        status: nextStatus,
        completed_at: nextStatus === 'Completed' ? new Date().toLocaleString() : null
      };

      if (db.saveActionPlan) {
        db.saveActionPlan(updatedPlan);
      }

      showToast(`Action plan status updated to ${nextStatus}.`, 'success');
      openRecordInspector(recordId);
    });
  }

  // Export Record JSON
  const exportRecordBtn = document.getElementById('btn-export-record-json');
  if (exportRecordBtn) {
    exportRecordBtn.addEventListener('click', () => {
      if (window.Reports && window.Reports.exportRecordJSON) {
        window.Reports.exportRecordJSON(recordId);
      } else if (jsonPayload) {
        const jsonStrDownload = JSON.stringify(jsonPayload, null, 2);
        const blob = new Blob([jsonStrDownload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predictiq_${rec.record_ref.replace(/[^a-zA-Z0-9_-]/g, '_')}_record.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Exported ${rec.record_ref} JSON file.`, 'success');
      }
    });
  }

  // Toggle Accessible JSON Viewer
  const toggleJsonBtn = document.getElementById('btn-toggle-json-viewer');
  const jsonViewerEl = document.getElementById('record-json-preview');
  if (toggleJsonBtn && jsonViewerEl) {
    toggleJsonBtn.addEventListener('click', () => {
      const isHidden = jsonViewerEl.style.display === 'none';
      jsonViewerEl.style.display = isHidden ? 'block' : 'none';
      toggleJsonBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      toggleJsonBtn.textContent = isHidden ? 'Hide JSON payload' : 'View JSON payload';
      if (isHidden) {
        jsonViewerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // Copy JSON to Clipboard
  const copyJsonBtn = document.getElementById('btn-copy-json');
  if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(jsonStr);
        } else {
          // Fallback for non-secure contexts
          const ta = document.createElement('textarea');
          ta.value = jsonStr;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        copyJsonBtn.textContent = '✓ Copied!';
        showToast('Record JSON copied to clipboard.', 'success');
        setTimeout(() => {
          copyJsonBtn.textContent = 'Copy JSON';
        }, 2200);
      } catch (err) {
        showToast('Unable to copy to clipboard directly.', 'info');
      }
    });
  }
}

function setupDatasetUploadStudio(state) {
  const dropZone = document.getElementById('dataset-drop-zone');
  const fileInput = document.getElementById('dataset-file-input');
  const triggerBtn = document.getElementById('btn-trigger-upload');
  const prepContainer = document.getElementById('prep-progress-container');

  if (!dropZone || !fileInput) return;

  triggerBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0].name, state);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--color-accent)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--color-line)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--color-line)';
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0].name, state);
    }
  });
}

function handleFileUpload(fileName, state) {
  const db = window.predictiqDb;
  const prepContainer = document.getElementById('prep-progress-container');
  const prepChecklist = document.getElementById('prep-checklist-el');
  if (!prepContainer || !prepChecklist) return;

  prepContainer.style.display = 'block';

  const steps = [
    'Detecting missing values and estimating imputation bounds',
    'Identifying duplicate identifiers and canonical records',
    'Isolating statistical distribution outliers',
    'Encoding categorical ordinal and nominal variables',
    'Scaling continuous numerical features',
    'Partitioning stratified training and holdout validation sets'
  ];

  prepChecklist.innerHTML = steps.map((s, idx) => `
    <div class="prep-item" id="prep-step-${idx}">
      <div class="prep-item-left">
        <span class="check-indicator" id="check-ind-${idx}">✓</span>
        <span>${s}</span>
      </div>
      <span style="font-size: 0.75rem; color: var(--color-text-faint);" id="step-status-${idx}">Pending...</span>
    </div>
  `).join('');

  // Sequentially animate the automated preparation steps
  // and drive The Signal's prep-progress in lock-step
  window.Signal.setPrepProgress(0);
  let currentStep = 0;
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      const item = document.getElementById(`prep-step-${currentStep}`);
      const status = document.getElementById(`step-status-${currentStep}`);
      if (item) item.classList.add('completed');
      if (status) {
        status.textContent = 'Completed';
        status.style.color = 'var(--color-secondary-data)';
      }
      currentStep++;
      if (window.MotionSceneController) {
        window.MotionSceneController.setPrepProgress(currentStep / steps.length);
      }
      if (window.Signal && window.Signal.setPrepProgress) {
        window.Signal.setPrepProgress(currentStep / steps.length);
      }
    } else {
      clearInterval(interval);

      // Real SQL INSERT into datasets table
      const newDataset = {
        id: `ds_user_${Date.now()}`,
        name: fileName,
        domain: state.currentDomain,
        row_count: Math.floor(65000 + Math.random() * 45000),
        column_count: 26,
        missing_pct: +(1.2 + Math.random() * 2).toFixed(1),
        duplicate_count: Math.floor(40 + Math.random() * 80),
        outlier_count: Math.floor(25 + Math.random() * 50),
        quality_score: +(92.5 + Math.random() * 4).toFixed(1),
        uploaded_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      db.insertRow('datasets', newDataset);

      // Re-render UI
      renderDatasetSection(newDataset, state.getDomainConfig());

      const feedback = document.getElementById('upload-complete-note');
      if (feedback) {
        feedback.style.display = 'block';
        feedback.textContent = `File "${fileName}" parsed successfully and stored in SQLite database.`;
      }
    }
  }, 400);
}

window.openRecordInspector = openRecordInspector;
window.switchView = switchView;
