import React from 'react';
import { 
  FileSpreadsheet, 
  FileCode, 
  FileText, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  BarChart3, 
  MessageSquare, 
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { SAMPLE_DATASETS, SampleDatasetPreset } from '../data/sampleDatasets';

interface EmptyStateProps {
  onSelectSample: (sample: SampleDatasetPreset) => void;
  onOpenFormatGuide: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectSample, onOpenFormatGuide }) => {
  return (
    <div className="space-y-8 py-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-10 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automated Business Data Intelligence</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">InsightPilot AI</span> — Your AI Data Analyst
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Upload your raw business datasets in any of the <strong>10 supported formats</strong>. InsightPilot automatically audits data health, calculates exact statistical KPIs, parses tables from documents and archives, and answers business questions in plain English.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onSelectSample(SAMPLE_DATASETS[0])}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Load E-Commerce Sales Sample</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenFormatGuide}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Explore 10 Supported Formats</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid Glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 3 Step Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Upload Any Business File</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Drop CSV, Excel (with sheet selection), JSON, TSV, structured TXT, Parquet, XML, Word docx tables, PDF reports, or ZIP archives.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Instant Statistical Profiling</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Audits missing values, duplicate records, distribution skewness, outliers, and computes true mathematical KPI metrics.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Natural Language Q&A & Insights</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ask questions in plain English to filter, aggregate, and inspect your numbers. Review evidence-based executive business insights.
          </p>
        </div>
      </div>

      {/* Preset Sample Datasets Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Try a Ready Sample Dataset</h2>
            <p className="text-xs text-slate-500">Click any card below to launch full analysis instantly</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_DATASETS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="p-5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-blue-100 transition-colors">
                    {sample.format === 'csv' ? (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    ) : sample.format === 'json' ? (
                      <FileCode className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-teal-600" />
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    {sample.format}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                  {sample.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{sample.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{sample.rowCount} rows • {sample.columnCount} cols</span>
                <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Load <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
