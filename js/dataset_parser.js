/**
 * PredictIQ Dataset Parser & Automated Preprocessing Engine
 * Robust, client-side CSV/JSON ingestion, statistical data profiling,
 * missing-value imputation, outlier winsorization, and feature encoding.
 */

const DatasetParser = (() => {

  /**
   * Robust RFC-4180 compliant CSV parser
   * Handles commas inside quoted strings, double-quote escapes, and newlines.
   */
  function parseCSV(text) {
    if (!text || typeof text !== 'string') return [];
    // Remove byte-order mark (BOM)
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"';
          i += 2;
          continue;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
          continue;
        }
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      }

      if ((char === '\r' || char === '\n') && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (char === '\r' && nextChar === '\n') {
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      currentCell += char;
      i++;
    }

    // Flush remaining cell/row
    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
    const dataRows = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
      const rowObj = {};
      headers.forEach((header, idx) => {
        rowObj[header] = idx < row.length ? row[idx] : '';
      });
      dataRows.push(rowObj);
    }

    return { headers, rows: dataRows };
  }

  /**
   * Parse JSON input format (array of objects or tabular schema)
   */
  function parseJSON(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON format: ' + e.message);
    }

    let rows = [];
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed && Array.isArray(parsed.data)) {
      rows = parsed.data;
    } else if (parsed && typeof parsed === 'object') {
      rows = [parsed];
    }

    if (!rows.length || typeof rows[0] !== 'object') {
      throw new Error('JSON must contain an array of data record objects.');
    }

    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    return { headers, rows };
  }

  /**
   * Statistical Data Profiling: computes missingness, duplicates, outliers, and types.
   */
  function profileDataset(headers, rows) {
    const rowCount = rows.length;
    const colCount = headers.length;
    const missingValuesSet = new Set(['', 'na', 'n/a', 'null', 'nan', 'none', '?', 'undefined']);

    const columnTypes = {};
    const columnMissing = {};
    let totalMissingCells = 0;

    // Detect column data types (numeric vs categorical)
    headers.forEach(h => {
      let numCount = 0;
      let stringCount = 0;
      let missingCount = 0;

      rows.forEach(r => {
        const val = String(r[h] ?? '').trim().toLowerCase();
        if (missingValuesSet.has(val)) {
          missingCount++;
        } else if (!isNaN(Number(val)) && val !== '') {
          numCount++;
        } else {
          stringCount++;
        }
      });

      columnMissing[h] = missingCount;
      totalMissingCells += missingCount;

      // If at least 75% of non-missing values are numeric, treat as numeric
      const validCount = numCount + stringCount;
      if (validCount > 0 && numCount / validCount >= 0.75) {
        columnTypes[h] = 'numeric';
      } else {
        columnTypes[h] = 'categorical';
      }
    });

    const totalCells = rowCount * colCount;
    const missingPct = +(totalCells > 0 ? (totalMissingCells / totalCells) * 100 : 0).toFixed(2);

    // Duplicate detection via serialized hash
    const seenRows = new Set();
    let duplicateCount = 0;
    rows.forEach(r => {
      const key = headers.map(h => String(r[h] ?? '')).join('|~|');
      if (seenRows.has(key)) {
        duplicateCount++;
      } else {
        seenRows.add(key);
      }
    });

    // Outlier detection on numerical columns via 1.5 * IQR
    let outlierCount = 0;
    const numericCols = headers.filter(h => columnTypes[h] === 'numeric');

    numericCols.forEach(h => {
      const vals = [];
      rows.forEach(r => {
        const raw = String(r[h] ?? '').trim().toLowerCase();
        if (!missingValuesSet.has(raw)) {
          const n = Number(raw);
          if (!isNaN(n)) vals.push(n);
        }
      });

      if (vals.length >= 10) {
        vals.sort((a, b) => a - b);
        const q1 = vals[Math.floor(vals.length * 0.25)];
        const q3 = vals[Math.floor(vals.length * 0.75)];
        const iqr = q3 - q1;
        if (iqr > 0) {
          const lower = q1 - 1.5 * iqr;
          const upper = q3 + 1.5 * iqr;
          vals.forEach(v => {
            if (v < lower || v > upper) outlierCount++;
          });
        }
      }
    });

    // Quality Score calculation (100 base, with bounded penalties)
    const duplicatePct = rowCount > 0 ? (duplicateCount / rowCount) * 100 : 0;
    const outlierPct = (rowCount * numericCols.length) > 0 
      ? (outlierCount / (rowCount * numericCols.length)) * 100 
      : 0;

    let qualityScore = 100 - (missingPct * 1.5 + duplicatePct * 1.2 + outlierPct * 0.4);
    qualityScore = Math.max(60, Math.min(99.8, +qualityScore.toFixed(1)));

    return {
      rowCount,
      colCount,
      columnTypes,
      columnMissing,
      missingPct,
      duplicateCount,
      outlierCount,
      qualityScore
    };
  }

  /**
   * Identify the target column for binary classification
   */
  function detectTargetColumn(headers, rows, columnTypes) {
    const candidates = [
      'churn', 'churned', 'target', 'label', 'class', 'default', 'defaulted',
      'risk', 'risk_tier', 'outcome', 'y', 'status', 'subscribed', 'response'
    ];

    const lowerHeaders = headers.map(h => h.toLowerCase());
    for (const c of candidates) {
      const idx = lowerHeaders.indexOf(c);
      if (idx !== -1) return headers[idx];
    }

    // Otherwise check for any column with exactly 2 unique values
    for (let i = headers.length - 1; i >= 0; i--) {
      const h = headers[i];
      const uniqueVals = new Set(rows.map(r => String(r[h] ?? '').trim().toLowerCase()));
      uniqueVals.delete('');
      uniqueVals.delete('na');
      uniqueVals.delete('null');
      if (uniqueVals.size === 2) return h;
    }

    // Default to last column
    return headers[headers.length - 1];
  }

  /**
   * Automated Data Prep: Imputation, Encoding, and Scaling
   */
  function prepareDatasetForML(headers, rows, targetCol) {
    const profile = profileDataset(headers, rows);
    const missingValuesSet = new Set(['', 'na', 'n/a', 'null', 'nan', 'none', '?', 'undefined']);
    const target = targetCol || detectTargetColumn(headers, rows, profile.columnTypes);

    // 1. Identify Target Classes and Map to 0/1
    const targetVals = rows.map(r => String(r[target] ?? '').trim());
    const uniqueTargets = Array.from(new Set(targetVals.filter(v => !missingValuesSet.has(v.toLowerCase()))));
    
    // Default 0/1 mapping
    let posClass = uniqueTargets[1] || '1';
    let negClass = uniqueTargets[0] || '0';

    // Heuristics: if one is 'Yes', '1', 'True', 'Churn', 'Positive' -> make that class 1
    const positiveKeywords = ['yes', '1', 'true', 'churn', 'churned', 'default', 'positive', 'high', 'bad'];
    uniqueTargets.forEach(u => {
      if (positiveKeywords.includes(u.toLowerCase())) {
        posClass = u;
        negClass = uniqueTargets.find(v => v !== u) || negClass;
      }
    });

    const targetMap = { 0: negClass, 1: posClass };

    // 2. Compute Medians for Numeric Imputation & Modes for Categorical
    const featureCols = headers.filter(h => h !== target && !h.toLowerCase().includes('id') && !h.toLowerCase().includes('name'));
    const imputationStats = {};

    featureCols.forEach(h => {
      const isNum = profile.columnTypes[h] === 'numeric';
      if (isNum) {
        const nums = [];
        rows.forEach(r => {
          const v = String(r[h] ?? '').trim().toLowerCase();
          if (!missingValuesSet.has(v)) {
            const n = Number(v);
            if (!isNaN(n)) nums.push(n);
          }
        });
        nums.sort((a, b) => a - b);
        const median = nums.length ? nums[Math.floor(nums.length / 2)] : 0;
        const min = nums.length ? nums[0] : 0;
        const max = nums.length ? nums[nums.length - 1] : 1;
        imputationStats[h] = { type: 'numeric', median, min, max: max > min ? max : min + 1 };
      } else {
        const counts = {};
        rows.forEach(r => {
          const v = String(r[h] ?? '').trim();
          if (!missingValuesSet.has(v.toLowerCase())) {
            counts[v] = (counts[v] || 0) + 1;
          }
        });
        let mode = 'Unknown';
        let maxC = -1;
        for (const [k, count] of Object.entries(counts)) {
          if (count > maxC) {
            maxC = count;
            mode = k;
          }
        }
        imputationStats[h] = { type: 'categorical', mode, unique: Object.keys(counts) };
      }
    });

    // 3. One-hot / numeric feature matrix construction
    // Collect unique values for categorical features with <= 10 categories
    const encodedFeatures = [];
    featureCols.forEach(h => {
      const stat = imputationStats[h];
      if (stat.type === 'numeric') {
        encodedFeatures.push({ name: h, col: h, type: 'numeric' });
      } else {
        // Binary or small cardinality: create indicator columns
        const cats = stat.unique.filter(c => c !== stat.mode).slice(0, 6);
        if (cats.length === 0) {
          encodedFeatures.push({ name: `${h}_val`, col: h, type: 'categorical', val: stat.mode });
        } else {
          cats.forEach(cat => {
            encodedFeatures.push({ name: `${h}=${cat}`, col: h, type: 'categorical', val: cat });
          });
        }
      }
    });

    // 4. Build numerical matrix X and binary vector y
    const X = [];
    const y = [];
    const validRows = [];

    rows.forEach((r, rowIdx) => {
      const targetVal = String(r[target] ?? '').trim();
      if (missingValuesSet.has(targetVal.toLowerCase())) return; // skip missing target

      const label = (targetVal.toLowerCase() === posClass.toLowerCase() || targetVal === '1') ? 1 : 0;
      const xRow = new Float64Array(encodedFeatures.length);

      encodedFeatures.forEach((feat, fIdx) => {
        const stat = imputationStats[feat.col];
        if (feat.type === 'numeric') {
          const rawVal = String(r[feat.col] ?? '').trim().toLowerCase();
          let numVal = missingValuesSet.has(rawVal) ? stat.median : Number(rawVal);
          if (isNaN(numVal)) numVal = stat.median;

          // Winsorize and Min-Max scale into [0, 1]
          const scaled = (numVal - stat.min) / (stat.max - stat.min);
          xRow[fIdx] = Math.max(0, Math.min(1, scaled));
        } else {
          const rawVal = String(r[feat.col] ?? '').trim();
          xRow[fIdx] = (rawVal === feat.val) ? 1.0 : 0.0;
        }
      });

      X.push(xRow);
      y.push(label);
      validRows.push(r);
    });

    return {
      profile,
      targetCol: target,
      targetMap,
      featureNames: encodedFeatures.map(f => f.name),
      X,
      y,
      sampleCount: X.length,
      featureCount: encodedFeatures.length,
      validRows
    };
  }

  return {
    parseCSV,
    parseJSON,
    profileDataset,
    detectTargetColumn,
    prepareDatasetForML
  };
})();

window.DatasetParser = DatasetParser;
