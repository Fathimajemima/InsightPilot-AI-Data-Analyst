import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  Layers, 
  Database, 
  ChevronDown, 
  UploadCloud, 
  Table2, 
  FileSpreadsheet,
  FileCode,
  FileText,
  FileCheck,
  BarChart3,
  Bot,
  Code2
} from 'lucide-react';
import type { Dataset } from '../types/data';
import { SAMPLE_DATASETS, SampleDatasetPreset } from '../data/sampleDatasets';

interface HeaderProps {
  currentDataset: Dataset | null;
  activeTab: 'dashboard' | 'report' | 'cleaning' | 'agent' | 'sql';
  onTabChange: (tab: 'dashboard' | 'report' | 'cleaning' | 'agent' | 'sql') => void;
  onSelectSample: (sample: SampleDatasetPreset) => void;
  onOpenFormatGuide: () => void;
  onOpenSheetSelector?: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDataset,
  activeTab,
  onTabChange,
  onSelectSample,
  onOpenFormatGuide,
  onOpenSheetSelector,
  onReset,
}) => {
  const [showSamplesDropdown, setShowSamplesDropdown] = useState(false);

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case 'csv':
      case 'xlsx':
      case 'xls':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'json':
      case 'parquet':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'xml':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'pdf':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'docx':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  InsightPilot <span className="text-blue-600">AI</span>
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                  Data Analyst
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block">
                Automated EDA • Business Reports • Visual Charts • Natural Language Q&A
              </p>
            </div>
          </div>

          {/* Navigation View Switcher (Dashboard vs Business Report vs Data Cleaning) */}
          {currentDataset && (
            <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                onClick={() => onTabChange('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onTabChange('report')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Business Report</span>
                <span className="sm:hidden">Report</span>
                <span className="hidden md:inline px-1.5 py-0.2 bg-blue-500 text-white text-[9px] rounded-full uppercase">
                  PDF
                </span>
              </button>

              <button
                onClick={() => onTabChange('cleaning')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'cleaning'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Data Cleaning</span>
                <span className="sm:hidden">Clean</span>
                {(currentDataset.totalMissingCells > 0 || currentDataset.duplicateRowCount > 0) && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                    activeTab === 'cleaning' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentDataset.totalMissingCells + currentDataset.duplicateRowCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onTabChange('agent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'agent'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI Analyst Agent</span>
                <span className="sm:hidden">Agent</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  activeTab === 'agent' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
                }`}>
                  Auto
                </span>
              </button>

              <button
                onClick={() => onTabChange('sql')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'sql'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI SQL</span>
                <span className="sm:hidden">SQL</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  activeTab === 'sql' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-800'
                }`}>
                  Safe
                </span>
              </button>
            </div>
          )}

          {/* Active Dataset Indicator (if loaded) */}
          {currentDataset && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${getFormatBadgeColor(currentDataset.metadata.format)}`}>
                {currentDataset.metadata.format}
              </span>
              <span className="text-xs font-semibold text-slate-800 max-w-[150px] truncate" title={currentDataset.metadata.name}>
                {currentDataset.metadata.name}
              </span>

              {currentDataset.metadata.activeSheetName && (
                <button
                  onClick={onOpenSheetSelector}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                  title="Switch Sheet"
                >
                  <Table2 className="w-3 h-3" />
                  <span>{currentDataset.metadata.activeSheetName}</span>
                </button>
              )}
            </div>
          )}

          {/* Action Navigation */}
          <div className="flex items-center gap-2">
            {/* Sample Datasets Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSamplesDropdown(!showSamplesDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all border border-slate-200 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Sample Datasets</span>
                <span className="sm:hidden">Samples</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSamplesDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showSamplesDropdown && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowSamplesDropdown(false)}
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Instant 1-Click Datasets
                  </div>
                  {SAMPLE_DATASETS.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => {
                        onSelectSample(sample);
                        setShowSamplesDropdown(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mt-0.5">
                        {sample.format === 'csv' ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : sample.format === 'json' ? (
                          <FileCode className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                            {sample.title}
                          </p>
                          <span className="text-[10px] font-mono uppercase px-1 py-0.2 bg-slate-100 text-slate-500 rounded">
                            {sample.format}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{sample.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Supported Formats Info */}
            <button
              onClick={onOpenFormatGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 cursor-pointer"
              title="View 10 Supported File Formats"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">10 Formats</span>
              <span className="md:hidden">Formats</span>
            </button>

            {/* Clear / Upload New */}
            {currentDataset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
                title="Upload another file"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New File</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
