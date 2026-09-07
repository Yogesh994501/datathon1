/**
 * PredictIQ Reports & Data Export Module
 * Direct SQL query exports (CSV, JSON, SQLite dump) and print-ready executive memo.
 */

const Reports = {
  exportPredictionsCSV() {
    const db = window.predictiqDb;
    if (!db) return;

    const rows = db.query('SELECT * FROM predictions ORDER BY created_at DESC');
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const sanitizeCsvCell = (val) => {
      let str = String(val ?? '');
      // Security: Prepend apostrophe if cell begins with spreadsheet formula triggers (=, +, -, @, tab, CR)
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(r => headers.map(h => sanitizeCsvCell(r[h])).join(','))
    ].join('\n');

    this._downloadBlob(csvContent, 'predictiq_predictions_export.csv', 'text/csv;charset=utf-8;');
  },

  exportPredictionsJSON() {
    const db = window.predictiqDb;
    if (!db) return;

    const rows = db.query('SELECT * FROM predictions ORDER BY created_at DESC');
    const jsonStr = JSON.stringify(rows, null, 2);
    this._downloadBlob(jsonStr, 'predictiq_predictions_export.json', 'application/json');
  },

  getRecordJSONPayload(recordId) {
    const db = window.predictiqDb;
    if (!db) return null;

    const res = db.query(`SELECT * FROM predictions WHERE id = '${recordId}' LIMIT 1`);
    if (!res.length) return null;
    const rec = res[0];
    const recModel = db.query(`SELECT * FROM model_runs WHERE id = '${rec.model_run_id}' LIMIT 1`)[0] || null;
    const recommendation = db.getRecommendationForPrediction(recordId);
    const actionPlan = db.getActionPlanForPrediction ? db.getActionPlanForPrediction(recordId) : null;
    const features = recModel ? db.getFeatureImportances(recModel.id) : [];

    return {
      audit_metadata: {
        system: "PredictIQ Decision Intelligence",
        version: "3.0-briefing",
        exported_at: new Date().toISOString(),
        classification: "CONFIDENTIAL - ORGANIZATIONAL RISK ASSESSMENT"
      },
      entity: {
        id: rec.id,
        record_ref: rec.record_ref,
        assessed_probability: rec.probability,
        confidence_score: rec.confidence,
        risk_tier: rec.risk_tier,
        outcome_classification: rec.outcome_label,
        assessed_at: rec.created_at
      },
      calibrated_model: recModel ? {
        algorithm: recModel.algorithm,
        auc_score: recModel.auc,
        accuracy: recModel.accuracy,
        f1_score: recModel.f1_score,
        trained_at: recModel.trained_at
      } : null,
      top_predictive_drivers: features.slice(0, 5).map(f => ({
        feature: f.feature_name,
        importance_weight: `${f.importance}%`
      })),
      prescribed_action: recommendation ? {
        summary: recommendation.summary_text,
        potential_impact_exposure_usd: recommendation.potential_impact
      } : {
        summary: "Continue standard monitoring protocol; re-evaluate at next checkpoint."
      },
      action_plan_assignment: actionPlan ? {
        status: actionPlan.status,
        assigned_to: actionPlan.assigned_to,
        playbook: actionPlan.playbook,
        sla: actionPlan.sla,
        assigned_at: actionPlan.assigned_at,
        notes: actionPlan.notes
      } : {
        status: "Unassigned",
        recommended_playbook: "Term-contract migration incentive"
      }
    };
  },

  exportRecordJSON(recordId) {
    const payload = this.getRecordJSONPayload(recordId);
    if (!payload) return;

    const ref = payload.entity.record_ref.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFilename = `predictiq_${ref}_record.json`;
    const jsonStr = JSON.stringify(payload, null, 2);
    this._downloadBlob(jsonStr, cleanFilename, 'application/json');

    if (window.showToast) {
      window.showToast(`Exported ${payload.entity.record_ref} JSON file successfully.`, 'success');
    }
  },

  exportDatabaseDump() {
    const db = window.predictiqDb;
    if (!db) return;

    const dumpStr = db.exportDatabaseDump();
    this._downloadBlob(dumpStr, 'predictiq_dataset_schema.sqlite.json', 'application/json');
  },

  printExecutiveMemo() {
    window.print();
  },

  _downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

window.Reports = Reports;
