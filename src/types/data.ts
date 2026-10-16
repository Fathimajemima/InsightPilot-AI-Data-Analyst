/**
 * Core data types for InsightPilot AI
 */

export type SupportedFormat = 
  | 'csv' 
  | 'xlsx' 
  | 'xls' 
  | 'json' 
  | 'tsv' 
  | 'txt' 
  | 'parquet' 
  | 'xml' 
  | 'pdf' 
  | 'docx' 
  | 'zip';

export interface FileMetadata {
  name: string;
  size: number;
  format: SupportedFormat;
  mimeType: string;
  extractedFromArchive?: string;
  activeSheetName?: string;
  sheetNames?: string[];
  extractionNotice?: string;
}

export type ColumnType = 'number' | 'string' | 'date' | 'boolean';

export interface NumericStats {
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  q1: number;
  q3: number;
}

export interface CategoryValueCount {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoryStats {
  uniqueCount: number;
  topValues: CategoryValueCount[];
  mode: string;
  modeCount: number;
}

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  numericStats?: NumericStats;
  categoryStats?: CategoryStats;
  sampleValues: (string | number | boolean | null)[];
}

export interface Dataset {
  metadata: FileMetadata;
  rowCount: number;
  columnCount: number;
  columns: ColumnMeta[];
  data: Record<string, any>[];
  totalMissingCells: number;
  missingCellsPercentage: number;
  duplicateRowCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
}

export interface BusinessInsight {
  id: string;
  category: 'overview' | 'pareto' | 'driver' | 'outlier' | 'quality' | 'action';
  title: string;
  description: string;
  metricBadge?: string;
  severity: 'positive' | 'warning' | 'info' | 'critical';
  impact?: string;
}

export interface EvidenceTable {
  headers: string[];
  rows: (string | number)[][];
}

export interface InlineChartData {
  type: 'bar' | 'line' | 'comparison';
  title?: string;
  labels: string[];
  values: number[];
  seriesName?: string;
}

export interface QueryAnalysisResult {
  directAnswer: string;
  columnsUsed: string[];
  rowsEvaluated: number;
  evidenceTable?: EvidenceTable;
  inlineChart?: InlineChartData;
  businessInterpretation: string;
  actionableRecommendation: string;
  missingColumnNotice?: string;
  dataPoints?: { label: string; value: string | number }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  question: string;
  answer: string;
  analysis?: QueryAnalysisResult;
  dataPoints?: { label: string; value: string | number }[];
  isAiEnhanced?: boolean;
}

export interface ZipEntryItem {
  name: string;
  size: number;
  detectedFormat: SupportedFormat | 'unsupported';
  isSupported: boolean;
}

export interface ExcelWorkbookInfo {
  file: File;
  sheetNames: string[];
  workbook: any;
}

export interface ReportKPI {
  title: string;
  value: string;
  rawValue?: number;
  formula: string;
  status: 'available' | 'missing';
  missingReason?: string;
  benchmark?: string;
}

export interface ReportPerformer {
  name: string;
  value: string;
  share: string;
  orders: number;
}

export interface ReportPerformanceBreakdown {
  dimensionName: string;
  metricName: string;
  topPerformers: ReportPerformer[];
  underPerformers: ReportPerformer[];
}

export interface ReportTrendData {
  hasDate: boolean;
  dateColumn?: string;
  metricColumn?: string;
  periodsCount: number;
  peakPeriod?: { label: string; value: string };
  lowestPeriod?: { label: string; value: string };
  overallTrajectory: 'growth' | 'decline' | 'stable';
  momGrowthAverage?: string;
  summaryText: string;
  chartPoints: { label: string; value: number }[];
  missingNotice?: string;
}

export interface ReportDataQuality {
  completenessScore: number;
  totalRows: number;
  totalColumns: number;
  missingCellsCount: number;
  duplicateRowCount: number;
  outliersCount: number;
  flaggedColumns: { name: string; missingRate: number; type: string }[];
  auditVerdict: string;
}

export interface ReportBusinessRisk {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  explanation: string;
}

export interface ReportRecommendation {
  id: string;
  priority: 'P1 - Immediate' | 'P2 - Tactical' | 'P3 - Strategic';
  action: string;
  dataJustification: string;
  expectedImpact: string;
  confidence: 'High (Direct Math)' | 'Medium (Inferred)';
}

export interface BusinessReportData {
  datasetName: string;
  format: string;
  generatedAt: string;
  rowCount: number;
  columnCount: number;
  executiveSummary: {
    headline: string;
    narrative: string[];
    takeaways: string[];
  };
  kpis: ReportKPI[];
  performance: ReportPerformanceBreakdown | null;
  trend: ReportTrendData;
  quality: ReportDataQuality;
  risks: ReportBusinessRisk[];
  recommendations: ReportRecommendation[];
  exportableTables: {
    id: string;
    title: string;
    headers: string[];
    rows: (string | number)[][];
  }[];
}

export interface MissingValuePlan {
  column: string;
  missingCount: number;
  missingPercentage: number;
  type: ColumnType;
  suggestedAction: 'median' | 'mode' | 'drop_rows' | 'constant';
  suggestedValue: any;
  chosenAction: 'keep' | 'median' | 'mode' | 'drop_rows' | 'constant';
  customConstant?: string;
}

export interface InconsistencyItem {
  column: string;
  type: 'whitespace' | 'casing' | 'date_format';
  affectedCount: number;
  description: string;
  examples: { before: string; after: string }[];
  apply: boolean;
}

export interface OutlierItem {
  column: string;
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  outlierCount: number;
  sampleRows: { rowIdx: number; value: number; isHigh: boolean }[];
  strategy: 'keep' | 'winsorize' | 'drop';
}

export interface TypeValidationItem {
  column: string;
  currentType: ColumnType;
  suggestedType: ColumnType;
  parseableCount: number;
  unparseableCount: number;
  sampleUnparseable: any[];
  apply: boolean;
}

export interface CleaningAudit {
  missingPlans: MissingValuePlan[];
  duplicateCount: number;
  duplicateRows: Record<string, any>[];
  inconsistencies: InconsistencyItem[];
  outliers: OutlierItem[];
  typeMismatches: TypeValidationItem[];
}
