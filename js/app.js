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
      <tr style="${isRec ? 'background: var(--color-panel-alt); font-weight: 500;' : ''}">
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

function openRecordInspector(recordId) {
  const db = window.predictiqDb;
  const predictions = db.query(`SELECT * FROM predictions WHERE id = '${recordId}' LIMIT 1`);
  if (!predictions.length) return;
  const rec = predictions[0];
  const recommendation = db.getRecommendationForPrediction(recordId);

  const drawer = document.getElementById('inspector-drawer-panel');
  const overlay = document.getElementById('inspector-overlay');
  if (!drawer || !overlay) return;

  drawer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: var(--border-hairline); padding-bottom: 1rem;">
      <div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted);">Record details</div>
        <h2 style="font-size: 1.4rem; margin-top: 0.2rem;">${rec.record_ref}</h2>
      </div>
      <button type="button" class="btn btn-subtle btn-sm" id="btn-close-drawer">Close</button>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 0.8rem; color: var(--color-text-muted);">Assessed outcome</div>
      <div class="figure-serif figure-card" style="color: ${rec.risk_tier === 'high' ? 'var(--color-accent)' : 'var(--color-text)'}; margin: 0.35rem 0;">
        ${rec.probability}%
      </div>
      <span class="badge ${rec.risk_tier === 'high' ? 'badge-high' : (rec.risk_tier === 'medium' ? 'badge-medium' : 'badge-low')}">
        ${rec.outcome_label} • ${rec.confidence}% confidence (boundary distance heuristic)
      </span>
    </div>

    <div class="panel" style="background: var(--color-panel-alt); margin-bottom: 1.5rem;">
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

    <div style="margin-top: 2rem; display: flex; gap: 0.5rem;">
      <button type="button" class="btn btn-primary" onclick="alert('Notification dispatched to account lead.')">Assign action plan</button>
      <button type="button" class="btn btn-subtle" onclick="window.Reports.exportPredictionsJSON()">Export record JSON</button>
    </div>
  `;

  overlay.classList.add('active');
  drawer.style.display = 'block';

  document.getElementById('btn-close-drawer').addEventListener('click', () => {
    overlay.classList.remove('active');
    drawer.style.display = 'none';
  });

  overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    drawer.style.display = 'none';
  });
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
