/**
 * Type definitions for AI Data Analyst Agent in InsightPilot AI
 */

import type { ColumnType, EvidenceTable } from './data';

export type SemanticRole = 
  | 'identifier' 
  | 'metric' 
  | 'dimension' 
  | 'temporal' 
  | 'boolean' 
  | 'text';

export interface ColumnSemantics {
  name: string;
  type: ColumnType;
  semanticRole: SemanticRole;
  businessMeaning: string;
  sampleValues: (string | number)[];
  completeness: number; // percentage e.g. 98.5
  distinctCount: number;
}

export interface DatasetUnderstanding {
  likelyDomain: string;
  likelyPurpose: string;
  keyLimitations: string[];
  columnSemantics: ColumnSemantics[];
  identifierColumns: string[];
  metricColumns: string[];
  dimensionColumns: string[];
  dateColumns: string[];
}

export type TaskCategory = 
  | 'descriptive_kpis' 
  | 'segment_breakdown' 
  | 'temporal_trend' 
  | 'risk_outliers' 
  | 'correlation_efficiency';

export interface AnalysisPlanTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  columnsRequired: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  enabled: boolean;
  explanation: string;
}

export interface AnalysisPlan {
  title: string;
  objective: string;
  tasks: AnalysisPlanTask[];
  generatedAt: string;
}

export interface AgentChartData {
  type: 'bar' | 'line' | 'donut' | 'scatter';
  title: string;
  labels: string[];
  values: number[];
  secondaryValues?: number[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  unit?: string;
}

export interface AgentFinding {
  id: string;
  taskId: string;
  category: TaskCategory;
  title: string;
  headline: string;
  summary: string;
  columnsUsed: string[];
  supportingNumbers: {
    label: string;
    value: string | number;
    sublabel?: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  evidenceTable?: EvidenceTable;
  chartData?: AgentChartData;
  whyItMatters: string;
  recommendation: string;
  confidence: 'High (Direct Math)' | 'Medium (Statistical Inferred)';
}

export interface AgentExecutionState {
  currentStage: 'understanding' | 'planning' | 'executing' | 'findings' | 'recommendations';
  isAnalyzing: boolean;
  progress: number; // 0 to 100
  stageStatus: {
    understanding: 'completed' | 'in_progress' | 'pending';
    planning: 'completed' | 'in_progress' | 'pending';
    executing: 'completed' | 'in_progress' | 'pending';
    findings: 'completed' | 'in_progress' | 'pending';
    recommendations: 'completed' | 'in_progress' | 'pending';
  };
  understanding: DatasetUnderstanding | null;
  plan: AnalysisPlan | null;
  findings: AgentFinding[];
  followUpQuestions: string[];
}
