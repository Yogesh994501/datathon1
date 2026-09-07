/**
 * PredictIQ ML Background Worker
 * Runs computationally intensive model training (Mini-batch SGD, holdout evaluation,
 * and ROC-AUC calculation) off the main thread to guarantee smooth 60fps UI.
 */

self.importScripts('ml_engine.js');

self.onmessage = function(e) {
  const data = e.data;
  if (!data || !data.action) return;

  if (data.action === 'RUN_BENCHMARK') {
    try {
      self.postMessage({ type: 'STATUS', message: 'Fitting Logistic Regression with L2 penalty...' });
      const benchmark = ML.runFullBenchmark(data.payload);
      self.postMessage({ type: 'SUCCESS', benchmark });
    } catch (err) {
      self.postMessage({ type: 'ERROR', message: err.message || 'Worker ML training failure.' });
    }
  }
};
