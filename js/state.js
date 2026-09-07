/**
 * PredictIQ Application State & Domain Configuration
 */

const DOMAIN_DEFINITIONS = {
  retail: {
    id: 'retail',
    name: 'Retail & Telco Services',
    datasetName: 'telco_customer_churn.csv',
    targetConcept: 'Customer subscription churn',
    primaryMetricLabel: 'Churn Risk',
    exposureLabel: 'Illustrative Revenue at Risk',
    recordLabel: 'Customer ID',
    primaryImpactVal: 840000,
    impactDisplay: '$840,000',
    primaryProbability: '82.4%',
    primaryConfidence: '88.5%', // Distance-from-boundary heuristic
    primaryRecord: 'Customer #7590-VHVEG',
    explanationText: 'Customer is on a month-to-month contract with 1 month tenure and high fiber optic charges, representing the archetype highest-risk churn cohort.',
    memoFinding: 'Customer churn is heavily concentrated in month-to-month contracts during the initial 6 months of customer tenure. Logistic Regression achieves 83.9% AUC on this dataset.',
    memoAction: 'Deploy term-contract migration incentives and priority onboarding support to secure accounts past the critical 6-month threshold.',
    sampleColumns: ['customerID', 'tenure', 'MonthlyCharges', 'TotalCharges', 'Contract', 'InternetService', 'Churn'],
    simulatorParams: [
      { id: 'tenure', label: 'Customer tenure', min: 1, max: 72, step: 1, default: 2, unit: ' mo' },
      { id: 'monthly_charges', label: 'Monthly charges', min: 18, max: 120, step: 2, default: 85, unit: '$' },
      { id: 'contract_months', label: 'Contract commitment', min: 1, max: 24, step: 1, default: 1, unit: ' mo' },
      { id: 'support_addons', label: 'Tech support & security add-ons', min: 0, max: 4, step: 1, default: 0, unit: '' }
    ]
  },
  finance: {
    id: 'finance',
    name: 'Commercial Credit & Banking',
    datasetName: 'commercial_credit_portfolio_2026.parquet',
    targetConcept: 'Commercial loan delinquency',
    primaryMetricLabel: 'Default Probability',
    exposureLabel: 'Credit Exposure at Risk',
    recordLabel: 'Facility ID',
    primaryImpactVal: 1250000,
    impactDisplay: '$1,250,000',
    primaryProbability: '82.6%',
    primaryConfidence: '96.1%',
    primaryRecord: 'Facility #CORP-9481',
    explanationText: 'Operating cash flow coverage has dropped below 1.1x debt service requirements with working capital deterioration.',
    memoFinding: 'Delinquency probability has risen by 18% in mid-market manufacturing facilities experiencing prolonged working capital cycles.',
    memoAction: 'Place facility on credit risk watchlist, freeze discretionary draw lines, and initiate interim covenant review.',
    sampleColumns: ['facility_id', 'debt_service_ratio', 'quick_liquidity', 'ebitda_margin', 'days_sales_outstanding', 'default_label'],
    simulatorParams: [
      { id: 'monthly_spend', label: 'Debt service coverage', min: 0.5, max: 3.5, step: 0.1, default: 0.95, unit: 'x' },
      { id: 'engagement', label: 'Quick liquidity ratio', min: 0.2, max: 2.5, step: 0.05, default: 0.72, unit: 'x' },
      { id: 'tickets', label: 'Days payment delay', min: 0, max: 90, step: 5, default: 42, unit: ' days' },
      { id: 'tenure', label: 'Relationship duration', min: 1, max: 120, step: 6, default: 24, unit: ' mo' }
    ]
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare & Clinical Care',
    datasetName: 'inpatient_discharge_cohort_q2.csv',
    targetConcept: '30-day inpatient readmission',
    primaryMetricLabel: 'Readmission Risk',
    exposureLabel: 'Avoidable Clinical Cost',
    recordLabel: 'Patient Cohort ID',
    primaryImpactVal: 210000,
    impactDisplay: '$210,000',
    primaryProbability: '79.2%',
    primaryConfidence: '92.4%',
    primaryRecord: 'Patient #HC-33092',
    explanationText: 'High comorbidity burden combined with polypharmacy and lack of scheduled post-discharge primary care follow-up.',
    memoFinding: 'Unplanned readmission probability peaks between post-discharge days 8 and 16 for patients with multiple chronic diagnoses.',
    memoAction: 'Dispatch transitional care nurse coordinator within 48 hours and conduct automated medication reconciliation.',
    sampleColumns: ['patient_id', 'charlson_index', 'prior_er_visits', 'medication_count', 'length_of_stay', 'readmit_label'],
    simulatorParams: [
      { id: 'monthly_spend', label: 'Charlson comorbidity index', min: 0, max: 10, step: 1, default: 5, unit: ' pts' },
      { id: 'engagement', label: 'Medication adherence index', min: 0, max: 100, step: 5, default: 45, unit: '%' },
      { id: 'tickets', label: 'Prior emergency admissions', min: 0, max: 6, step: 1, default: 3, unit: '' },
      { id: 'tenure', label: 'Days since discharge', min: 1, max: 30, step: 1, default: 5, unit: ' d' }
    ]
  },
  marketing: {
    id: 'marketing',
    name: 'B2B SaaS & Growth',
    datasetName: 'b2b_saas_lead_behavior_aug.csv',
    targetConcept: 'Annual contract subscription renewal attrition',
    primaryMetricLabel: 'Attrition Probability',
    exposureLabel: 'Contract Value at Risk',
    recordLabel: 'Enterprise Account',
    primaryImpactVal: 165000,
    impactDisplay: '$165,000',
    primaryProbability: '84.1%',
    primaryConfidence: '93.5%',
    primaryRecord: 'Account #MKT-7714',
    explanationText: 'Weekly active seat adoption declined 35% following executive sponsor transition and low feature telemetry.',
    memoFinding: 'Subscription non-renewal concentration is heavily tied to account sponsor turnover 90 days before renewal dates.',
    memoAction: 'Execute urgent executive business review, offer tailored workflow retraining, and secure new department stakeholder alignment.',
    sampleColumns: ['account_id', 'active_seat_ratio', 'feature_adoption_pct', 'support_sentiment', 'contract_arr', 'attrition_label'],
    simulatorParams: [
      { id: 'monthly_spend', label: 'Active seat utilization', min: 10, max: 100, step: 5, default: 32, unit: '%' },
      { id: 'engagement', label: 'Feature depth usage', min: 0, max: 100, step: 5, default: 25, unit: '%' },
      { id: 'tickets', label: 'Critical escalation count', min: 0, max: 6, step: 1, default: 2, unit: '' },
      { id: 'tenure', label: 'Months to renewal', min: 1, max: 12, step: 1, default: 3, unit: ' mo' }
    ]
  }
};

class AppStateManager {
  constructor() {
    this.currentDomain = 'retail';
    this.currentView = 'overview';
    this.selectedModelId = null;
    this.selectedRecordId = null;
    this.riskFilter = 'all'; // all | high | medium | low
    this.mode = 'demo'; // 'demo' | 'live'
    this.liveDataset = null;
    this.liveBenchmark = null;
    this.subscribers = [];
  }

  setMode(mode) {
    this.mode = mode;
    this.notify();
  }

  setLiveResults(dataset, benchmark) {
    this.liveDataset = dataset;
    this.liveBenchmark = benchmark;
    this.mode = 'live';
    this.notify();
  }

  resetToDemo() {
    this.mode = 'demo';
    this.liveDataset = null;
    this.liveBenchmark = null;
    this.notify();
  }

  getDomainConfig() {
    return DOMAIN_DEFINITIONS[this.currentDomain];
  }

  setDomain(domainKey) {
    if (DOMAIN_DEFINITIONS[domainKey]) {
      this.currentDomain = domainKey;
      this.selectedModelId = null;
      this.selectedRecordId = null;
      this.notify();
    }
  }

  setView(viewName) {
    this.currentView = viewName;
    if (typeof window !== 'undefined' && window.switchView) {
      window.switchView(viewName);
    }
    this.notify();
  }

  setRiskFilter(filter) {
    this.riskFilter = filter;
    this.notify();
  }

  setSelectedRecord(recordId) {
    this.selectedRecordId = recordId;
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notify() {
    this.subscribers.forEach(cb => cb(this));
  }
}

window.predictiqState = new AppStateManager();
