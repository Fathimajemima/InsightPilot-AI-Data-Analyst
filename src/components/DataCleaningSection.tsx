import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  FileSpreadsheet, 
  RotateCcw, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Table2, 
  Search, 
  ChevronRight, 
  Check, 
  Sliders, 
  Info, 
  Zap, 
  Type, 
  Hash, 
  Calendar,
  RefreshCw,
  Copy
} from 'lucide-react';
import type { Dataset, CleaningAudit, MissingValuePlan, InconsistencyItem, OutlierItem, TypeValidationItem } from '../types/data';
import { 
  auditDatasetForCleaning, 
  executeCleaningPipeline, 
  exportCleanedDatasetToCsv, 
  exportCleanedDatasetToExcel 
} from '../utils/dataCleaner';
import { formatMetricNumber } from '../utils/dataAnalyzer';

interface DataCleaningSectionProps {
  dataset: Dataset;
  originalData: Record<string, any>[];
  onApplyCleanedToApp: (cleanedData: Record<string, any>[]) => void;
  onRevertToOriginal: () => void;
  isDataModified: boolean;
}

export const DataCleaningSection: React.FC<DataCleaningSectionProps> = ({
  dataset,
  originalData,
  onApplyCleanedToApp,
  onRevertToOriginal,
  isDataModified,
}) => {
  // Current working audit based on dataset
  const [audit, setAudit] = useState<CleaningAudit>(() => auditDatasetForCleaning(dataset));

  // Staged cleaning configurations
  const [missingPlans, setMissingPlans] = useState<MissingValuePlan[]>(() => audit.missingPlans);
  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(audit.duplicateCount > 0);
  const [inconsistencies, setInconsistencies] = useState<InconsistencyItem[]>(() => audit.inconsistencies);
  const [outliers, setOutliers] = useState<OutlierItem[]>(() => audit.outliers);
  const [typeMismatches, setTypeMismatches] = useState<TypeValidationItem[]>(() => audit.typeMismatches);

  // Staged Cleaned Data state
  const [cleanedRecords, setCleanedRecords] = useState<Record<string, any>[]>(() => dataset.data);
  const [appliedChangesLog, setAppliedChangesLog] = useState<string[]>([]);
  const [hasPreviewChanges, setHasPreviewChanges] = useState<boolean>(false);

  // Active module tab
  const [activeModule, setActiveModule] = useState<'missing' | 'duplicates' | 'inconsistencies' | 'outliers' | 'types' | 'preview'>('missing');

  // Preview table search and pagination
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 8;

  // Re-run audit if dataset changes
  React.useEffect(() => {
    const freshAudit = auditDatasetForCleaning(dataset);
    setAudit(freshAudit);
    setMissingPlans(freshAudit.missingPlans);
    setRemoveDuplicates(freshAudit.duplicateCount > 0);
    setInconsistencies(freshAudit.inconsistencies);
    setOutliers(freshAudit.outliers);
    setTypeMismatches(freshAudit.typeMismatches);
    setCleanedRecords(dataset.data);
    setHasPreviewChanges(false);
    setAppliedChangesLog([]);
  }, [dataset]);

  // Execute pipeline to generate preview of cleaned dataset
  const handleRunPipelinePreview = () => {
    const result = executeCleaningPipeline(dataset.data, {
      missingPlans,
      removeDuplicates,
      inconsistencies,
      outliers,
      typeMismatches,
    });

    setCleanedRecords(result.cleanedData);
    setAppliedChangesLog(result.appliedChangesLog);
    setHasPreviewChanges(true);
    setActiveModule('preview');
  };

  // Missing values plan modifier
  const handleUpdateMissingAction = (column: string, action: MissingValuePlan['chosenAction'], customConstant?: string) => {
    setMissingPlans((prev) =>
      prev.map((p) => (p.column === column ? { ...p, chosenAction: action, customConstant } : p))
    );
  };

  // Inconsistency toggle
  const handleToggleInconsistency = (index: number) => {
    setInconsistencies((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, apply: !item.apply } : item))
    );
  };

  // Outlier strategy modifier
  const handleUpdateOutlierStrategy = (column: string, strategy: OutlierItem['strategy']) => {
    setOutliers((prev) =>
      prev.map((o) => (o.column === column ? { ...o, strategy } : o))
    );
  };

  // Type conversion toggle
  const handleToggleTypeConversion = (index: number) => {
    setTypeMismatches((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, apply: !item.apply } : item))
    );
  };

  // Before vs After stats
  const beforeStats = useMemo(() => {
    let missingCells = 0;
    dataset.data.forEach((r) => {
      Object.values(r).forEach((v) => {
        if (v === null || v === undefined || v === '') missingCells++;
      });
    });
    return {
      rows: dataset.rowCount,
      cols: dataset.columnCount,
      missing: missingCells,
      duplicates: audit.duplicateCount,
      completeness: Math.max(0, 100 - (missingCells / (dataset.rowCount * dataset.columnCount || 1)) * 100),
    };
  }, [dataset, audit]);

  const afterStats = useMemo(() => {
    let missingCells = 0;
    const colCount = cleanedRecords.length > 0 ? Object.keys(cleanedRecords[0]).length : 0;
    cleanedRecords.forEach((r) => {
      Object.values(r).forEach((v) => {
        if (v === null || v === undefined || v === '') missingCells++;
      });
    });

    // Count duplicates in cleaned
    const seen = new Set<string>();
    let dups = 0;
    cleanedRecords.forEach((r) => {
      const key = JSON.stringify(r);
      if (seen.has(key)) dups++;
      else seen.add(key);
    });

    return {
      rows: cleanedRecords.length,
      cols: colCount,
      missing: missingCells,
      duplicates: dups,
      completeness: Math.max(0, 100 - (missingCells / (cleanedRecords.length * colCount || 1)) * 100),
    };
  }, [cleanedRecords]);

  // Cleaned preview pagination
  const filteredCleaned = useMemo(() => {
    if (!previewSearch.trim()) return cleanedRecords;
    const term = previewSearch.toLowerCase();
    return cleanedRecords.filter((r) =>
      Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(term))
    );
  }, [cleanedRecords, previewSearch]);

  const totalPreviewPages = Math.ceil(filteredCleaned.length / previewPageSize) || 1;
  const paginatedCleaned = useMemo(() => {
    const start = (previewPage - 1) * previewPageSize;
    return filteredCleaned.slice(start, start + previewPageSize);
  }, [filteredCleaned, previewPage, previewPageSize]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden p-6 sm:p-8 space-y-8">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Data Cleaning Assistant
            </span>
            {isDataModified && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                Cleaned Data Active
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Interactive Data Hygiene & Normalization
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit missing cells, deduplicate rows, standardize casing, and review outliers with zero silent modifications.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Apply to Entire App Button */}
          {hasPreviewChanges && (
            <button
              onClick={() => onApplyCleanedToApp(cleanedRecords)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Sync cleaned data across Dashboard, Charts, Q&A, and Reports"
            >
              <Check className="w-4 h-4" />
              <span>Apply to App Dashboard</span>
            </button>
          )}

          {/* Revert Button if Data Modified */}
          {isDataModified && (
            <button
              onClick={onRevertToOriginal}
              className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
              title="Revert back to the raw uploaded file"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert to Original</span>
            </button>
          )}

          {/* Run Preview / Re-check */}
          <button
            onClick={handleRunPipelinePreview}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Generate Cleaning Preview</span>
          </button>
        </div>
      </div>

      {/* 2. Before vs After Comparison KPI Bar */}
      <div className="p-5 bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span className="flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-slate-500">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Before vs. After Cleaning Impact</span>
          </span>
          {hasPreviewChanges && (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
              Preview Mode Active
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Card 1: Rows */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Total Rows</span>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-base text-slate-400 line-through">{beforeStats.rows.toLocaleString()}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-xl font-black text-slate-900">{afterStats.rows.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {afterStats.rows - beforeStats.rows !== 0
                ? `${afterStats.rows - beforeStats.rows} rows adjusted`
                : 'Zero row reduction'}
            </p>
          </div>

          {/* Card 2: Missing Cells */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Missing Values</span>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-base text-slate-400 line-through">{beforeStats.missing.toLocaleString()}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-xl font-black text-emerald-700">{afterStats.missing.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {beforeStats.missing - afterStats.missing > 0
                ? `Fixed ${beforeStats.missing - afterStats.missing} missing cells`
                : 'No missing cells modified'}
            </p>
          </div>

          {/* Card 3: Duplicates */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Duplicate Rows</span>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-base text-slate-400 line-through">{beforeStats.duplicates}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-xl font-black text-emerald-700">{afterStats.duplicates}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {beforeStats.duplicates - afterStats.duplicates > 0
                ? `Removed ${beforeStats.duplicates - afterStats.duplicates} duplicates`
                : 'No duplicates remaining'}
            </p>
          </div>

          {/* Card 4: Completeness Score */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Data Completeness</span>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-base text-slate-400 line-through">{beforeStats.completeness.toFixed(1)}%</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-xl font-black text-emerald-700">{afterStats.completeness.toFixed(1)}%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Overall hygiene score</p>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs Across the 6 Cleaning Modules */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveModule('missing')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeModule === 'missing'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Missing Values</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeModule === 'missing' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {missingPlans.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('duplicates')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeModule === 'duplicates'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Duplicate Rows</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeModule === 'duplicates' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {audit.duplicateCount}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('inconsistencies')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeModule === 'inconsistencies'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Inconsistent Data</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeModule === 'inconsistencies' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {inconsistencies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('outliers')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeModule === 'outliers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Outlier Review (IQR)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeModule === 'outliers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {outliers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('types')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeModule === 'types'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Data Type Validation</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeModule === 'types' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {typeMismatches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('preview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeModule === 'preview'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Table2 className="w-3.5 h-3.5" />
          <span>Cleaned Preview & Export</span>
        </button>
      </div>

      {/* 4. MODULE CONTENT SECTIONS */}

      {/* MODULE 1: MISSING VALUES */}
      {activeModule === 'missing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Missing Values Manager</h3>
              <p className="text-xs text-slate-500">
                Identify empty cells and select imputation or row removal on a per-column basis.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {missingPlans.length === 0 ? 'No missing values detected' : `${missingPlans.length} affected columns`}
            </span>
          </div>

          {missingPlans.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Column Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Missing Count</th>
                    <th className="p-3 text-right">Missing %</th>
                    <th className="p-3">Recommended Treatment</th>
                    <th className="p-3">Action to Apply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {missingPlans.map((plan) => (
                    <tr key={plan.column} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{plan.column}</td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 border border-slate-200 text-slate-600">
                          {plan.type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600">
                        {plan.missingCount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600">
                        {plan.missingPercentage}%
                      </td>
                      <td className="p-3 text-[11px] text-slate-600">
                        <span className="font-semibold text-blue-700 capitalize">{plan.suggestedAction}</span>
                        {plan.suggestedValue !== null && plan.suggestedValue !== undefined && (
                          <span className="text-slate-400 ml-1">({String(plan.suggestedValue)})</span>
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          value={plan.chosenAction}
                          onChange={(e) => handleUpdateMissingAction(plan.column, e.target.value as any)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="keep">Keep Missing (No Change)</option>
                          {plan.type === 'number' && (
                            <option value="median">Fill with Median ({String(plan.suggestedValue ?? 0)})</option>
                          )}
                          {plan.type !== 'number' && (
                            <option value="mode">Fill with Mode ("{String(plan.suggestedValue ?? 'Unknown')}")</option>
                          )}
                          <option value="drop_rows">Drop Rows with Missing</option>
                          <option value="constant">Fill with Custom Constant</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-950 text-sm">Clean Dataset: Zero Missing Values</h4>
              <p className="text-xs text-emerald-700">Every single row and column in this dataset is 100% complete.</p>
            </div>
          )}
        </div>
      )}

      {/* MODULE 2: DUPLICATE RECORDS */}
      {activeModule === 'duplicates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Duplicate Records Detector</h3>
              <p className="text-xs text-slate-500">
                Identify rows with identical values across all columns.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {audit.duplicateCount} duplicate row(s) found
            </span>
          </div>

          {audit.duplicateCount > 0 ? (
            <div className="p-5 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-sm">
                      Found {audit.duplicateCount} Duplicate Record(s) ({((audit.duplicateCount / dataset.rowCount) * 100).toFixed(1)}% of rows)
                    </h4>
                    <p className="text-xs text-amber-800">
                      Keeping duplicate records can inflate sums and skew average transaction statistics.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs text-xs font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={removeDuplicates}
                    onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Remove Duplicates during Cleaning</span>
                </label>
              </div>

              {/* Sample Duplicate Rows */}
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-3.5 py-2 bg-amber-100/50 border-b border-amber-200 text-[11px] font-bold text-amber-900">
                  Preview Sample Duplicate Rows:
                </div>
                <div className="overflow-x-auto max-h-48 text-xs font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 text-[10px]">
                      <tr>
                        {dataset.columns.slice(0, 5).map((c) => (
                          <th key={c.name} className="p-2 border-r border-slate-100">{c.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {audit.duplicateRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/40">
                          {dataset.columns.slice(0, 5).map((c) => (
                            <td key={c.name} className="p-2 border-r border-slate-100 truncate max-w-[150px]">
                              {String(row[c.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-950 text-sm">All Records Unique</h4>
              <p className="text-xs text-emerald-700">No duplicate rows were found in the dataset.</p>
            </div>
          )}
        </div>
      )}

      {/* MODULE 3: INCONSISTENT DATA */}
      {activeModule === 'inconsistencies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Inconsistent Data Corrector</h3>
              <p className="text-xs text-slate-500">
                Correct trailing whitespace, unify mixed capitalization, and standardize date stamps.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {inconsistencies.length} issue(s) detected
            </span>
          </div>

          {inconsistencies.length > 0 ? (
            <div className="space-y-3">
              {inconsistencies.map((inc, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">Column: {inc.column}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-blue-100 text-blue-800">
                        {inc.type.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">({inc.affectedCount} rows affected)</span>
                    </div>
                    <p className="text-xs text-slate-600">{inc.description}</p>

                    {/* Before -> After Diff Pills */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {inc.examples.map((ex, exIdx) => (
                        <div key={exIdx} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-mono shadow-2xs">
                          <span className="text-rose-600 line-through">{ex.before}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-emerald-700 font-bold">{ex.after}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-800 shrink-0">
                    <input
                      type="checkbox"
                      checked={inc.apply}
                      onChange={() => handleToggleInconsistency(idx)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Apply Correction</span>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-950 text-sm">Consistent Formatting Verified</h4>
              <p className="text-xs text-emerald-700">No trailing spaces, casing collisions, or mixed date formats found.</p>
            </div>
          )}
        </div>
      )}

      {/* MODULE 4: OUTLIER DETECTION (IQR METHOD) */}
      {activeModule === 'outliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Statistical Outlier Review (IQR Method)</h3>
              <p className="text-xs text-slate-500">
                Identify values beyond [Q1 - 1.5×IQR, Q3 + 1.5×IQR]. Outliers are not automatically errors.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {outliers.length} numerical column(s) flagged
            </span>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Important Data Science Notice:</span>
              <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                Outliers often represent legitimate enterprise deals or high-volume peaks rather than data errors. Choose whether to <strong>Keep</strong> (recommended default), <strong>Winsorize</strong> (cap to threshold), or <strong>Drop rows</strong>.
              </p>
            </div>
          </div>

          {outliers.length > 0 ? (
            <div className="space-y-4">
              {outliers.map((out) => (
                <div key={out.column} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Column: {out.column}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold font-mono">
                          {out.outlierCount} Outlier(s) Detected
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        IQR Bounds: [{out.lowerBound} to {out.upperBound}] (Q1: {out.q1}, Q3: {out.q3})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600 text-[11px] uppercase">Strategy:</span>
                      <select
                        value={out.strategy}
                        onChange={(e) => handleUpdateOutlierStrategy(out.column, e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="keep">Keep Outliers (Do Not Change)</option>
                        <option value="winsorize">Winsorize (Cap to {out.upperBound})</option>
                        <option value="drop">Drop Outlier Rows</option>
                      </select>
                    </div>
                  </div>

                  {/* Sample Outliers Table */}
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 overflow-x-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Sample Outlier Values:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      {out.sampleRows.map((s, idx) => (
                        <div key={idx} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px]">
                          <span className="text-slate-500">Row #{s.rowIdx}:</span>{' '}
                          <span className="font-bold text-rose-600">{formatMetricNumber(s.value)}</span>{' '}
                          <span className="text-[10px] text-slate-400">({s.isHigh ? 'High' : 'Low'})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-950 text-sm">No Statistical Outliers</h4>
              <p className="text-xs text-emerald-700">All numerical values fall comfortably within standard IQR intervals.</p>
            </div>
          )}
        </div>
      )}

      {/* MODULE 5: DATA TYPE VALIDATION */}
      {activeModule === 'types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Data Type Validation</h3>
              <p className="text-xs text-slate-500">
                Identify text columns containing numbers or currency symbols and standardize types.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {typeMismatches.length} conversion suggestion(s)
            </span>
          </div>

          {typeMismatches.length > 0 ? (
            <div className="space-y-3">
              {typeMismatches.map((tm, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Column: {tm.column}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {tm.currentType} → <strong className="text-blue-600 uppercase">{tm.suggestedType}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {tm.parseableCount} values can be cleanly converted to numeric numbers ({tm.unparseableCount} unparseable).
                    </p>
                    {tm.sampleUnparseable.length > 0 && (
                      <p className="text-[11px] text-amber-700 italic">
                        Unparseable examples: {tm.sampleUnparseable.join(', ')}
                      </p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-800 shrink-0">
                    <input
                      type="checkbox"
                      checked={tm.apply}
                      onChange={() => handleToggleTypeConversion(idx)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Convert to {tm.suggestedType.toUpperCase()}</span>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-emerald-950 text-sm">Column Data Types Validated</h4>
              <p className="text-xs text-emerald-700">All columns match their respective numeric, date, and text attributes.</p>
            </div>
          )}
        </div>
      )}

      {/* MODULE 6: CLEANED PREVIEW & EXPORT */}
      {activeModule === 'preview' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cleaned Dataset Preview</h3>
              <p className="text-xs text-slate-500">
                Inspect cleaned records ({cleanedRecords.length.toLocaleString()} rows) and download clean files.
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCleanedDatasetToCsv(cleanedRecords, dataset.metadata.name)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Download Clean CSV</span>
              </button>

              <button
                onClick={() => exportCleanedDatasetToExcel(cleanedRecords, dataset.metadata.name)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Clean Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Applied Actions Log */}
          {appliedChangesLog.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                Applied Cleaning Modifications ({appliedChangesLog.length}):
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                {appliedChangesLog.map((log, i) => (
                  <li key={i}>{log}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search cleaned records..."
                value={previewSearch}
                onChange={(e) => {
                  setPreviewSearch(e.target.value);
                  setPreviewPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-500">
              Showing {filteredCleaned.length.toLocaleString()} rows
            </div>
          </div>

          {/* Cleaned Records Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 sticky top-0 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-12 text-center text-slate-400">#</th>
                    {dataset.columns.map((c) => (
                      <th key={c.name} className="p-2.5 border-r border-slate-200/60 last:border-r-0 whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                  {paginatedCleaned.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-blue-50/20 transition-colors">
                      <td className="p-2.5 text-center text-slate-400 bg-slate-50/40 border-r border-slate-100">
                        {(previewPage - 1) * previewPageSize + rIdx + 1}
                      </td>
                      {dataset.columns.map((c) => {
                        const cellVal = row[c.name];
                        const isNull = cellVal === null || cellVal === undefined || cellVal === '';
                        return (
                          <td
                            key={c.name}
                            className={`p-2.5 border-r border-slate-100 last:border-r-0 truncate max-w-[200px] ${
                              isNull ? 'bg-amber-50/50 text-amber-500 italic' : ''
                            }`}
                          >
                            {isNull ? 'null' : String(cellVal)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {previewPage} of {totalPreviewPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewPage((p) => Math.max(p - 1, 1))}
                  disabled={previewPage === 1}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPreviewPage((p) => Math.min(p + 1, totalPreviewPages))}
                  disabled={previewPage >= totalPreviewPages}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
