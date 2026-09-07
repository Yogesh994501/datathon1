# PredictIQ — AI Predictive Insight Dashboard

**PredictIQ** is a sober, executive AI Decision Intelligence platform that transforms historical datasets into explainable, calibrated forecasts and strategic organizational actions.

Built with "The Briefing" editorial design philosophy, an in-browser SQLite relational database (`sql.js`), and a MotionSites-inspired scroll-reactive cinematic motion system.

---

## Live Demo

🌐 **GitHub Pages**: [https://yogesh994501.github.io/datathon1/](https://yogesh994501.github.io/datathon1/)

---

## Core Capabilities

1. **Executive Briefing**: High-level exposure telemetry, benchmark accuracy, and strategic insight memo.
2. **Dataset Studio**: Ingest raw datasets (CSV/JSON), automated data preparation checklist, statistical health metrics.
3. **Model Benchmark Lab**: Empirical evaluation across Logistic Regression, Random Forest, XGBoost, and Neural Networks with ROC-AUC and Confusion Matrix drawers.
4. **Prediction Center**: Account-level predictions with calibrated probabilities, confidence bounds, and SHAP-aligned feature attribution.
5. **Risk Radar**: 2D scatter risk distribution with tier filters (All, High, Medium, Low) and side record inspector.
6. **What-If Intervention Simulator**: Real-time slider sensitivity analysis evaluating managerial interventions on customer churn.
7. **Executive Decision Reports**: One-click PDF memo export, auditable CSV manifest, and full SQLite database dumps.

---

## Motion Experience ("The Signal")

PredictIQ features a 7-stage scroll-reactive motion layer (`MotionSceneController`):
- **0–15%**: *Executive Briefing* — Atmospheric coordinate grid & subtle Brownian particles (Chaos / Rest)
- **15–32%**: *Dataset Studio* — Particles progressively organize into a columnar feature matrix (Structure)
- **32–48%**: *Model Benchmark* — Synaptic connections illuminate the recommended model head (Model)
- **48–63%**: *Prediction Center* — Network folds into a forecast trajectory curve with confidence envelopes (Prediction)
- **63–80%**: *Risk Radar* — Curve expands into a 2D probability density field reacting to tier filters (Risk)
- **80–92%**: *What-If Simulator* — Streamline ribbons oscillate dynamically responding to simulation sliders (Sensitivity)
- **92–100%**: *Reports & Decision* — Constellation condenses into 4 crystalline decision nodes (Decision)

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Design Tokens, Responsive Grid), ES6+ JavaScript
- **Database**: In-browser SQLite (`sql.js`) with IndexedDB local persistence
- **Visualizations**: Zero-dependency accessible SVG charts (ROC, Trend, Confusion Matrix, Scatter)
- **Cinematic Engine**: Canvas 2D with hardware acceleration, `prefers-reduced-motion` compliance, non-blocking `pointer-events: none`

---

## Local Development

To run locally:

```powershell
# Using PowerShell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Or open `index.html` directly in any modern web browser or static server.
