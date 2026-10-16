import React from 'react';
import { 
  Database, 
  Columns3, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  TrendingUp, 
  BarChart3, 
  Tag, 
  Hash,
  Table2,
  FileSpreadsheet
} from 'lucide-react';
import type { Dataset } from '../types/data';
import { formatMetricNumber } from '../utils/dataAnalyzer';
import { formatFileSize } from '../utils/fileParsers';

interface SummaryMetricsProps {
  dataset: Dataset;
  onOpenSheetSelector?: () => void;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ dataset, onOpenSheetSelector }) => {
  const { rowCount, columnCount, totalMissingCells, missingCellsPercentage, duplicateRowCount, columns, metadata } = dataset;

  // Find most prominent numeric columns
  const numericCols = columns.filter((c) => c.numericStats);
  const primaryNumeric = numericCols[0];
  const secondaryNumeric = numericCols[1];

  // Find most prominent categorical column
  const catCols = columns.filter((c) => c.categoryStats);
  const primaryCat = catCols[0];

  return (
    <div className="space-y-4">
      {/* Top Source & Extraction Notice Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800">File:</span>
          <span className="font-semibold text-blue-600 truncate max-w-xs">{metadata.name}</span>
          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            {metadata.format}
          </span>
          <span className="text-slate-400">•</span>
          <span>{formatFileSize(metadata.size)}</span>

          {metadata.activeSheetName && (
            <>
              <span className="text-slate-400">•</span>
              <button
                onClick={onOpenSheetSelector}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Worksheet: {metadata.activeSheetName}</span>
                {metadata.sheetNames && metadata.sheetNames.length > 1 && (
                  <span className="text-[10px] text-emerald-600 underline ml-0.5">(change)</span>
                )}
              </button>
            </>
          )}

          {metadata.extractedFromArchive && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 font-medium">
                ZIP: {metadata.extractedFromArchive}
              </span>
            </>
          )}
        </div>

        {metadata.extractionNotice && (
          <span className="text-[11px] text-slate-500 italic">
            {metadata.extractionNotice}
          </span>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Row Count */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Rows</span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {rowCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Records in memory</p>
          </div>
        </div>

        {/* Card 2: Column Count */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Columns</span>
            <Columns3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {columnCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {numericCols.length} num • {catCols.length} cat
            </p>
          </div>
        </div>

        {/* Card 3: Missing Values */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Missing Cells</span>
            {totalMissingCells === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalMissingCells.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {totalMissingCells === 0 ? '100% complete' : `${missingCellsPercentage}% missing rate`}
            </p>
          </div>
        </div>

        {/* Card 4: Duplicate Rows */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Duplicates</span>
            <Copy className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {duplicateRowCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {duplicateRowCount === 0 ? 'All rows unique' : `${((duplicateRowCount / rowCount) * 100).toFixed(1)}% of rows`}
            </p>
          </div>
        </div>

        {/* Card 5: Primary Metric KPI */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title={primaryNumeric?.name || 'Primary Metric'}>
              {primaryNumeric ? primaryNumeric.name : 'Numeric Metric'}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight truncate">
              {primaryNumeric?.numericStats ? formatMetricNumber(primaryNumeric.numericStats.sum) : 'N/A'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {primaryNumeric?.numericStats ? `Avg: ${formatMetricNumber(primaryNumeric.numericStats.mean)}` : 'No numeric columns'}
            </p>
          </div>
        </div>

        {/* Card 6: Categorical Mode or Secondary Metric */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate" title={primaryCat?.name || secondaryNumeric?.name || 'Top Dimension'}>
              {primaryCat ? primaryCat.name : secondaryNumeric ? secondaryNumeric.name : 'Dimension'}
            </span>
            <Tag className="w-4 h-4 text-rose-500 shrink-0" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight truncate">
              {primaryCat?.categoryStats ? primaryCat.categoryStats.mode : secondaryNumeric?.numericStats ? formatMetricNumber(secondaryNumeric.numericStats.mean) : 'N/A'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {primaryCat?.categoryStats ? `${primaryCat.categoryStats.modeCount} entries (${primaryCat.categoryStats.topValues[0]?.percentage || 0}%)` : secondaryNumeric ? 'Secondary mean' : 'All unique'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
