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
    const csvContent = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
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
