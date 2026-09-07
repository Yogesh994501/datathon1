# PredictIQ — AI Predictive Insight Dashboard

**PredictIQ** is a sober, executive AI Decision Intelligence platform that transforms historical datasets into explainable, calibrated forecasts and strategic organizational actions.

Built with "The Briefing" editorial design philosophy, an in-browser SQLite relational database (`sql.js`), and a MotionSites-inspired scroll-reactive cinematic motion system.

---

## Live Demo

🌐 **GitHub Pages**: [https://yogesh994501.github.io/datathon1/](https://yogesh994501.github.io/datathon1/)

---

## Core Capabilities

1. **Real Client-Side ML Engine (`window.ML`)**:
   - In-browser file parsing via **PapaParse** (and RFC-4180 fallback) for CSV and JSON datasets.
   - Dynamic schema mapping into in-memory **sql.js** relational tables.
   - **Session Persistence**: Full IndexedDB database sync across browser sessions with a one-click `clearSession()` reset.
   - **Automated Preprocessing**: Live row/col counts, missingness detection, duplicate identifier pruning, and Tukey fence ($1.5 \times \text{IQR}$) statistical outlier detection.
   - **Model Training**: Pure JavaScript Binary Logistic Regression with L2 regularization ($\lambda = 0.02$) and Stochastic Gradient Descent (SGD), CART Decision Tree, Gaussian Naive Bayes, and Soft-Voting Ensemble on an 80/20 stratified holdout split.
   - **Dynamic Evaluation**: Exact Confusion Matrix ($TP, FP, TN, FN$), Accuracy, Precision, Recall, F1, and exact trapezoidal ROC-AUC integration.
   - **Explainable AI Attribution**: Entity-level feature contributions calculated dynamically as $c_i = w_i \cdot x_i$.
   - **Live What-If Simulator**: Live $\sigma(z) = \frac{1}{1 + e^{-z}}$ recalculation binding sliders directly to trained model weights.
   - **Model Methodology Card**: Enterprise model card documenting assumptions, loss function, calibration, and split methodology.
   - **Session Export/Import**: Full portable JSON session export/import for cross-stakeholder auditability.

2. **Executive Briefing**: High-level exposure telemetry, benchmark accuracy, forecast trend with 95% confidence intervals, and strategic insight memo.
3. **Dataset Studio**: Ingest raw datasets (CSV/JSON), automated data preparation checklist, statistical health metrics.
4. **Model Benchmark Lab**: Empirical evaluation across Logistic Regression, Soft-Voting Ensemble, Decision Tree, and Naive Bayes with dynamic ROC-AUC and Confusion Matrix drawers.
5. **Prediction Center**: Account-level predictions with calibrated probabilities, confidence bounds, and real feature attributions.
6. **Risk Radar**: 2D scatter risk distribution with tier filters (All, High, Medium, Low) and accessible record inspector.
7. **What-If Intervention Simulator**: Real-time slider sensitivity analysis evaluating managerial interventions on risk outcomes.
8. **Executive Decision Reports**: One-click PDF memo export, auditable CSV manifest, and full SQLite database dumps.

---

## Model Card & Methodology Summary

| Parameter | Specification |
| :--- | :--- |
| **Algorithm** | $L_2$-Regularized Binary Logistic Regression + SGD / CART Decision Tree / Gaussian NB / Soft Ensemble |
| **Objective Function** | Binary Cross-Entropy Loss with $L_2$ Regularization ($\lambda = 0.02$) |
| **Holdout Partition** | 80% Stratified Training / 20% Stratified Holdout Test |
| **Probability Calibration** | Sigmoid link function: $\sigma(z) = \frac{1}{1 + e^{-z}}$, classification threshold $p = 0.50$ |
| **ROC Integration** | Exact trapezoidal Riemann sum integration over empirical $(FPR, TPR)$ threshold sweep |
| **Feature Processing** | Continuous standardization (mean/std), categorical bounded one-hot encoding, Tukey IQR outlier isolation |

---

## Verification Test Suite

Run the automated in-browser unit test suite:
```
http://localhost:3000/tests/test_ml.html
```
Verifies RFC-4180 CSV parsing, Tukey fence outlier detection, logistic regression convergence ($> 85\%$ accuracy on synthetic separable data), confusion matrix partition completeness, and trapezoidal ROC-AUC bounds.

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
- **Database**: In-browser SQLite (`sql.js`) with IndexedDB local persistence and dynamic table generation
- **Machine Learning**: Pure client-side JS ML engine (`window.ML`) supporting Logistic Regression, Decision Tree, Naive Bayes, and Ensemble models
- **Visualizations**: Zero-dependency accessible SVG charts (ROC curve with exact coordinate mapping, 95% CI Trend forecast, Confusion Matrix, 2D Scatter)
- **Cinematic Engine**: Canvas 2D with hardware acceleration, `prefers-reduced-motion` compliance, non-blocking `pointer-events: none`

---

## Local Development

To run locally:

```powershell
# Using PowerShell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Or open `index.html` directly in any modern web browser or static server.
