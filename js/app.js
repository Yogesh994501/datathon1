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
      await window.predictiqDb.clearSession();
      state.resetToDemo();
      const dot = document.getElementById('mode-status-dot');
      const txt = document.getElementById('mode-status-text');
      const badge = document.getElementById('mode-status-badge');
      if (dot) dot.style.color = 'var(--color-accent)';
      if (txt) txt.textContent = 'Demo Benchmark';
      if (badge) {
        badge.classList.remove('badge-high');
        badge.classList.add('badge-subtle');
        badge.title = 'Demonstration benchmark mode. Upload a dataset in Dataset Studio to train live models.';
      }
      const prepContainer = document.getElementById('prep-progress-container');
      if (prepContainer) prepContainer.style.display = 'none';
      const feedback = document.getElementById('upload-complete-note');
      if (feedback) feedback.style.display = 'none';
      renderAll(state);
      showToast('Demo database and benchmark models reset to seed state.', 'info');
    });
  }

  // 5. Setup Database Export action
  const exportDbBtn = document.getElementById('btn-export-db-file');
  if (exportDbBtn) {
    exportDbBtn.addEventListener('click', () => {
      window.Reports.exportDatabaseDump();
    });
  }

  // 5b. Setup Session Export action
  const exportSessionBtn = document.getElementById('btn-export-session');
  if (exportSessionBtn) {
    exportSessionBtn.addEventListener('click', () => {
      const sessionPayload = {
        version: "3.0-briefing",
        exported_at: new Date().toISOString(),
        mode: state.mode,
        domain: state.currentDomain,
        dataset: state.liveDataset,
        benchmark: state.liveBenchmark
      };
      const jsonStr = JSON.stringify(sessionPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predictiq_session_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported full analysis session JSON.', 'success');
    });
  }

  // 5c. Setup Session Import action
  const importSessionBtn = document.getElementById('btn-import-session');
  const importSessionInput = document.getElementById('input-import-session');
  if (importSessionBtn && importSessionInput) {
    importSessionBtn.addEventListener('click', () => importSessionInput.click());
    importSessionInput.addEventListener('change', async (e) => {
      if (!e.target.files.length) return;
      try {
        const file = e.target.files[0];
        const text = await file.text();
        const imported = JSON.parse(text);
        if (imported.dataset && imported.benchmark) {
          state.setLiveResults(imported.dataset, imported.benchmark);
          const badge = document.getElementById('mode-status-badge');
          const dot = document.getElementById('mode-status-dot');
          const txt = document.getElementById('mode-status-text');
          if (dot) dot.style.color = '#38bdf8';
          if (txt) txt.textContent = `Imported: ${imported.dataset.name.substring(0, 14)}`;
          if (badge) {
            badge.classList.remove('badge-subtle');
            badge.classList.add('badge-high');
          }
          renderAll(state);
          showToast(`Imported session with ${imported.benchmark.modelRuns.length} models!`, 'success');
        } else {
          showToast('Invalid session JSON: missing dataset or benchmark models.', 'info');
        }
      } catch (err) {
        showToast(`Failed to parse session JSON: ${err.message}`, 'info');
      }
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
        window.Charts.renderAdvancedModelCharts('roc-chart-container', 'cm-chart-container', state.currentActiveModel || null);
      }
    });
  }

  // 8. Setup Dataset Ingestion Studio Simulation
  setupDatasetUploadStudio(state);

  // 8b. Setup Hamburger Navigation Drawer, Global Live Search, and Data Tools Dropdown
  setupHamburgerDrawer();
  setupGlobalSearch();
  setupDataToolsDropdown();

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

function setupHamburgerDrawer() {
  const hamburgerBtn = document.getElementById('btn-nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.getElementById('nav-drawer-overlay');
  const closeBtn = document.getElementById('btn-close-nav-drawer');

  if (!hamburgerBtn || !drawer || !overlay) return;

  function openDrawer() {
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (drawer.classList.contains('active')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrawer);
  }

  overlay.addEventListener('click', closeDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('active')) {
      closeDrawer();
    }
  });

  // Automatically close drawer when any navigation link inside it is clicked
  const drawerItems = drawer.querySelectorAll('.nav-drawer-item');
  drawerItems.forEach(item => {
    item.addEventListener('click', () => {
      closeDrawer();
    });
  });
}

function setupDataToolsDropdown() {
  const toggleBtn = document.getElementById('btn-data-tools-toggle');
  const menu = document.getElementById('data-tools-menu');
  const dropdown = document.getElementById('data-tools-dropdown');
  if (!toggleBtn || !menu) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
    toggleBtn.setAttribute('aria-expanded', menu.classList.contains('active'));
  });

  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      menu.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  menu.querySelectorAll('.data-tools-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      menu.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

function setupGlobalSearch() {
  const searchInput = document.getElementById('global-search-input');
  const searchDropdown = document.getElementById('search-results-dropdown');
  const searchClear = document.getElementById('btn-search-clear');
  const searchContainer = document.getElementById('global-search-container');

  if (!searchInput || !searchDropdown) return;

  // 1. Keyboard shortcut '/' to focus search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'Escape' && searchDropdown.classList.contains('active')) {
      searchDropdown.classList.remove('active');
      searchInput.blur();
    }
  });

  // 2. Clear button
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      searchDropdown.classList.remove('active');
      searchInput.focus();
    });
  }

  // 3. Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (searchContainer && !searchContainer.contains(e.target)) {
      searchDropdown.classList.remove('active');
    }
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
      searchDropdown.classList.add('active');
    }
  });

  // 4. Search input event
  searchInput.addEventListener('input', () => {
    const rawVal = searchInput.value;
    const query = rawVal.trim().toLowerCase();

    if (searchClear) {
      searchClear.style.display = rawVal.length > 0 ? 'inline-block' : 'none';
    }

    if (!query) {
      searchDropdown.classList.remove('active');
      searchDropdown.innerHTML = '';
      return;
    }

    renderSearchResults(query);
  });

  function renderSearchResults(query) {
    const sections = [
      { id: 'overview', title: 'Executive Briefing', desc: 'High-level summary, key stats, and 90-day AI forecast memo', icon: '📊' },
      { id: 'dataset', title: 'Dataset Studio', desc: 'Upload spreadsheets (CSV/XLSX/JSON), check data health & clean-up', icon: '📁' },
      { id: 'models', title: 'Compare AI Models', desc: 'Algorithm benchmarks, Accuracy, Recall, ROC-AUC, and Confusion Matrix', icon: '⚡' },
      { id: 'predictions', title: 'Prediction Center', desc: 'Customer & account risk scores, plain-language summaries & drivers', icon: '🎯' },
      { id: 'radar', title: 'Risk Radar', desc: 'Visual accounts risk scatter map, high/medium/low filterable list', icon: '📡' },
      { id: 'simulator', title: 'What-If Simulator', desc: 'Scenario planner — adjust operational sliders to observe live impact', icon: '🎛️' },
      { id: 'reports', title: 'Reports & Downloads', desc: 'Export prediction spreadsheets (CSV/JSON) and print executive memo', icon: '📑' },
    ];

    const models = [
      { name: 'Logistic Regression', desc: 'Recommended: 83.9% AUC with L2 regularization', target: 'models' },
      { name: 'Decision Tree', desc: 'Interpretable decision splits based on key account rules', target: 'models' },
      { name: 'Naive Bayes', desc: 'Fast probabilistic baseline for quick validation', target: 'models' },
      { name: 'Soft-Voting Ensemble', desc: 'Weighted combination combining model strengths', target: 'models' },
      { name: 'XGBoost Benchmark', desc: 'Gradient boosted trees benchmark reference', target: 'models' }
    ];

    const metrics = [
      { name: 'Prediction Accuracy', desc: '% of correct decisions made across holdout test data', target: 'models' },
      { name: 'Reliability Score (ROC-AUC)', desc: 'Measures how well AI separates high-risk from low-risk', target: 'models' },
      { name: 'Revenue at Risk', desc: 'Total financial exposure from accounts projected to churn', target: 'overview' },
      { name: 'Unusual Numbers (Outliers)', desc: 'Tukey IQR fence detected 73 statistical distribution outliers', target: 'dataset' },
      { name: 'Data Clean-up Pipeline', desc: 'Missing value imputation, deduplication, and scaling checklist', target: 'dataset' },
      { name: 'Prediction Breakdown (Confusion Matrix)', desc: 'True positives, false alarms, and missed cases', target: 'models' }
    ];

    // Filter sections
    const matchingSections = sections.filter(s =>
      s.title.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query)
    );

    // Filter models
    const matchingModels = models.filter(m =>
      m.name.toLowerCase().includes(query) || m.desc.toLowerCase().includes(query)
    );

    // Filter metrics
    const matchingMetrics = metrics.filter(m =>
      m.name.toLowerCase().includes(query) || m.desc.toLowerCase().includes(query)
    );

    // Query active records from SQLite database if available
    let matchingRecords = [];
    try {
      if (window.predictiqDb && window.predictiqDb.db) {
        const dbRes = window.predictiqDb.query(`
          SELECT id, record_ref, outcome_label, probability, confidence 
          FROM predictions 
          WHERE record_ref LIKE ? OR outcome_label LIKE ? 
          LIMIT 5
        `, [`%${query}%`, `%${query}%`]);
        if (dbRes && dbRes.length > 0) {
          matchingRecords = dbRes;
        }
      }
    } catch (e) {
      // ignore
    }

    if (matchingSections.length === 0 && matchingModels.length === 0 && matchingMetrics.length === 0 && matchingRecords.length === 0) {
      searchDropdown.innerHTML = `
        <div class="search-no-results">
          No matching sections, accounts, or models found for "<strong>${escapeHtml(query)}</strong>".
        </div>
      `;
      searchDropdown.classList.add('active');
      return;
    }

    let html = '';

    if (matchingSections.length > 0) {
      html += `<div class="search-category-group">
        <div class="search-category-title">Workspace Sections</div>`;
      matchingSections.forEach(s => {
        html += `
          <div class="search-result-item" data-action="view" data-target="${s.id}">
            <div class="search-item-info">
              <span class="search-item-title">${s.icon} ${s.title}</span>
              <span class="search-item-desc">${s.desc}</span>
            </div>
            <span class="search-item-badge">Jump</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (matchingRecords.length > 0) {
      html += `<div class="search-category-group">
        <div class="search-category-title">Customer / Account Records</div>`;
      matchingRecords.forEach(r => {
        const probVal = r.probability > 1 ? r.probability.toFixed(1) : (r.probability * 100).toFixed(1);
        const confVal = r.confidence > 1 ? r.confidence.toFixed(0) : (r.confidence * 100).toFixed(0);
        html += `
          <div class="search-result-item" data-action="record" data-ref="${r.record_ref || r.id}">
            <div class="search-item-info">
              <span class="search-item-title">${r.record_ref}</span>
              <span class="search-item-desc">${r.outcome_label || 'Evaluated'} • ${probVal}% Risk • ${confVal}% Conf</span>
            </div>
            <span class="search-item-badge" style="color: var(--color-accent);">${r.outcome_label || 'Inspect'}</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (matchingModels.length > 0) {
      html += `<div class="search-category-group">
        <div class="search-category-title">AI Models & Algorithms</div>`;
      matchingModels.forEach(m => {
        html += `
          <div class="search-result-item" data-action="model" data-target="${m.target}">
            <div class="search-item-info">
              <span class="search-item-title">⚡ ${m.name}</span>
              <span class="search-item-desc">${m.desc}</span>
            </div>
            <span class="search-item-badge">AI Model</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (matchingMetrics.length > 0) {
      html += `<div class="search-category-group">
        <div class="search-category-title">Insights & Metrics</div>`;
      matchingMetrics.forEach(m => {
        html += `
          <div class="search-result-item" data-action="view" data-target="${m.target}">
            <div class="search-item-info">
              <span class="search-item-title">📈 ${m.name}</span>
              <span class="search-item-desc">${m.desc}</span>
            </div>
            <span class="search-item-badge">Metric</span>
          </div>
        `;
      });
      html += `</div>`;
    }

    searchDropdown.innerHTML = html;
    searchDropdown.classList.add('active');

    // Bind click events on results
    searchDropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        const target = item.getAttribute('data-target');
        const ref = item.getAttribute('data-ref');

        searchDropdown.classList.remove('active');
        searchInput.value = '';
        if (searchClear) searchClear.style.display = 'none';

        if (action === 'view') {
          switchView(target);
        } else if (action === 'model') {
          switchView('models');
          const advDrawer = document.getElementById('adv-model-drawer');
          const advToggleBtn = document.getElementById('btn-toggle-adv-model');
          if (advDrawer) {
            advDrawer.style.display = 'block';
            if (advToggleBtn) advToggleBtn.textContent = 'Hide Model Accuracy Curve & Error Breakdown';
            window.Charts.renderAdvancedModelCharts('roc-chart-container', 'cm-chart-container', window.predictiqState.currentActiveModel || null);
          }
        } else if (action === 'record') {
          switchView('radar');
          if (window.openRecordInspector) {
            window.openRecordInspector(ref);
          }
        }
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
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

  let dataset, modelRuns, recommendedModel, activeModel, predictions, features;

  if (state.mode === 'live' && state.liveDataset && state.liveBenchmark) {
    dataset = state.liveDataset;
    modelRuns = state.liveBenchmark.modelRuns || [];
    recommendedModel = state.liveBenchmark.recommendedModel;
    activeModel = recommendedModel || (modelRuns.length ? modelRuns[0] : null);
    predictions = state.liveBenchmark.predictions || [];
    features = state.liveBenchmark.featureImportances || [];
  } else {
    // Retrieve dataset & models for active domain from SQLite
    dataset = db.getDatasetByDomain(state.currentDomain);
    modelRuns = dataset ? db.getModelRunsByDataset(dataset.id) : [];
    recommendedModel = dataset ? db.getRecommendedModel(dataset.id) : null;
    activeModel = recommendedModel || (modelRuns.length ? modelRuns[0] : null);
    predictions = activeModel ? db.getPredictionsByModel(activeModel.id) : [];
    features = activeModel ? db.getFeatureImportances(activeModel.id) : [];
  }

  // Cache activeModel on state
  state.currentActiveModel = activeModel;

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

  // 1. Update Executive Briefing Stat Row (from real DB query or live ML)
  const statAcc = document.getElementById('stat-model-acc');
  const statRows = document.getElementById('stat-records-evaluated');
  const statConf = document.getElementById('stat-avg-confidence');
  const statExposure = document.getElementById('stat-financial-exposure');
  const statExposureLabel = document.getElementById('stat-financial-label');

  if (statAcc && activeModel) statAcc.textContent = `${activeModel.accuracy}%`;
  if (statRows && dataset) statRows.textContent = dataset.row_count.toLocaleString();
  if (statConf && activeModel) statConf.textContent = `${activeModel.auc}%`;
  if (statExposure) {
    if (state.mode === 'live') {
      statExposure.textContent = `${activeModel ? activeModel.auc : 84}% AUC`;
    } else {
      statExposure.textContent = config.impactDisplay;
    }
  }
  if (statExposureLabel) {
    if (state.mode === 'live') {
      statExposureLabel.textContent = 'Holdout Discrimination';
    } else {
      statExposureLabel.textContent = config.exposureLabel;
    }
  }

  // 2. Update Contextual Terminology & Headlines
  const domainTitle = document.getElementById('briefing-domain-title');
  const domainDesc = document.getElementById('briefing-domain-desc');
  if (domainTitle) {
    domainTitle.textContent = state.mode === 'live' ? `Live Model: ${dataset.name}` : config.name;
  }
  if (domainDesc) {
    domainDesc.textContent = state.mode === 'live'
      ? `Real client-side ML benchmark trained on ${dataset.row_count.toLocaleString()} records with target "${dataset.targetColumn || 'outcome'}".`
      : `Forecast model calibrated for ${config.targetConcept.toLowerCase()}.`;
  }

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
  renderExecutiveMemoSection(config, activeModel, state);

  // 9. Re-render Simulator with domain controls
  window.Simulator.init('simulator-container');

  // 10. Update Advanced Model Charts if drawer is open
  const advDrawer = document.getElementById('adv-model-drawer');
  if (advDrawer && advDrawer.style.display === 'block') {
    window.Charts.renderAdvancedModelCharts('roc-chart-container', 'cm-chart-container', activeModel);
  }
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
  if (duplicatesEl) duplicatesEl.textContent = Number(dataset.duplicate_count).toLocaleString();
  if (outliersEl) outliersEl.textContent = Number(dataset.outlier_count).toLocaleString();
  if (qualityEl) qualityEl.textContent = `${dataset.quality_score}%`;
  if (nameEl) nameEl.textContent = dataset.name;
  if (stampEl) stampEl.textContent = `Ingested: ${dataset.uploaded_at}`;

  // Render Sample Preview Table
  const tableHead = document.getElementById('ds-preview-thead');
  const tableBody = document.getElementById('ds-preview-tbody');
  if (tableHead && tableBody) {
    if (dataset.sampleRows && dataset.rawHeaders) {
      // Dynamic table for real uploaded dataset
      const headers = dataset.rawHeaders.slice(0, 7);
      tableHead.innerHTML = `
        <tr>
          ${headers.map(col => `<th>${col}</th>`).join('')}
        </tr>
      `;
      tableBody.innerHTML = dataset.sampleRows.map(row => `
        <tr>
          ${headers.map((h, idx) => {
            const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '—';
            return `<td style="${idx === 0 ? 'font-weight: 500;' : ''}">${val.length > 32 ? val.substring(0, 30) + '…' : val}</td>`;
          }).join('')}
        </tr>
      `).join('');
    } else {
      // Sample records from benchmark telco churn dataset
      tableHead.innerHTML = `
        <tr>
          ${config.sampleColumns.map(col => `<th>${col}</th>`).join('')}
        </tr>
      `;

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
}

function renderModelBenchmarkSection(modelRuns, activeModel) {
  const tbody = document.getElementById('model-benchmark-tbody');
  if (!tbody) return;

  const algoLabels = {
    'logistic_regression': 'L2 Regularized Logistic Regression',
    'decision_tree': 'Decision Tree (CART Gini)',
    'naive_bayes': 'Gaussian Naive Bayes',
    'ensemble': 'Soft-Voting Ensemble (LR + DT + GNB)',
    'xgboost': 'XGBoost (Gradient Boosted Trees)',
    'random_forest': 'Random Forest Ensemble',
    'neural_network': 'Multi-Layer Perceptron'
  };

  tbody.innerHTML = (modelRuns || []).map(mr => {
    const isRec = mr.is_recommended === 1;
    return `
      <tr style="${isRec ? 'background: rgba(217, 164, 65, 0.08); font-weight: 500;' : ''}">
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span>${algoLabels[mr.algorithm] || mr.name || mr.algorithm}</span>
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
    recNoteEl.innerHTML = `<strong>Recommended model: ${algoLabels[activeModel.algorithm] || activeModel.name || activeModel.algorithm}</strong> — provides highest AUC (${activeModel.auc}%) with calibrated discrimination on validation holdout.`;
  }
}

function renderPredictionCenterSection(predictions, features, config) {
  const primary = (predictions && predictions.length) ? predictions[0] : null;
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

  let displayFeatures = features;
  
  if (window.predictiqState && window.predictiqState.mode === 'live' && window.predictiqState.liveBenchmark && window.predictiqState.liveBenchmark.mlSession) {
    const session = window.predictiqState.liveBenchmark.mlSession;
    const rawRow = (window.predictiqState.liveDataset && window.predictiqState.liveDataset.sampleRows) ? window.predictiqState.liveDataset.sampleRows[0] : null;
    if (rawRow && session.weights && session.featureNames && window.ML) {
      const vec = window.ML.vectorizeFromMeta(rawRow, session.featureNames, session.numericMeta, session.catMeta);
      const attributions = session.featureNames.map((f, idx) => {
        const c_i = (session.weights[idx] || 0) * (vec[idx] || 0);
        return {
          feature_name: f.label,
          c_i: c_i,
          abs_c: Math.abs(c_i),
          direction: c_i >= 0 ? 'positive' : 'negative'
        };
      });
      const totalAbs = attributions.reduce((sum, a) => sum + a.abs_c, 0) || 1;
      attributions.sort((a, b) => b.abs_c - a.abs_c);
      displayFeatures = attributions.slice(0, 7).map((a, idx) => ({
        id: `attr_${idx + 1}`,
        feature_name: a.feature_name,
        importance: +((a.abs_c / totalAbs) * 100).toFixed(0),
        weight: +((a.abs_c / totalAbs) * 100).toFixed(0),
        direction: a.direction,
        rank: idx + 1
      })).filter(f => f.importance > 0);

      const topPos = attributions.filter(a => a.direction === 'positive').slice(0, 2).map(a => a.feature_name);
      const topNeg = attributions.filter(a => a.direction === 'negative').slice(0, 2).map(a => a.feature_name);
      if (expCopyEl) {
        let exp = `For entity <strong>${primary.record_ref}</strong>, elevated probability is driven by `;
        if (topPos.length) exp += `<strong>${topPos.join('</strong> and <strong>')}</strong> (positive contribution <em>c<sub>i</sub> = w<sub>i</sub> · x<sub>i</sub></em>). `;
        if (topNeg.length) exp += `Risk is moderated by <strong>${topNeg.join('</strong> and <strong>')}</strong>. `;
        exp += `Calculated dynamically from live trained model coefficients.`;
        expCopyEl.innerHTML = exp;
      }
    }
  } else if (expCopyEl) {
    expCopyEl.textContent = config.explanationText;
  }

  // Render horizontal Feature Importance Bars
  window.Charts.renderFeatureImportance('feature-importance-container', displayFeatures);
}

function renderRiskRadarSection(state) {
  const db = window.predictiqDb;
  const config = state.getDomainConfig();

  let dataset, recModel, predictions;
  if (state.mode === 'live' && state.liveDataset && state.liveBenchmark) {
    dataset = state.liveDataset;
    recModel = state.liveBenchmark.recommendedModel;
    predictions = state.liveBenchmark.predictions || [];
  } else {
    dataset = db.getDatasetByDomain(state.currentDomain);
    if (!dataset) return;
    recModel = db.getRecommendedModel(dataset.id);
    if (!recModel) return;
    predictions = db.getPredictionsByModel(recModel.id);
  }

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

function renderExecutiveMemoSection(config, activeModel, state) {
  const findingEl = document.getElementById('memo-finding-text');
  const actionEl = document.getElementById('memo-action-text');
  const impactEl = document.getElementById('memo-impact-display');

  if (state && state.mode === 'live' && state.liveDataset && activeModel) {
    if (findingEl) findingEl.innerHTML = `Live trained model <strong>${activeModel.name}</strong> achieves <strong>${activeModel.auc}% ROC-AUC</strong> with ${activeModel.accuracy}% accuracy across ${state.liveDataset.row_count.toLocaleString()} uploaded observations.`;
    if (actionEl) actionEl.innerHTML = `Prioritize high-probability cohort records identified in Risk Radar. Model weights indicate primary operational factors are actionable.`;
    if (impactEl) impactEl.textContent = `${activeModel.auc}% AUC`;
  } else {
    if (findingEl) findingEl.textContent = config.memoFinding;
    if (actionEl) actionEl.textContent = config.memoAction;
    if (impactEl) impactEl.textContent = config.impactDisplay;
  }
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
  let rec = null;
  const predictions = db.query(`SELECT * FROM predictions WHERE id = '${recordId}' OR record_ref = '${recordId}' LIMIT 1`);
  if (predictions.length) {
    rec = predictions[0];
  } else if (window.predictiqState && window.predictiqState.liveBenchmark && window.predictiqState.liveBenchmark.predictions) {
    rec = window.predictiqState.liveBenchmark.predictions.find(p => p.id === recordId || p.record_ref === recordId);
  }
  if (!rec) return;
  const recommendation = db.getRecommendationForPrediction(rec.id);
  const actionPlan = db.getActionPlanForPrediction ? db.getActionPlanForPrediction(rec.id) : null;
  const jsonPayload = window.Reports ? window.Reports.getRecordJSONPayload(rec.id) : null;
  const jsonStr = jsonPayload ? JSON.stringify(jsonPayload, null, 2) : JSON.stringify(rec, null, 2);

  const drawer = document.getElementById('inspector-drawer-panel');
  const overlay = document.getElementById('inspector-overlay');
  if (!drawer || !overlay) return;

  const isCompleted = actionPlan && actionPlan.status === 'Completed';

  drawer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: var(--border-hairline); padding-bottom: 1rem;">
      <div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted);">Account details</div>
        <h2 style="font-size: 1.4rem; margin-top: 0.2rem;">${rec.record_ref}</h2>
      </div>
      <button type="button" class="btn btn-subtle btn-sm" id="btn-close-drawer" aria-label="Close record details dialog">Close</button>
    </div>

    <!-- Outcome metric -->
    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 0.8rem; color: var(--color-text-muted);">Risk Probability</div>
      <div class="figure-serif figure-card" style="color: ${rec.risk_tier === 'high' ? 'var(--color-accent)' : 'var(--color-text)'}; margin: 0.35rem 0;">
        ${rec.probability}%
      </div>
      <span class="badge ${rec.risk_tier === 'high' ? 'badge-high' : (rec.risk_tier === 'medium' ? 'badge-medium' : 'badge-low')}">
        ${rec.outcome_label} • ${rec.confidence}% confidence
      </span>
    </div>

    <!-- Recommended action memo -->
    <div class="memo-card" style="margin-bottom: 1.5rem;">
      <h4 style="margin-bottom: 0.5rem;">Recommended Action Plan</h4>
      <p class="body-copy" style="font-size: 0.88rem; line-height: 1.5; color: var(--color-text);">
        ${recommendation ? recommendation.summary_text : 'Continue standard monitoring protocol; re-evaluate at next checkpoint.'}
      </p>
      ${recommendation ? `
        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: var(--border-hairline);">
          <span style="font-size: 0.78rem; color: var(--color-text-muted);">Potential Revenue Saved: </span>
          <span class="figure-serif" style="font-size: 1.1rem; color: var(--color-accent);">$${recommendation.potential_impact.toLocaleString()}</span>
          <div style="font-size: 0.72rem; color: var(--color-text-faint); margin-top: 0.2rem;">AI projection based on current account trends</div>
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
      handleFileUpload(e.target.files[0], state);
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
      handleFileUpload(e.dataTransfer.files[0], state);
    }
  });
}

async function handleFileUpload(file, state) {
  const db = window.predictiqDb;
  const prepContainer = document.getElementById('prep-progress-container');
  const prepChecklist = document.getElementById('prep-checklist-el');
  const feedback = document.getElementById('upload-complete-note');
  if (!prepContainer || !prepChecklist) return;

  // Reset feedback
  if (feedback) {
    feedback.style.display = 'none';
    feedback.className = 'memo-card';
  }

  prepContainer.style.display = 'block';

  const steps = [
    { title: 'Checking for blank / missing info and auto-filling values', detail: 'Scanning for blank values...' },
    { title: 'Finding and removing duplicate records', detail: 'Checking for duplicate entries...' },
    { title: 'Flagging unusual numbers and extreme values (outliers)', detail: 'Detecting unusual numbers...' },
    { title: 'Converting text categories into numbers for AI', detail: 'Encoding text categories...' },
    { title: 'Balancing number scales for fair comparison', detail: 'Normalizing numbers evenly...' },
    { title: 'Splitting data into 80% for learning and 20% for testing real accuracy', detail: '80/20 train/test split...' }
  ];

  prepChecklist.innerHTML = steps.map((s, idx) => `
    <div class="prep-item" id="prep-step-${idx}">
      <div class="prep-item-left">
        <span class="check-indicator" id="check-ind-${idx}">✓</span>
        <span>${s.title}</span>
      </div>
      <span style="font-size: 0.75rem; color: var(--color-text-faint);" id="step-status-${idx}">Pending...</span>
    </div>
  `).join('');

  // 1. Read & parse file via window.ML
  let parsed;
  try {
    parsed = await window.ML.parseFile(file);
  } catch (err) {
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      feedback.innerHTML = `<span style="color: #ef4444; font-weight: 500;">File read error:</span> ${err.message}`;
    }
    return;
  }

  // 2. Statistical profiling & target detection via window.ML
  const colInfo = window.ML.analyzeColumns(parsed.headers, parsed.rows);
  const targetCol = window.ML.detectTargetColumn(parsed.headers, parsed.rows, colInfo) || parsed.headers[parsed.headers.length - 1];
  const quality = window.ML.computeQuality(parsed.headers, parsed.rows, targetCol);
  const matrix = window.ML.buildFeatureMatrix(parsed.headers, parsed.rows, targetCol, colInfo);
  const split = window.ML.splitTrainTest(matrix.X, matrix.y, 0.2);

  // Update step labels with real stats
  steps[0].detail = `${quality.missing_pct}% missing (${quality.total_missing ? quality.total_missing.toLocaleString() : 0} blanks filled)`;
  steps[1].detail = `${quality.duplicate_count.toLocaleString()} duplicate rows detected`;
  steps[2].detail = `${quality.outlier_count.toLocaleString()} unusual numbers detected`;
  steps[3].detail = `${matrix.featureNames.length} features prepared (Target outcome: ${targetCol})`;
  steps[4].detail = `Scaled evenly across ${matrix.featureNames.length} features`;
  steps[5].detail = `Learning: ${split.trainX.length.toLocaleString()} rows, Testing: ${split.testX.length.toLocaleString()} rows`;

  // Animate checklist steps
  for (let i = 0; i < steps.length; i++) {
    await new Promise(r => setTimeout(r, 160));
    const item = document.getElementById(`prep-step-${i}`);
    const status = document.getElementById(`step-status-${i}`);
    if (item) item.classList.add('completed');
    if (status) {
      status.textContent = steps[i].detail;
      status.style.color = 'var(--color-secondary-data)';
    }
    if (window.MotionSceneController) {
      window.MotionSceneController.setPrepProgress((i + 1) / steps.length);
    }
    if (window.Signal && window.Signal.setPrepProgress) {
      window.Signal.setPrepProgress((i + 1) / steps.length);
    }
  }

  // 3. Train models via window.ML
  const trainingStatusEl = document.getElementById('step-status-5');
  if (trainingStatusEl) {
    trainingStatusEl.textContent = 'Training ML benchmark models in JavaScript...';
  }

  let benchmark;
  try {
    benchmark = window.ML.runFullBenchmark({
      X: matrix.X,
      y: matrix.y,
      trainX: split.trainX,
      trainY: split.trainY,
      testX: split.testX,
      testY: split.testY,
      featureNames: matrix.featureNames,
      rawRows: parsed.rows,
      targetCol: targetCol,
      positiveClass: matrix.positiveClass,
      numericMeta: matrix.numericMeta,
      catMeta: matrix.catMeta
    });
  } catch (mlErr) {
    console.error('ML benchmark error:', mlErr);
    if (feedback) {
      feedback.style.display = 'block';
      feedback.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      feedback.innerHTML = `<span style="color: #ef4444;">ML training error: ${mlErr.message}</span>`;
    }
    return;
  }

  if (trainingStatusEl) {
    trainingStatusEl.textContent = `Stratified 80/20 Holdout (${split.testX.length} test records evaluated)`;
  }

  // 4. Build New Dataset Object
  const newDataset = {
    id: `ds_live_${Date.now()}`,
    name: file.name,
    domain: state.currentDomain,
    row_count: quality.row_count,
    column_count: quality.column_count,
    missing_pct: quality.missing_pct,
    duplicate_count: quality.duplicate_count,
    outlier_count: quality.outlier_count,
    quality_score: quality.quality_score,
    uploaded_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    rawHeaders: parsed.headers,
    sampleRows: parsed.rows.slice(0, 8),
    targetColumn: targetCol,
    featureNames: matrix.featureNames.map(f => f.label)
  };

  // 5. Insert into SQLite
  db.createDynamicTable('user_ingested_data', parsed.rows);
  db.insertRow('datasets', {
    id: newDataset.id,
    name: newDataset.name,
    domain: newDataset.domain,
    row_count: newDataset.row_count,
    column_count: newDataset.column_count,
    missing_pct: newDataset.missing_pct,
    duplicate_count: newDataset.duplicate_count,
    outlier_count: newDataset.outlier_count,
    quality_score: newDataset.quality_score,
    uploaded_at: newDataset.uploaded_at
  });

  benchmark.modelRuns.forEach(mr => {
    db.insertRow('model_runs', {
      id: mr.id,
      dataset_id: newDataset.id,
      name: mr.name,
      algorithm: mr.algorithm,
      accuracy: mr.accuracy,
      precision_score: mr.precision_score,
      recall: mr.recall,
      f1_score: mr.f1_score,
      auc: mr.auc,
      is_recommended: mr.is_recommended,
      trained_at: mr.trained_at
    });
  });

  benchmark.featureImportances.forEach(fi => {
    db.insertRow('feature_importance', {
      id: fi.id,
      model_run_id: fi.model_run_id,
      feature_name: fi.feature_name,
      weight: fi.weight,
      direction: fi.direction,
      rank: fi.rank
    });
  });

  benchmark.predictions.forEach(p => {
    db.insertRow('predictions', {
      id: p.id,
      model_run_id: p.model_run_id,
      record_ref: p.record_ref,
      probability: p.probability,
      confidence: p.confidence,
      outcome_label: p.outcome_label,
      risk_tier: p.risk_tier,
      created_at: p.created_at
    });
  });

  await db.persist();

  // 7. Update Application State
  state.setLiveResults(newDataset, benchmark);

  // 8. Update Live Mode Header Badge
  const modeBadge = document.getElementById('mode-status-badge');
  const modeDot = document.getElementById('mode-status-dot');
  const modeText = document.getElementById('mode-status-text');
  if (modeDot) modeDot.style.color = '#38bdf8';
  if (modeText) modeText.textContent = `Live ML: ${file.name.substring(0, 16)}`;
  if (modeBadge) {
    modeBadge.classList.remove('badge-subtle');
    modeBadge.classList.add('badge-high');
    modeBadge.title = `Live model trained on ${file.name} (${quality.row_count.toLocaleString()} rows). Click Reset demo to restore.`;
  }

  // 9. Completion Note & Toast
  if (feedback) {
    feedback.style.display = 'block';
    feedback.style.borderColor = 'rgba(217, 164, 65, 0.4)';
    feedback.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
        <div>
          <div style="font-weight: 600; color: var(--color-accent); margin-bottom: 0.25rem;">
            ✓ Real ML Benchmark Trained: 4 client-side models fitted on ${quality.row_count.toLocaleString()} rows
          </div>
          <div style="font-size: 0.85rem; color: var(--color-text); line-height: 1.5;">
            Recommended: <strong>${benchmark.recommendedModel.name}</strong> achieves <strong>${benchmark.recommendedModel.auc}% ROC-AUC</strong>, <strong>${benchmark.recommendedModel.accuracy}% Accuracy</strong>, and <strong>${benchmark.recommendedModel.f1_score}% F1</strong> on the 20% holdout test partition (${split.testX.length} records). Stored in SQLite.
          </div>
        </div>
        <button type="button" class="btn btn-subtle btn-sm" onclick="switchView('models')">View Benchmark →</button>
      </div>
    `;
  }

  showToast(`Trained 4 ML models on ${file.name}! Top AUC: ${benchmark.recommendedModel.auc}%`, 'success');
}

window.openRecordInspector = openRecordInspector;
window.switchView = switchView;
