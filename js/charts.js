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

    // Confidence interval uncertainty band on forecast horizon (95% CI)
    // Points 5, 6, 7, 8 with widening uncertainty
    const ciDeltas = [0, 5, 8, 12];
    const upperPts = [];
    const lowerPts = [];
    for (let idx = splitIdx; idx < points.length; idx++) {
      const x = getX(idx);
      const delta = ciDeltas[idx - splitIdx];
      const yUp = getY(Math.min(100, points[idx].val + delta));
      const yLo = getY(Math.max(0, points[idx].val - delta));
      upperPts.push(`${x} ${yUp}`);
      lowerPts.unshift(`${x} ${yLo}`);
    }
    const ciBandPoly = upperPts.concat(lowerPts).join(' L ');
    const ciBand = `<polygon points="${upperPts.concat(lowerPts).join(', ')}" fill="rgba(217, 164, 65, 0.10)" stroke="rgba(217, 164, 65, 0.25)" stroke-width="1" stroke-dasharray="2,2" />`;

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
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block;" role="img" aria-label="Prediction trend forecast with 95% confidence bounds">
        <desc>Forecast trend showing 6 historical months and 3 predicted future months with 95% confidence interval band</desc>
        <!-- Grid lines -->
        ${yGridLines}

        <!-- 95% Confidence Interval Band on Forecast -->
        ${ciBand}

        <!-- Historical / Forecast boundary divider -->
        <line x1="${nowX}" y1="${padding.top}" x2="${nowX}" y2="${height - padding.bottom}" stroke="#373E4D" stroke-width="1" stroke-dasharray="4,4" />
        <text x="${nowX - 8}" y="${padding.top + 12}" fill="#6B8F8A" font-size="10" text-anchor="end" font-family="var(--font-ui)">Historical records</text>
        <text x="${nowX + 8}" y="${padding.top + 12}" fill="#D9A441" font-size="10" text-anchor="start" font-family="var(--font-ui)">AI forecast horizon (95% CI)</text>

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

    const listItems = (features || []).map(f => {
      const val = f.importance !== undefined ? f.importance : (f.weight !== undefined ? f.weight : 0);
      const dirBadge = f.direction ? `<span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: ${f.direction === 'positive' ? 'rgba(217, 164, 65, 0.15)' : 'rgba(107, 143, 138, 0.15)'}; color: ${f.direction === 'positive' ? 'var(--color-accent)' : 'var(--color-secondary-data)'}; margin-left: 6px;">${f.direction === 'positive' ? '+ Risk' : '- Risk'}</span>` : '';
      return `
        <div class="feature-row" role="listitem" aria-label="${f.feature_name}: ${val}% importance">
          <div class="feature-meta">
            <span style="color: var(--color-text); font-weight: 500;">${f.feature_name} ${dirBadge}</span>
            <span class="figure-serif" style="font-size: 1.05rem; color: var(--color-text);">${val}%</span>
          </div>
          <div class="feature-bar-bg" role="progressbar" aria-valuenow="${val}" aria-valuemin="0" aria-valuemax="100">
            <div class="feature-bar-fill" style="width: ${Math.min(100, Math.max(0, val))}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="feature-list" role="list" aria-label="Feature importance ranking">
        ${listItems || '<div style="color: var(--color-text-faint); font-size: 0.85rem; padding: 1rem 0;">No feature importances available.</div>'}
      </div>
    `;
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
        <text x="${x}" y="${margin.top + chartH + 22}" fill="rgba(237, 234, 227, 0.5)" font-size="11" text-anchor="middle" font-family="var(--font-ui)">${p}%</text>
      `;
    }).join('');

    // Scatter points
    const points = list.map(p => {
      const cx = getX(p.probability);
      const cy = getY(p.confidence);
      const color = p.risk_tier === 'high' ? '#D9A441' : (p.risk_tier === 'medium' ? '#C28B36' : '#6B8F8A');
      return `
        <circle 
          cx="${cx}" 
          cy="${cy}" 
          r="6" 
          fill="${color}" 
          stroke="rgba(18, 21, 28, 0.85)" 
          stroke-width="1.5"
          style="cursor: pointer; transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), r 0.2s;"
          tabindex="0"
          role="button"
          aria-label="Record ${p.record_ref}: ${p.probability}% risk, ${p.confidence}% confidence"
          data-record-id="${p.id}"
          onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.openRecordInspector('${p.id}'); }"
        >
          <title>${p.record_ref} • ${p.probability}% risk • ${p.confidence}% conf</title>
        </circle>
      `;
    }).join('');

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; display: block; overflow: visible;" role="img" aria-label="Risk Radar cohort distribution scatter plot showing ${list.length} records">
        <desc>Scatter plot plotting predicted risk probability against model confidence with risk tier zones</desc>
        <!-- Boundary Rect -->
        <rect x="${margin.left}" y="${margin.top}" width="${chartW}" height="${chartH}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" rx="4" />

        <!-- Translucent Risk Zones -->
        ${zoneRects}

        <!-- Grids -->
        ${yGrid}
        ${xGrid}

        <!-- Threshold vertical divider lines -->
        <line x1="${lowBoundaryX}" y1="${margin.top}" x2="${lowBoundaryX}" y2="${margin.top + chartH}" stroke="#6B8F8A" stroke-width="1" stroke-dasharray="3,3" opacity="0.6" />
        <line x1="${highBoundaryX}" y1="${margin.top}" x2="${highBoundaryX}" y2="${margin.top + chartH}" stroke="#D9A441" stroke-width="1" stroke-dasharray="3,3" opacity="0.6" />

        <!-- Zone Labels -->
        <text x="${(margin.left + lowBoundaryX) / 2}" y="${margin.top + 18}" fill="#6B8F8A" font-size="10" text-anchor="middle" font-family="var(--font-ui)" letter-spacing="0.05em">LOW RISK</text>
        <text x="${(lowBoundaryX + highBoundaryX) / 2}" y="${margin.top + 18}" fill="#C28B36" font-size="10" text-anchor="middle" font-family="var(--font-ui)" letter-spacing="0.05em">MEDIUM RISK</text>
        <text x="${(highBoundaryX + margin.left + chartW) / 2}" y="${margin.top + 18}" fill="#D9A441" font-size="10" text-anchor="middle" font-family="var(--font-ui)" letter-spacing="0.05em">HIGH RISK</text>

        <!-- Y-Axis Label inside bounds -->
        <text x="18" y="${margin.top + chartH / 2}" fill="rgba(237, 234, 227, 0.6)" font-size="10" text-anchor="middle" font-family="var(--font-ui)" transform="rotate(-90 18 ${margin.top + chartH / 2})" letter-spacing="0.04em">MODEL CONFIDENCE</text>

        <!-- X-Axis Label inside coordinate space -->
        <text x="${margin.left + chartH / 2 + (chartW - chartH) / 2}" y="${height - 14}" fill="rgba(237, 234, 227, 0.6)" font-size="10" text-anchor="middle" font-family="var(--font-ui)" letter-spacing="0.04em">PREDICTED RISK PROBABILITY</text>

        <!-- Cohort Points -->
        <g id="radar-svg-points">
          ${points}
        </g>
      </svg>
    `;

    container.innerHTML = svg;

    // Attach click listeners to circles
    const circles = container.querySelectorAll('circle[data-record-id]');
    circles.forEach(c => {
      c.addEventListener('click', () => {
        const id = c.getAttribute('data-record-id');
        if (onSelectRecord) onSelectRecord(id);
      });
    });
  },

  /**
   * Advanced Model Performance: ROC Curve & Confusion Matrix
   */
  renderAdvancedModelCharts(rocContainerId, cmContainerId, activeModel) {
    const rocEl = document.getElementById(rocContainerId);
    const cmEl = document.getElementById(cmContainerId);

    const hasRealRoc = activeModel && activeModel.rocCurve && activeModel.rocCurve.length > 0;
    const hasRealCm = activeModel && activeModel.confusionMatrix;
    const aucVal = activeModel ? (activeModel.auc > 1 ? (activeModel.auc / 100).toFixed(3) : activeModel.auc.toFixed(3)) : '0.839';

    if (rocEl) {
      let rocPathD = '';
      if (hasRealRoc) {
        // Map 0..1 FPR to 35..295, 0..1 TPR to 185..15
        const pts = activeModel.rocCurve.map(pt => {
          const x = 35 + pt.fpr * 260;
          const y = 185 - pt.tpr * 170;
          return `${x.toFixed(1)} ${y.toFixed(1)}`;
        });
        rocPathD = `M 35 185 L ${pts.join(' L ')} L 295 15`;
      } else {
        rocPathD = 'M 35 185 Q 60 70 120 45 T 295 15';
      }

      rocEl.innerHTML = `
        <svg viewBox="0 0 320 220" style="width: 100%; height: auto;" role="img" aria-label="Receiver Operating Characteristic (ROC) curve with AUC ${aucVal}">
          <desc>ROC curve showing true positive rate versus false positive rate for the model evaluation.</desc>
          <rect x="35" y="15" width="260" height="170" fill="transparent" stroke="#2A2F3B" stroke-width="1" />
          <!-- Diagonal random baseline -->
          <line x1="35" y1="185" x2="295" y2="15" stroke="#373E4D" stroke-dasharray="3,3" stroke-width="1" />
          <!-- ROC curve -->
          <path d="${rocPathD}" fill="none" stroke="#D9A441" stroke-width="2.2" stroke-linejoin="round" />
          <!-- Area fill subtle -->
          <path d="${rocPathD} L 295 185 Z" fill="rgba(217, 164, 65, 0.08)" />
          
          <text x="165" y="115" fill="#EDEAE3" font-size="12" font-family="var(--font-serif)">AUC = ${aucVal}</text>
          <text x="165" y="212" fill="#636D7E" font-size="10" text-anchor="middle" font-family="var(--font-ui)">False alarms rate</text>
          <text x="15" y="100" fill="#636D7E" font-size="10" text-anchor="middle" font-family="var(--font-ui)" transform="rotate(-90 15 100)">Correctly caught rate</text>
        </svg>
      `;
    }

    if (cmEl) {
      const tp = hasRealCm ? activeModel.confusionMatrix.tp : 209;
      const fp = hasRealCm ? activeModel.confusionMatrix.fp : 102;
      const fn = hasRealCm ? activeModel.confusionMatrix.fn : 165;
      const tn = hasRealCm ? activeModel.confusionMatrix.tn : 933;

      cmEl.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-width: 360px; margin: 0 auto; text-align: center; font-size: 0.85rem;" role="table" aria-label="Prediction Accuracy Breakdown">
          <button type="button" class="cm-quadrant-btn" onclick="window.filterRadarByMatrixQuadrant('tp')" title="Click to view True Positives in Risk Radar" style="background: rgba(255, 255, 255, 0.035); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.85rem 0.5rem; border-radius: 12px; cursor: pointer; text-align: center; transition: all 0.2s ease;">
            <div style="color: var(--color-accent); font-size: 0.76rem; font-weight: 600;">Correctly Caught</div>
            <div style="color: var(--color-text-faint); font-size: 0.68rem; margin-bottom: 0.15rem;">True Positives (High Risk)</div>
            <div class="figure-serif" style="font-size: 1.35rem; color: #EDEAE3; margin-top: 0.2rem;">${tp.toLocaleString()}</div>
            <div style="font-size: 0.65rem; color: var(--color-accent); margin-top: 0.25rem; opacity: 0.8;">Inspect cohort →</div>
          </button>
          <button type="button" class="cm-quadrant-btn" onclick="window.filterRadarByMatrixQuadrant('fp')" title="Click to view False Positives (False Alarms) in Risk Radar" style="background: rgba(239, 68, 68, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.85rem 0.5rem; border-radius: 12px; cursor: pointer; text-align: center; transition: all 0.2s ease;">
            <div style="color: #EF4444; font-size: 0.76rem; font-weight: 600;">False Alarms</div>
            <div style="color: var(--color-text-faint); font-size: 0.68rem; margin-bottom: 0.15rem;">False Positives</div>
            <div class="figure-serif" style="font-size: 1.35rem; color: #EF4444; margin-top: 0.2rem;">${fp.toLocaleString()}</div>
            <div style="font-size: 0.65rem; color: #EF4444; margin-top: 0.25rem; opacity: 0.85;">Inspect cohort →</div>
          </button>
          <button type="button" class="cm-quadrant-btn" onclick="window.filterRadarByMatrixQuadrant('fn')" title="Click to view False Negatives (Missed Cases) in Risk Radar" style="background: rgba(217, 164, 65, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(217, 164, 65, 0.2); padding: 0.85rem 0.5rem; border-radius: 12px; cursor: pointer; text-align: center; transition: all 0.2s ease;">
            <div style="color: #D9A441; font-size: 0.76rem; font-weight: 600;">Missed Cases</div>
            <div style="color: var(--color-text-faint); font-size: 0.68rem; margin-bottom: 0.15rem;">False Negatives</div>
            <div class="figure-serif" style="font-size: 1.35rem; color: #D9A441; margin-top: 0.2rem;">${fn.toLocaleString()}</div>
            <div style="font-size: 0.65rem; color: #D9A441; margin-top: 0.25rem; opacity: 0.85;">Inspect cohort →</div>
          </button>
          <button type="button" class="cm-quadrant-btn" onclick="window.filterRadarByMatrixQuadrant('tn')" title="Click to view True Negatives in Risk Radar" style="background: rgba(16, 185, 129, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.85rem 0.5rem; border-radius: 12px; cursor: pointer; text-align: center; transition: all 0.2s ease;">
            <div style="color: #10B981; font-size: 0.76rem; font-weight: 600;">Correctly Cleared</div>
            <div style="color: var(--color-text-faint); font-size: 0.68rem; margin-bottom: 0.15rem;">True Negatives (Safe)</div>
            <div class="figure-serif" style="font-size: 1.35rem; color: #EDEAE3; margin-top: 0.2rem;">${tn.toLocaleString()}</div>
            <div style="font-size: 0.65rem; color: #10B981; margin-top: 0.25rem; opacity: 0.85;">Inspect cohort →</div>
          </button>
        </div>
        <div style="text-align: center; font-size: 0.72rem; color: var(--color-text-faint); margin-top: 0.5rem;">
          Tip: Click any quadrant above to drill down and inspect individual accounts in the Risk Radar.
        </div>
      `;
    }
  }
};

window.Charts = Charts;
