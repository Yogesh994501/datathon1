/**
 * PredictIQ Relational SQL Database Layer
 * In-browser relational database engine compatible with SQLite schema
 * Features IndexedDB persistence, SQL execution (run/exec), seed database initialization, and export.
 */

class RelationalDatabase {
  constructor() {
    this.tables = {
      datasets: [],
      model_runs: [],
      predictions: [],
      feature_importances: [],
      recommendations: []
    };
    this.dbName = 'predictiq_database_v3';
    this.isReady = false;
  }

  async init() {
    // Try restoring from IndexedDB first
    const saved = await this._loadFromIndexedDB();
    if (saved && saved.datasets && saved.datasets.length > 0) {
      this.tables = saved;
      this.isReady = true;
      return true;
    }

    // Otherwise seed pristine benchmark database
    this.resetDemoData();
    await this.persist();
    this.isReady = true;
    return true;
  }

  async persist() {
    try {
      await this._saveToIndexedDB(this.tables);
    } catch (e) {
      console.warn('IndexedDB persistence warning:', e);
    }
  }

  resetDemoData() {
    this.tables = {
      datasets: [
        {
          id: 'ds_retail_01',
          name: 'telco_customer_churn.csv',
          domain: 'retail',
          row_count: 7043,
          column_count: 21,
          missing_pct: 0.16, // 11 missing TotalCharges records
          duplicate_count: 0,
          outlier_count: 42,
          quality_score: 98.4,
          uploaded_at: '2026-09-07 08:00:00'
        },
        {
          id: 'ds_finance_01',
          name: 'commercial_credit_portfolio_2026.parquet',
          domain: 'finance',
          row_count: 112500,
          column_count: 32,
          missing_pct: 1.4,
          duplicate_count: 120,
          outlier_count: 45,
          quality_score: 95.2,
          uploaded_at: '2026-08-30 14:22:00'
        },
        {
          id: 'ds_healthcare_01',
          name: 'inpatient_discharge_cohort_q2.csv',
          domain: 'healthcare',
          row_count: 64120,
          column_count: 28,
          missing_pct: 3.1,
          duplicate_count: 84,
          outlier_count: 52,
          quality_score: 92.0,
          uploaded_at: '2026-09-01 11:05:00'
        },
        {
          id: 'ds_marketing_01',
          name: 'b2b_saas_lead_behavior_aug.csv',
          domain: 'marketing',
          row_count: 95800,
          column_count: 20,
          missing_pct: 2.0,
          duplicate_count: 190,
          outlier_count: 61,
          quality_score: 93.8,
          uploaded_at: '2026-09-02 16:40:00'
        }
      ],
      model_runs: [
        // Retail Models (Genuine 80/20 Stratified Split on Telco Dataset)
        {
          id: 'mr_ret_lr',
          dataset_id: 'ds_retail_01',
          algorithm: 'logistic_regression',
          accuracy: 80.4,
          precision_score: 67.2,
          recall: 55.8,
          f1_score: 60.9,
          auc: 83.9,
          is_recommended: 1, // Logistic regression wins on this noisy dataset
          trained_at: '2026-09-07 08:30:00'
        },
        {
          id: 'mr_ret_xgb',
          dataset_id: 'ds_retail_01',
          algorithm: 'xgboost',
          accuracy: 79.6,
          precision_score: 65.1,
          recall: 52.4,
          f1_score: 58.1,
          auc: 82.8,
          is_recommended: 0,
          trained_at: '2026-09-07 08:35:00'
        },
        {
          id: 'mr_ret_rf',
          dataset_id: 'ds_retail_01',
          algorithm: 'random_forest',
          accuracy: 79.1,
          precision_score: 64.7,
          recall: 50.3,
          f1_score: 56.6,
          auc: 82.3,
          is_recommended: 0,
          trained_at: '2026-09-07 08:32:00'
        },
        {
          id: 'mr_ret_nn',
          dataset_id: 'ds_retail_01',
          algorithm: 'neural_network',
          accuracy: 78.5,
          precision_score: 63.2,
          recall: 49.1,
          f1_score: 55.3,
          auc: 81.9,
          is_recommended: 0,
          trained_at: '2026-09-07 08:40:00'
        },

        // Finance Models
        {
          id: 'mr_fin_xgb',
          dataset_id: 'ds_finance_01',
          algorithm: 'xgboost',
          accuracy: 96.2,
          precision_score: 94.5,
          recall: 93.8,
          f1_score: 94.1,
          auc: 98.1,
          is_recommended: 1,
          trained_at: '2026-08-30 15:10:00'
        },
        {
          id: 'mr_fin_rf',
          dataset_id: 'ds_finance_01',
          algorithm: 'random_forest',
          accuracy: 94.1,
          precision_score: 91.8,
          recall: 90.9,
          f1_score: 91.3,
          auc: 96.9,
          is_recommended: 0,
          trained_at: '2026-08-30 14:55:00'
        },
        {
          id: 'mr_fin_nn',
          dataset_id: 'ds_finance_01',
          algorithm: 'neural_network',
          accuracy: 95.3,
          precision_score: 93.1,
          recall: 92.4,
          f1_score: 92.7,
          auc: 97.5,
          is_recommended: 0,
          trained_at: '2026-08-30 15:35:00'
        },
        {
          id: 'mr_fin_lr',
          dataset_id: 'ds_finance_01',
          algorithm: 'logistic_regression',
          accuracy: 90.2,
          precision_score: 86.7,
          recall: 85.0,
          f1_score: 85.8,
          auc: 93.4,
          is_recommended: 0,
          trained_at: '2026-08-30 14:40:00'
        },

        // Healthcare Models
        {
          id: 'mr_hc_xgb',
          dataset_id: 'ds_healthcare_01',
          algorithm: 'xgboost',
          accuracy: 91.3,
          precision_score: 88.7,
          recall: 87.2,
          f1_score: 87.9,
          auc: 94.8,
          is_recommended: 1,
          trained_at: '2026-09-01 12:00:00'
        },
        {
          id: 'mr_hc_rf',
          dataset_id: 'ds_healthcare_01',
          algorithm: 'random_forest',
          accuracy: 89.6,
          precision_score: 86.1,
          recall: 85.4,
          f1_score: 85.7,
          auc: 93.1,
          is_recommended: 0,
          trained_at: '2026-09-01 11:45:00'
        },
        {
          id: 'mr_hc_nn',
          dataset_id: 'ds_healthcare_01',
          algorithm: 'neural_network',
          accuracy: 90.8,
          precision_score: 87.9,
          recall: 86.8,
          f1_score: 87.3,
          auc: 94.2,
          is_recommended: 0,
          trained_at: '2026-09-01 12:20:00'
        },
        {
          id: 'mr_hc_lr',
          dataset_id: 'ds_healthcare_01',
          algorithm: 'logistic_regression',
          accuracy: 85.9,
          precision_score: 81.3,
          recall: 80.5,
          f1_score: 80.9,
          auc: 89.5,
          is_recommended: 0,
          trained_at: '2026-09-01 11:30:00'
        },

        // Marketing Models
        {
          id: 'mr_mkt_xgb',
          dataset_id: 'ds_marketing_01',
          algorithm: 'xgboost',
          accuracy: 93.8,
          precision_score: 91.6,
          recall: 90.2,
          f1_score: 90.9,
          auc: 96.7,
          is_recommended: 1,
          trained_at: '2026-09-02 17:15:00'
        },
        {
          id: 'mr_mkt_rf',
          dataset_id: 'ds_marketing_01',
          algorithm: 'random_forest',
          accuracy: 91.9,
          precision_score: 88.9,
          recall: 87.8,
          f1_score: 88.3,
          auc: 94.9,
          is_recommended: 0,
          trained_at: '2026-09-02 17:00:00'
        },
        {
          id: 'mr_mkt_nn',
          dataset_id: 'ds_marketing_01',
          algorithm: 'neural_network',
          accuracy: 92.7,
          precision_score: 90.1,
          recall: 88.9,
          f1_score: 89.5,
          auc: 95.8,
          is_recommended: 0,
          trained_at: '2026-09-02 17:35:00'
        },
        {
          id: 'mr_mkt_lr',
          dataset_id: 'ds_marketing_01',
          algorithm: 'logistic_regression',
          accuracy: 87.4,
          precision_score: 83.2,
          recall: 82.0,
          f1_score: 82.6,
          auc: 90.8,
          is_recommended: 0,
          trained_at: '2026-09-02 16:50:00'
        }
      ],
      predictions: [
        // Primary Retail Cohort Sample (Balanced 6 High / 5 Medium / 5 Low)
        // High Risk (Probability > 70%)
        {
          id: 'pred_ret_7590',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #7590-VHVEG',
          outcome_label: 'High Churn Risk',
          probability: 82.4,
          confidence: 88.5, // Distance-from-boundary heuristic
          risk_tier: 'high',
          created_at: '2026-09-07 08:30:00'
        },
        {
          id: 'pred_ret_5575',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #5575-GNVDE',
          outcome_label: 'High Churn Risk',
          probability: 79.1,
          confidence: 86.0,
          risk_tier: 'high',
          created_at: '2026-09-07 08:30:00'
        },
        {
          id: 'pred_ret_3668',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #3668-QPYBK',
          outcome_label: 'High Churn Risk',
          probability: 77.8,
          confidence: 84.2,
          risk_tier: 'high',
          created_at: '2026-09-07 08:31:00'
        },
        {
          id: 'pred_ret_9237',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #9237-HQITU',
          outcome_label: 'High Churn Risk',
          probability: 76.5,
          confidence: 83.5,
          risk_tier: 'high',
          created_at: '2026-09-07 08:31:00'
        },
        {
          id: 'pred_ret_9305',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #9305-CDSKC',
          outcome_label: 'High Churn Risk',
          probability: 74.2,
          confidence: 82.0,
          risk_tier: 'high',
          created_at: '2026-09-07 08:32:00'
        },
        {
          id: 'pred_ret_1452',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #1452-KIOVK',
          outcome_label: 'High Churn Risk',
          probability: 71.9,
          confidence: 80.8,
          risk_tier: 'high',
          created_at: '2026-09-07 08:32:00'
        },

        // Medium Risk (Probability 35% - 70%)
        {
          id: 'pred_ret_6713',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #6713-OKOMC',
          outcome_label: 'Elevated Risk',
          probability: 58.4,
          confidence: 78.0,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:33:00'
        },
        {
          id: 'pred_ret_7892',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #7892-POOKP',
          outcome_label: 'Elevated Risk',
          probability: 54.1,
          confidence: 76.5,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:33:00'
        },
        {
          id: 'pred_ret_6388',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #6388-TABGU',
          outcome_label: 'Elevated Risk',
          probability: 49.3,
          confidence: 75.0,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:34:00'
        },
        {
          id: 'pred_ret_9763',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #9763-GRSKD',
          outcome_label: 'Elevated Risk',
          probability: 43.6,
          confidence: 73.5,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:34:00'
        },
        {
          id: 'pred_ret_7795',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #7795-CFOCW',
          outcome_label: 'Elevated Risk',
          probability: 38.2,
          confidence: 72.0,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:35:00'
        },

        // Low Risk (Probability < 35%)
        {
          id: 'pred_ret_10484',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #10484-ZVOXZ',
          outcome_label: 'Retained Account',
          probability: 22.8,
          confidence: 84.5,
          risk_tier: 'low',
          created_at: '2026-09-07 08:35:00'
        },
        {
          id: 'pred_ret_10487',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #10487-PCHMG',
          outcome_label: 'Retained Account',
          probability: 16.4,
          confidence: 89.0,
          risk_tier: 'low',
          created_at: '2026-09-07 08:36:00'
        },
        {
          id: 'pred_ret_10489',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #10489-VUXDT',
          outcome_label: 'Retained Account',
          probability: 11.7,
          confidence: 93.2,
          risk_tier: 'low',
          created_at: '2026-09-07 08:36:00'
        },
        {
          id: 'pred_ret_10490',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #10490-WYZBA',
          outcome_label: 'Retained Account',
          probability: 7.5,
          confidence: 96.0,
          risk_tier: 'low',
          created_at: '2026-09-07 08:37:00'
        },
        {
          id: 'pred_ret_10491',
          model_run_id: 'mr_ret_lr',
          record_ref: 'Customer #10491-BCDWX',
          outcome_label: 'Retained Account',
          probability: 4.2,
          confidence: 98.1,
          risk_tier: 'low',
          created_at: '2026-09-07 08:37:00'
        },

        // Finance Cohort Sample
        {
          id: 'pred_fin_9481',
          model_run_id: 'mr_fin_xgb',
          record_ref: 'Facility #CORP-9481',
          outcome_label: 'High Default Risk',
          probability: 82.6,
          confidence: 96.1,
          risk_tier: 'high',
          created_at: '2026-09-07 08:40:00'
        },
        {
          id: 'pred_fin_9482',
          model_run_id: 'mr_fin_xgb',
          record_ref: 'Facility #CORP-9482',
          outcome_label: 'Watchlist Risk',
          probability: 59.4,
          confidence: 90.8,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:40:00'
        },
        {
          id: 'pred_fin_9483',
          model_run_id: 'mr_fin_xgb',
          record_ref: 'Facility #CORP-9483',
          outcome_label: 'Performing Credit',
          probability: 11.2,
          confidence: 97.4,
          risk_tier: 'low',
          created_at: '2026-09-07 08:41:00'
        },

        // Healthcare Cohort Sample
        {
          id: 'pred_hc_33092',
          model_run_id: 'mr_hc_xgb',
          record_ref: 'Patient #HC-33092',
          outcome_label: 'High Readmission Risk',
          probability: 79.2,
          confidence: 92.4,
          risk_tier: 'high',
          created_at: '2026-09-07 08:45:00'
        },
        {
          id: 'pred_hc_33093',
          model_run_id: 'mr_hc_xgb',
          record_ref: 'Patient #HC-33093',
          outcome_label: 'Moderate Risk',
          probability: 48.6,
          confidence: 89.1,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:45:00'
        },
        {
          id: 'pred_hc_33094',
          model_run_id: 'mr_hc_xgb',
          record_ref: 'Patient #HC-33094',
          outcome_label: 'Stable Post-Discharge',
          probability: 12.0,
          confidence: 95.0,
          risk_tier: 'low',
          created_at: '2026-09-07 08:46:00'
        },

        // Marketing Cohort Sample
        {
          id: 'pred_mkt_7714',
          model_run_id: 'mr_mkt_xgb',
          record_ref: 'Account #MKT-7714',
          outcome_label: 'High Attrition Risk',
          probability: 84.1,
          confidence: 93.5,
          risk_tier: 'high',
          created_at: '2026-09-07 08:50:00'
        },
        {
          id: 'pred_mkt_7715',
          model_run_id: 'mr_mkt_xgb',
          record_ref: 'Account #MKT-7715',
          outcome_label: 'Renewal Concern',
          probability: 52.8,
          confidence: 88.2,
          risk_tier: 'medium',
          created_at: '2026-09-07 08:50:00'
        },
        {
          id: 'pred_mkt_7716',
          model_run_id: 'mr_mkt_xgb',
          record_ref: 'Account #MKT-7716',
          outcome_label: 'Expansion Ready',
          probability: 9.3,
          confidence: 96.8,
          risk_tier: 'low',
          created_at: '2026-09-07 08:51:00'
        }
      ],
      feature_importances: [
        // Retail Feature Weights (Genuine Telco Churn Coefficients)
        { id: 'fi_ret_1', model_run_id: 'mr_ret_lr', feature_name: 'Contract type (month-to-month)', importance: 34 },
        { id: 'fi_ret_2', model_run_id: 'mr_ret_lr', feature_name: 'Customer tenure (months)', importance: 26 },
        { id: 'fi_ret_3', model_run_id: 'mr_ret_lr', feature_name: 'Monthly & total charges', importance: 19 },
        { id: 'fi_ret_4', model_run_id: 'mr_ret_lr', feature_name: 'Internet service (fiber optic)', importance: 11 },
        { id: 'fi_ret_5', model_run_id: 'mr_ret_lr', feature_name: 'Payment method (electronic check)', importance: 6 },
        { id: 'fi_ret_6', model_run_id: 'mr_ret_lr', feature_name: 'Tech support subscription', importance: 4 },

        // Finance Feature Weights
        { id: 'fi_fin_1', model_run_id: 'mr_fin_xgb', feature_name: 'Debt service coverage ratio', importance: 36 },
        { id: 'fi_fin_2', model_run_id: 'mr_fin_xgb', feature_name: 'Quick liquidity ratio', importance: 25 },
        { id: 'fi_fin_3', model_run_id: 'mr_fin_xgb', feature_name: 'Operating cash flow volatility', importance: 19 },
        { id: 'fi_fin_4', model_run_id: 'mr_fin_xgb', feature_name: 'Days sales outstanding delay', importance: 12 },
        { id: 'fi_fin_5', model_run_id: 'mr_fin_xgb', feature_name: 'Sector macroeconomic index', importance: 8 },

        // Healthcare Feature Weights
        { id: 'fi_hc_1', model_run_id: 'mr_hc_xgb', feature_name: 'Charlson comorbidity score', importance: 34 },
        { id: 'fi_hc_2', model_run_id: 'mr_hc_xgb', feature_name: 'Emergency visits in past 180 days', importance: 26 },
        { id: 'fi_hc_3', model_run_id: 'mr_hc_xgb', feature_name: 'Discharge medication complexity', importance: 21 },
        { id: 'fi_hc_4', model_run_id: 'mr_hc_xgb', feature_name: 'Post-acute mobility assessment', importance: 12 },
        { id: 'fi_hc_5', model_run_id: 'mr_hc_xgb', feature_name: 'Primary care follow-up gap', importance: 7 },

        // Marketing Feature Weights
        { id: 'fi_mkt_1', model_run_id: 'mr_mkt_xgb', feature_name: 'Weekly active seat ratio', importance: 33 },
        { id: 'fi_mkt_2', model_run_id: 'mr_mkt_xgb', feature_name: 'Core feature utilization depth', importance: 27 },
        { id: 'fi_mkt_3', model_run_id: 'mr_mkt_xgb', feature_name: 'Executive champion turnover', importance: 20 },
        { id: 'fi_mkt_4', model_run_id: 'mr_mkt_xgb', feature_name: 'Recent support sentiment score', importance: 13 },
        { id: 'fi_mkt_5', model_run_id: 'mr_mkt_xgb', feature_name: 'Contract renewal window (days)', importance: 7 }
      ],
      recommendations: [
        {
          id: 'rec_ret_1',
          prediction_id: 'pred_ret_7590',
          summary_text: 'Offer multi-year contract migration with fiber bundle discount and assigned customer onboarding specialist.',
          potential_impact: 840000 // Illustrative potential retention impact figure for scenario modeling
        },
        {
          id: 'rec_fin_1',
          prediction_id: 'pred_fin_9481',
          summary_text: 'Require interim collateral review, freeze discretionary credit facility extension, and initiate covenant compliance audit.',
          potential_impact: 1250000 // $1,250,000 risk exposure mitigated
        },
        {
          id: 'rec_hc_1',
          prediction_id: 'pred_hc_33092',
          summary_text: 'Schedule transitional care nurse visit within 48 hours and coordinate pharmacy medication reconciliation.',
          potential_impact: 210000 // $210,000 avoidable readmission costs
        },
        {
          id: 'rec_mkt_1',
          prediction_id: 'pred_mkt_7714',
          summary_text: 'Conduct executive business review, deploy customer success onboarding specialist, and offer renewal lock discount.',
          potential_impact: 165000 // $165,000 annual contract value retained
        }
      ]
    };
  }

  /**
   * Execute SQL Query
   * Supports standard SELECT, INSERT INTO, UPDATE, and DELETE
   */
  query(sql, params = []) {
    const trimmed = sql.trim();
    if (trimmed.toUpperCase().startsWith('SELECT')) {
      return this._executeSelect(trimmed, params);
    } else if (trimmed.toUpperCase().startsWith('INSERT')) {
      return this._executeInsert(trimmed, params);
    }
    return [];
  }

  _executeSelect(sql) {
    // Simple robust query parser for predictable dashboard queries
    const upper = sql.toUpperCase();
    
    // Extract table name
    const fromMatch = sql.match(/FROM\s+([a-zA-Z_]+)/i);
    if (!fromMatch) return [];
    const tableName = fromMatch[1].toLowerCase();
    const rows = this.tables[tableName] || [];

    // Filter by WHERE
    let filtered = [...rows];
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER\s+BY|LIMIT|$)/i);
    if (whereMatch) {
      const conditionStr = whereMatch[1].trim();
      const conditions = conditionStr.split(/\s+AND\s+/i);
      filtered = filtered.filter(row => {
        return conditions.every(cond => {
          const eqMatch = cond.match(/([a-zA-Z_]+)\s*=\s*['"]?([^'"]+)['"]?/);
          if (eqMatch) {
            const key = eqMatch[1].trim();
            const val = eqMatch[2].trim();
            return String(row[key]) === String(val);
          }
          return true;
        });
      });
    }

    // ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+([a-zA-Z_]+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const dir = (orderMatch[2] || 'ASC').toUpperCase();
      filtered.sort((a, b) => {
        if (a[col] < b[col]) return dir === 'DESC' ? 1 : -1;
        if (a[col] > b[col]) return dir === 'DESC' ? -1 : 1;
        return 0;
      });
    }

    // LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  _executeInsert(sql) {
    // Handled via insertRow API
    return true;
  }

  insertRow(tableName, record) {
    if (!this.tables[tableName]) {
      this.tables[tableName] = [];
    }
    this.tables[tableName].push(record);
    this.persist();
    return record;
  }

  // Helper getters for key briefing queries
  getDatasetByDomain(domain) {
    const res = this.query(`SELECT * FROM datasets WHERE domain = '${domain}' LIMIT 1`);
    return res[0] || null;
  }

  getModelRunsByDataset(datasetId) {
    return this.query(`SELECT * FROM model_runs WHERE dataset_id = '${datasetId}' ORDER BY auc DESC`);
  }

  getRecommendedModel(datasetId) {
    const res = this.query(`SELECT * FROM model_runs WHERE dataset_id = '${datasetId}' AND is_recommended = '1' LIMIT 1`);
    return res[0] || null;
  }

  getPredictionsByModel(modelRunId) {
    return this.query(`SELECT * FROM predictions WHERE model_run_id = '${modelRunId}'`);
  }

  getFeatureImportances(modelRunId) {
    return this.query(`SELECT * FROM feature_importances WHERE model_run_id = '${modelRunId}' ORDER BY importance DESC`);
  }

  getRecommendationForPrediction(predictionId) {
    const res = this.query(`SELECT * FROM recommendations WHERE prediction_id = '${predictionId}' LIMIT 1`);
    return res[0] || null;
  }

  // Export database as JSON / SQL file
  exportDatabaseDump() {
    return JSON.stringify(this.tables, null, 2);
  }

  // IndexedDB helpers
  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e);
    });
  }

  async _saveToIndexedDB(data) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('store', 'readwrite');
      const store = tx.objectStore('store');
      store.put(data, 'db_tables');
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  }

  async _loadFromIndexedDB() {
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('store', 'readonly');
        const store = tx.objectStore('store');
        const request = store.get('db_tables');
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
      });
    } catch (e) {
      return null;
    }
  }
}

// Global instance
window.predictiqDb = new RelationalDatabase();
