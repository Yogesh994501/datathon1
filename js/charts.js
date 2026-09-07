/**
 * PredictIQ Vector SVG Charts
 * Accessible, zero-dependency SVG charts adhering to The Briefing design tokens:
 * Base: #12151C, Hairline: #2A2F3B, Accent: #D9A441, Secondary: #6B8F8A, Text: #EDEAE3
 */

const Charts = {
  /**
   * Forecast Trend Chart: Historical vs Predicted Future
   */
  renderTrendChart(containerId, domain) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Monthly data points (6 historical months, 3 forecast months)
    const points = [
      { label: 'Apr', val: 42, isForecast: false },
      { label: 'May', val: 46, isForecast: false },
      { label: 'Jun', val: 51, isForecast: false },
      { label: 'Jul', val: 49, isForecast: false },
      { label: 'Aug', val: 58, isForecast: false },
      { label: 'Sep (Now)', val: 64, isForecast: false },
      { label: 'Oct (+30d)', val: 76, isForecast: true },
      { label: 'Nov (+60d)', val: 84, isForecast: true },
      { label: 'Dec (+90d)', val: 89, isForecast: true }
    ];

    const width = 760;
    const height = 240;
    const padding = { top: 25, right: 30, bottom: 35, left: 45 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minVal = 0;
    const maxVal = 100;

    const getX = (idx) => padding.left + (idx / (points.length - 1)) * chartW;
    const getY = (val) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

    // Build SVG paths
    let histPath = '';
    let forePath = '';
    const splitIdx = 5; // Sep (Now)

    points.forEach((p, idx) => {
      const x = getX(idx);
      const y = getY(p.val);
      if (idx <= splitIdx) {
        histPath += (idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
      }
      if (idx >= splitIdx) {
        forePath += (idx === splitIdx ? `M ${x} ${y}` : ` L ${x} ${y}`);
      }
    });

    // Hairline grid rows
    const yGridLines = [25, 50, 75, 100].map(val => {
      const y = getY(val);
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#2A2F3B" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${padding.left - 8}" y="${y + 4}" fill="#636D7E" font-size="11" text-anchor="end" font-family="var(--font-ui)">${val}%</text>
      `;
    }).join('');

    // X-axis labels
    const xLabels = points.map((p, idx) => {
      const x = getX(idx);
      const isFore = p.isForecast;
      return `
        <text x="${x}" y="${height - 10}" fill="${isFore ? '#D9A441' : '#9BA3AF'}" font-size="11" text-anchor="middle" font-weight="${isFore ? '600' : '400'}" font-family="var(--font-ui)">
          ${p.label}
        </text>
      `;
    }).join('');

    // Circles for points
    const circles = points.map((p, idx) => {
      const x = getX(idx);
      const y = getY(p.val);
      const color = p.isForecast ? '#D9A441' : '#6B8F8A';
      return `
        <circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#12151C" stroke-width="2">
          <title>${p.label}: ${p.val}% risk</title>
        </circle>
      `;
    }).join('');

    const nowX = getX(splitIdx);

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;" role="img" aria-label="Prediction trend forecast">
        <!-- Grid lines -->
        ${yGridLines}

        <!-- Historical / Forecast boundary divider -->
        <line x1="${nowX}" y1="${padding.top}" x2="${nowX}" y2="${height - padding.bottom}" stroke="#373E4D" stroke-width="1" stroke-dasharray="4,4" />
        <text x="${nowX - 8}" y="${padding.top + 12}" fill="#6B8F8A" font-size="10" text-anchor="end" font-family="var(--font-ui)">Historical records</text>
        <text x="${nowX + 8}" y="${padding.top + 12}" fill="#D9A441" font-size="10" text-anchor="start" font-family="var(--font-ui)">AI forecast horizon</text>

        <!-- Historical Path (teal-grey) -->
        <path d="${histPath}" fill="none" stroke="#6B8F8A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Forecast Path (warm amber) -->
        <path d="${forePath}" fill="none" stroke="#D9A441" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5,3" />

        <!-- Points -->
        ${circles}

        <!-- X labels -->
        ${xLabels}
      </svg>
    `;

    container.innerHTML = svg;
  },

  /**
   * Feature Importance Horizontal Bar List
   */
  renderFeatureImportance(containerId, features) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
      <div class="feature-list" role="list">
        ${features.map(f => `
          <div class="feature-row" role="listitem">
            <div class="feature-meta">
              <span style="color: var(--color-text);">${f.feature_name}</span>
              <span class="figure-serif" style="font-size: 1.05rem; color: var(--color-text);">${f.importance}%</span>
            </div>
            <div class="feature-bar-bg">
              <div class="feature-bar-fill" style="width: ${f.importance}%;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = html;
  },

  /**
   * Risk Radar Cohort Scatter Distribution
   */
  renderRiskRadar(containerId, predictions, activeFilter, onSelectRecord) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Standard margin convention reserving generous space inside the coordinate system
    const margin = { top: 28, right: 48, bottom: 56, left: 64 };
    const width = 800;
    const height = 340;

    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    // Filter predictions
    let list = [...predictions];
    if (activeFilter !== 'all') {
      list = list.filter(p => p.risk_tier === activeFilter);
    }

    // Scale mappings
    // Probability: 0 to 100
    const getX = (prob) => margin.left + (Math.max(0, Math.min(100, prob)) / 100) * chartW;

    // Confidence: 70 to 100 (accurately accommodates calibrated model confidence)
    const minConf = 70;
    const maxConf = 100;
    const getY = (conf) => margin.top + chartH - ((Math.max(minConf, Math.min(maxConf, conf)) - minConf) / (maxConf - minConf)) * chartH;

    // Threshold zones:
    // Low: prob < 35, Medium: 35-70, High: > 70
    const lowBoundaryX = getX(35);
    const highBoundaryX = getX(70);

    // Background zones (subtle, translucent glass-friendly tints)
    const zoneRects = `
      <rect x="${margin.left}" y="${margin.top}" width="${lowBoundaryX - margin.left}" height="${chartH}" fill="rgba(107, 143, 138, 0.05)" rx="4" />
      <rect x="${lowBoundaryX}" y="${margin.top}" width="${highBoundaryX - lowBoundaryX}" height="${chartH}" fill="rgba(194, 139, 54, 0.05)" rx="4" />
      <rect x="${highBoundaryX}" y="${margin.top}" width="${margin.left + chartW - highBoundaryX}" height="${chartH}" fill="rgba(217, 164, 65, 0.07)" rx="4" />
    `;

    // Horizontal grid lines (70%, 80%, 90%, 100%)
    const yGrid = [70, 80, 90, 100].map(c => {
      const y = getY(c);
      return `
        <line x1="${margin.left}" y1="${y}" x2="${margin.left + chartW}" y2="${y}" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" stroke-dasharray="2,3" />
        <text x="${margin.left - 12}" y="${y + 4}" fill="rgba(237, 234, 227, 0.5)" font-size="11" text-anchor="end" font-family="var(--font-ui)">${c}%</text>
      `;
    }).join('');

    // X-Axis grid lines & ticks (0%, 25%, 50%, 75%, 100%)
    const xGrid = [0, 25, 50, 75, 100].map(p => {
      const x = getX(p);
      return `
        <line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + chartH}" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-dasharray="2,3" />
        <line x1="${x}" y1="${margin.top + chartH}" x2="${x}" y2="${margin.top + chartH + 6}" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />
        <text x="${x}" y="${margin.top + chartH + 20}" fill="rgba(237, 234, 227, 0.55)" font-size="11" text-anchor="middle" font-family="var(--font-ui)">${p}%</text>
      `;
    }).join('');

    // Outer axes hairlines
    const axesHairlines = `
      <line x1="${margin.left}" y1="${margin.top + chartH}" x2="${margin.left + chartW}" y2="${margin.top + chartH}" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1" />
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartH}" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1" />
    `;

    // Vertical boundary zone lines & headers
    const zoneLines = `
      <line x1="${lowBoundaryX}" y1="${margin.top}" x2="${lowBoundaryX}" y2="${margin.top + chartH}" stroke="rgba(255, 255, 255, 0.14)" stroke-width="1" stroke-dasharray="4,4" />
      <text x="${(margin.left + lowBoundaryX) / 2}" y="${margin.top + 16}" fill="#8EB7B1" font-size="11" font-weight="600" text-anchor="middle" font-family="var(--font-ui)">Low Risk Zone</text>

      <line x1="${highBoundaryX}" y1="${margin.top}" x2="${highBoundaryX}" y2="${margin.top + chartH}" stroke="rgba(255, 255, 255, 0.14)" stroke-width="1" stroke-dasharray="4,4" />
      <text x="${(lowBoundaryX + highBoundaryX) / 2}" y="${margin.top + 16}" fill="#E6B563" font-size="11" font-weight="600" text-anchor="middle" font-family="var(--font-ui)">Medium Risk Zone</text>

      <text x="${(highBoundaryX + margin.left + chartW) / 2}" y="${margin.top + 16}" fill="#F0C46B" font-size="11" font-weight="600" text-anchor="middle" font-family="var(--font-ui)">High Risk Tier</text>
    `;

    // Render dots with glowing translucent halos
    const dots = list.map(p => {
      const x = getX(p.probability);
      const y = getY(p.confidence);
      const color = p.risk_tier === 'high' ? '#D9A441' : (p.risk_tier === 'medium' ? '#C28B36' : '#6B8F8A');
      return `
        <g class="radar-node-group" data-id="${p.id}" style="cursor: pointer;">
          <circle cx="${x}" cy="${y}" r="10" fill="${color}" fill-opacity="0.22" class="radar-node-halo" />
          <circle cx="${x}" cy="${y}" r="5.5" fill="${color}" stroke="#12151C" stroke-width="1.5" class="radar-node">
            <title>${p.record_ref}: ${p.probability}% risk, ${p.confidence}% confidence (${p.outcome_label})</title>
          </circle>
        </g>
      `;
    }).join('');

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;" id="radar-svg-canvas" role="img" aria-label="Risk Radar Cohort Scatter Distribution">
        <defs>
          <clipPath id="chart-area-clip">
            <rect x="${margin.left - 12}" y="${margin.top - 12}" width="${chartW + 24}" height="${chartH + 24}" />
          </clipPath>
        </defs>
        ${zoneRects}
        ${yGrid}
        ${xGrid}
        ${axesHairlines}
        ${zoneLines}
        <g clip-path="url(#chart-area-clip)">
          ${dots}
        </g>
        <!-- X Axis Title (centered and contained within bottom margin) -->
        <text x="${margin.left + chartW / 2}" y="${height - 12}" fill="rgba(237, 234, 227, 0.75)" font-size="12" font-weight="500" text-anchor="middle" font-family="var(--font-ui)">Predicted risk probability (%)</text>
        <!-- Y Axis Title (properly rotated and offset from left boundary) -->
        <text x="18" y="${margin.top + chartH / 2}" fill="rgba(237, 234, 227, 0.75)" font-size="12" font-weight="500" text-anchor="middle" font-family="var(--font-ui)" transform="rotate(-90 18 ${margin.top + chartH / 2})">Model confidence (%)</text>
      </svg>
    `;

    container.innerHTML = svg;

    // Attach click handlers to circles
    const svgEl = container.querySelector('#radar-svg-canvas');
    if (svgEl) {
      svgEl.querySelectorAll('.radar-node-group').forEach(node => {
        node.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (onSelectRecord) onSelectRecord(id);
        });
      });
    }
  },

  /**
   * Advanced Model Evaluation: ROC Curve & Confusion Matrix
   */
  renderAdvancedModelCharts(rocContainerId, cmContainerId) {
    const rocEl = document.getElementById(rocContainerId);
    const cmEl = document.getElementById(cmContainerId);

    if (rocEl) {
      // Crisp SVG ROC Curve for Logistic Regression (AUC = 0.839)
      rocEl.innerHTML = `
        <svg viewBox="0 0 320 220" style="width: 100%; height: auto;" role="img" aria-label="ROC curve">
          <rect x="35" y="15" width="260" height="170" fill="transparent" stroke="#2A2F3B" stroke-width="1" />
          <!-- Diagonal random baseline -->
          <line x1="35" y1="185" x2="295" y2="15" stroke="#373E4D" stroke-dasharray="3,3" stroke-width="1" />
          <!-- Logistic Regression ROC curve (AUC = 0.839) -->
          <path d="M 35 185 Q 60 70 120 45 T 295 15" fill="none" stroke="#D9A441" stroke-width="2" />
          <!-- Area fill subtle -->
          <path d="M 35 185 Q 60 70 120 45 T 295 15 L 295 185 Z" fill="rgba(217, 164, 65, 0.08)" />
          
          <text x="165" y="115" fill="#EDEAE3" font-size="12" font-family="var(--font-serif)">AUC = 0.839</text>
          <text x="165" y="212" fill="#636D7E" font-size="10" text-anchor="middle" font-family="var(--font-ui)">False positive rate</text>
          <text x="15" y="100" fill="#636D7E" font-size="10" text-anchor="middle" font-family="var(--font-ui)" transform="rotate(-90 15 100)">True positive rate</text>
        </svg>
      `;
    }

    if (cmEl) {
      // Confusion Matrix 2x2 Table Layout on 20% holdout test partition (1,409 records)
      cmEl.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-width: 300px; margin: 0 auto; text-align: center; font-size: 0.85rem;">
          <div style="background: rgba(255, 255, 255, 0.035); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1.1rem 0.5rem; border-radius: 14px;">
            <div style="color: var(--color-text-muted); font-size: 0.75rem;">True Positives</div>
            <div class="figure-serif" style="font-size: 1.4rem; color: #EDEAE3; margin-top: 0.2rem;">209</div>
          </div>
          <div style="background: rgba(255, 255, 255, 0.035); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1.1rem 0.5rem; border-radius: 14px;">
            <div style="color: var(--color-text-muted); font-size: 0.75rem;">False Positives</div>
            <div class="figure-serif" style="font-size: 1.4rem; color: #C28B36; margin-top: 0.2rem;">102</div>
          </div>
          <div style="background: rgba(255, 255, 255, 0.035); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1.1rem 0.5rem; border-radius: 14px;">
            <div style="color: var(--color-text-muted); font-size: 0.75rem;">False Negatives</div>
            <div class="figure-serif" style="font-size: 1.4rem; color: #C28B36; margin-top: 0.2rem;">165</div>
          </div>
          <div style="background: rgba(255, 255, 255, 0.035); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1.1rem 0.5rem; border-radius: 14px;">
            <div style="color: var(--color-text-muted); font-size: 0.75rem;">True Negatives</div>
            <div class="figure-serif" style="font-size: 1.4rem; color: #EDEAE3; margin-top: 0.2rem;">933</div>
          </div>
        </div>
      `;
    }
  }
};

window.Charts = Charts;
