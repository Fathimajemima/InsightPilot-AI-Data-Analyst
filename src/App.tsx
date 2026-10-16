import React, { useState, useEffect } from 'react';
import { FileCheck, ArrowRight, Sparkles, Bot, Database } from 'lucide-react';
import { Header } from './components/Header';
import { FileDropzone } from './components/FileDropzone';
import { EmptyState } from './components/EmptyState';
import { SummaryMetrics } from './components/SummaryMetrics';
import { DataCharts } from './components/DataCharts';
import { DataPreviewTable } from './components/DataPreviewTable';
import { DatasetQASection } from './components/DatasetQASection';
import { BusinessInsightsSection } from './components/BusinessInsightsSection';
import { BusinessReportSection } from './components/BusinessReportSection';
import { DataCleaningSection } from './components/DataCleaningSection';
import { AIAnalystAgentSection } from './components/AIAnalystAgentSection';
import { AISqlAssistantSection } from './components/AISqlAssistantSection';
import { SheetSelectorModal } from './components/SheetSelectorModal';
import { ZipFileSelectorModal } from './components/ZipFileSelectorModal';
import { FormatSupportGuideModal } from './components/FormatSupportGuideModal';
import { SAMPLE_DATASETS, SampleDatasetPreset } from './data/sampleDatasets';
import { 
  detectFileFormat, 
  parseFileBuffer, 
  readExcelWorkbookInfo, 
  extractDataFromExcelSheet, 
  inspectZipArchive, 
  extractAndParseFileFromZip 
} from './utils/fileParsers';
import { analyzeDataset } from './utils/dataAnalyzer';
import type { Dataset, ZipEntryItem } from './types/data';

export default function App() {
  const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);
  const [originalData, setOriginalData] = useState<Record<string, any>[] | null>(null);
  const [isDataCleanedApplied, setIsDataCleanedApplied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'cleaning' | 'agent' | 'sql'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isFormatGuideOpen, setIsFormatGuideOpen] = useState(false);

  // Excel multi-sheet handling
  const [excelWorkbookInfo, setExcelWorkbookInfo] = useState<{
    workbook: any;
    sheetNames: string[];
    fileName: string;
    fileSize: number;
    activeSheet: string;
  } | null>(null);
  const [isSheetSelectorOpen, setIsSheetSelectorOpen] = useState(false);

  // ZIP archive handling
  const [zipInfo, setZipInfo] = useState<{
    file: File;
    entries: ZipEntryItem[];
  } | null>(null);
  const [isZipSelectorOpen, setIsZipSelectorOpen] = useState(false);

  // Process uploaded file
  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const format = detectFileFormat(file);

      if (format === 'unsupported') {
        throw new Error(
          `The file "${file.name}" has an unsupported format. Supported formats include: .csv, .xlsx, .xls, .json, .tsv, .txt, .parquet, .xml, .pdf, .docx, and .zip.`
        );
      }

      // Check max file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a file smaller than 50MB.`);
      }

      // 1. If ZIP file, inspect archive and let user choose file
      if (format === 'zip') {
        const entries = await inspectZipArchive(file);
        setZipInfo({ file, entries });
        setIsZipSelectorOpen(true);
        setIsLoading(false);
        return;
      }

      const buffer = await file.arrayBuffer();

      // 2. If Excel workbook, check sheet count
      if (format === 'xlsx' || format === 'xls') {
        const wbInfo = await readExcelWorkbookInfo(buffer, file.name);
        if (wbInfo.sheetNames.length > 1) {
          setExcelWorkbookInfo({
            workbook: wbInfo.workbook,
            sheetNames: wbInfo.sheetNames,
            fileName: file.name,
            fileSize: file.size,
            activeSheet: wbInfo.sheetNames[0],
          });
          // Also parse first sheet by default
          const parsed = extractDataFromExcelSheet(wbInfo.workbook, wbInfo.sheetNames[0], file.name, file.size);
          const analyzed = analyzeDataset(parsed.data, parsed.metadata);
          setCurrentDataset(analyzed);
          setOriginalData(parsed.data);
          setIsDataCleanedApplied(false);
          setIsLoading(false);
          return;
        }
      }

      // 3. Standard file parsing
      const parsed = await parseFileBuffer(buffer, file.name, format, file.size);
      const analyzed = analyzeDataset(parsed.data, parsed.metadata);
      setCurrentDataset(analyzed);
      setOriginalData(parsed.data);
      setIsDataCleanedApplied(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while parsing the file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Excel sheet
  const handleSelectExcelSheet = (sheetName: string) => {
    if (!excelWorkbookInfo) return;

    try {
      setIsLoading(true);
      const parsed = extractDataFromExcelSheet(
        excelWorkbookInfo.workbook,
        sheetName,
        excelWorkbookInfo.fileName,
        excelWorkbookInfo.fileSize
      );
      const analyzed = analyzeDataset(parsed.data, parsed.metadata);
      setCurrentDataset(analyzed);
      setOriginalData(parsed.data);
      setIsDataCleanedApplied(false);
      setExcelWorkbookInfo((prev) => (prev ? { ...prev, activeSheet: sheetName } : null));
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to read sheet "${sheetName}".`);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract and analyze file from ZIP
  const handleSelectZipEntry = async (relativePath: string) => {
    if (!zipInfo) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const parsed = await extractAndParseFileFromZip(zipInfo.file, relativePath);
      const analyzed = analyzeDataset(parsed.data, parsed.metadata);
      setCurrentDataset(analyzed);
      setOriginalData(parsed.data);
      setIsDataCleanedApplied(false);
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to extract and read "${relativePath}" from ZIP.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply cleaned dataset back to active working dataset across the entire app
  const handleApplyCleanedToApp = (cleanedData: Record<string, any>[]) => {
    if (!currentDataset) return;
    if (!originalData) {
      setOriginalData(currentDataset.data);
    }
    const analyzed = analyzeDataset(cleanedData, { ...currentDataset.metadata });
    setCurrentDataset(analyzed);
    setIsDataCleanedApplied(true);
  };

  // Revert back to the original raw uploaded dataset
  const handleRevertToOriginal = () => {
    if (!currentDataset || !originalData) return;
    const analyzed = analyzeDataset(originalData, { ...currentDataset.metadata });
    setCurrentDataset(analyzed);
    setIsDataCleanedApplied(false);
  };

  // Load sample dataset preset
  const handleSelectSample = (sample: SampleDatasetPreset) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const blob = new Blob([sample.content], {
        type: sample.format === 'json' ? 'application/json' : sample.format === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
      });
      const file = new File([blob], sample.fileName);
      handleProcessFile(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample dataset.');
      setIsLoading(false);
    }
  };

  // Reset to empty state
  const handleReset = () => {
    setCurrentDataset(null);
    setOriginalData(null);
    setIsDataCleanedApplied(false);
    setExcelWorkbookInfo(null);
    setZipInfo(null);
    setErrorMessage(null);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Application Bar */}
      <Header
        currentDataset={currentDataset}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectSample={handleSelectSample}
        onOpenFormatGuide={() => setIsFormatGuideOpen(true)}
        onOpenSheetSelector={
          excelWorkbookInfo && excelWorkbookInfo.sheetNames.length > 1
            ? () => setIsSheetSelectorOpen(true)
            : undefined
        }
        onReset={handleReset}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Upload Zone (Always accessible or collapsible) */}
        <FileDropzone
          onFileSelected={handleProcessFile}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          onSelectSamplePreset={(id) => {
            const found = SAMPLE_DATASETS.find((s) => s.id === id);
            if (found) handleSelectSample(found);
          }}
        />

        {/* If no dataset is active: show friendly Empty State */}
        {!currentDataset ? (
          <EmptyState
            onSelectSample={handleSelectSample}
            onOpenFormatGuide={() => setIsFormatGuideOpen(true)}
          />
        ) : activeTab === 'report' ? (
          /* Dedicated Report View */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Navigation back to Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs print:hidden shadow-2xs">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-900">Executive Business Report View</span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-600 hidden sm:inline">Download as high-fidelity PDF or export analysis tables as CSV</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('sql')}
                  className="font-bold text-cyan-700 hover:text-cyan-900 cursor-pointer"
                >
                  AI SQL →
                </button>
                <button
                  onClick={() => setActiveTab('agent')}
                  className="font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                >
                  AI Analyst Agent →
                </button>
                <button
                  onClick={() => setActiveTab('cleaning')}
                  className="font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  Data Cleaning →
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer text-left sm:text-right"
                >
                  ← Dashboard
                </button>
              </div>
            </div>

            {/* Business Report Section */}
            <section aria-labelledby="report-heading">
              <h2 id="report-heading" className="sr-only">Automated Business Report</h2>
              <BusinessReportSection dataset={currentDataset} />
            </section>
          </div>
        ) : activeTab === 'cleaning' ? (
          /* Dedicated Data Cleaning View */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Navigation back to Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs print:hidden shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-slate-900">Data Cleaning Assistant Active</span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-600 hidden sm:inline">
                  Missing values, duplicate detection, string normalization, IQR outlier analysis, and type validation
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('sql')}
                  className="font-bold text-cyan-700 hover:text-cyan-900 cursor-pointer"
                >
                  AI SQL →
                </button>
                <button
                  onClick={() => setActiveTab('agent')}
                  className="font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                >
                  AI Analyst Agent →
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className="font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  Business Report →
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer text-left sm:text-right"
                >
                  ← Dashboard
                </button>
              </div>
            </div>

            {/* Data Cleaning Section */}
            <section aria-labelledby="cleaning-heading">
              <h2 id="cleaning-heading" className="sr-only">Data Cleaning Assistant</h2>
              <DataCleaningSection
                dataset={currentDataset}
                originalData={originalData || currentDataset.data}
                onApplyCleanedToApp={handleApplyCleanedToApp}
                onRevertToOriginal={handleRevertToOriginal}
                isDataModified={isDataCleanedApplied}
              />
            </section>
          </div>
        ) : activeTab === 'agent' ? (
          /* Dedicated AI Analyst Agent View */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Navigation back to Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs print:hidden shadow-2xs">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-bold text-slate-900">AI Data Analyst Agent Active</span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-600 hidden sm:inline">
                  Dataset Understanding → Analysis Plan → Verified Calculations → Findings → Recommendations
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('sql')}
                  className="font-bold text-cyan-700 hover:text-cyan-900 cursor-pointer"
                >
                  AI SQL →
                </button>
                <button
                  onClick={() => setActiveTab('cleaning')}
                  className="font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  Data Cleaning →
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className="font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  Business Report →
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer text-left sm:text-right"
                >
                  ← Dashboard
                </button>
              </div>
            </div>

            {/* AI Analyst Agent Section */}
            <section aria-labelledby="agent-heading">
              <h2 id="agent-heading" className="sr-only">AI Data Analyst Agent</h2>
              <AIAnalystAgentSection
                dataset={currentDataset}
                onAskFollowUpQuestion={(q) => {
                  setActiveTab('dashboard');
                }}
              />
            </section>
          </div>
        ) : activeTab === 'sql' ? (
          /* Dedicated AI SQL Assistant View */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Navigation back to Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-2xl text-xs print:hidden shadow-2xs">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-600 shrink-0" />
                <span className="font-bold text-slate-900">AI SQL Assistant Active</span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-600 hidden sm:inline">
                  Natural Language to SQL • In-Memory Execution • Beginner Learning Mode
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('agent')}
                  className="font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                >
                  AI Analyst Agent →
                </button>
                <button
                  onClick={() => setActiveTab('cleaning')}
                  className="font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                >
                  Data Cleaning →
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className="font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                >
                  Business Report →
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="font-bold text-cyan-700 hover:text-cyan-900 underline cursor-pointer text-left sm:text-right"
                >
                  ← Dashboard
                </button>
              </div>
            </div>

            {/* AI SQL Assistant Section */}
            <section aria-labelledby="sql-heading">
              <h2 id="sql-heading" className="sr-only">AI SQL Assistant</h2>
              <AISqlAssistantSection dataset={currentDataset} />
            </section>
          </div>
        ) : (
          /* Active Dataset Dashboard View */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quad Action Feature Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:hidden">
              {/* 1. AI Data Analyst Agent Banner */}
              <div className="p-3.5 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white rounded-2xl flex items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold truncate">AI Analyst Agent</h3>
                    <p className="text-[10px] text-purple-100 mt-0.5 line-clamp-1">
                      Automated 5-stage workflow.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('agent')}
                  className="px-2.5 py-1 bg-white text-purple-700 hover:bg-purple-50 font-bold text-[11px] rounded-lg transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 2. AI SQL Assistant Banner */}
              <div className="p-3.5 bg-gradient-to-r from-cyan-700 via-cyan-600 to-blue-700 text-white rounded-2xl flex items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold truncate">AI SQL Assistant</h3>
                    <p className="text-[10px] text-cyan-100 mt-0.5 line-clamp-1">
                      Natural language to SQL & learning.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('sql')}
                  className="px-2.5 py-1 bg-white text-cyan-700 hover:bg-cyan-50 font-bold text-[11px] rounded-lg transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span>SQL</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 3. Data Cleaning Assistant Banner */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white rounded-2xl flex items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold truncate">Data Cleaning</h3>
                    <p className="text-[10px] text-indigo-100 mt-0.5 line-clamp-1">
                      Audit missing cells & outliers.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('cleaning')}
                  className="px-2.5 py-1 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-[11px] rounded-lg transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span>Clean</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 4. Business Report Generator Banner */}
              <div className="p-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <FileCheck className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold truncate">Business Report</h3>
                    <p className="text-[10px] text-blue-100 mt-0.5 line-clamp-1">
                      Executive briefing & PDF export.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('report')}
                  className="px-2.5 py-1 bg-white text-blue-700 hover:bg-blue-50 font-bold text-[11px] rounded-lg transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span>Report</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 1. Summary Metrics & KPI Cards */}
            <section aria-labelledby="kpi-heading">
              <h2 id="kpi-heading" className="sr-only">Summary Statistics & KPIs</h2>
              <SummaryMetrics
                dataset={currentDataset}
                onOpenSheetSelector={
                  excelWorkbookInfo && excelWorkbookInfo.sheetNames.length > 1
                    ? () => setIsSheetSelectorOpen(true)
                    : undefined
                }
              />
            </section>

            {/* 2. Visual Charts (9 Interactive Types & Auto-Recommender) */}
            <section aria-labelledby="charts-heading">
              <h2 id="charts-heading" className="sr-only">Visual Charts</h2>
              <DataCharts dataset={currentDataset} />
            </section>

            {/* 3. AI Data Analyst Agent Section (Integrated in Dashboard Flow) */}
            <section aria-labelledby="dashboard-agent-heading">
              <h2 id="dashboard-agent-heading" className="sr-only">AI Data Analyst Agent</h2>
              <AIAnalystAgentSection
                dataset={currentDataset}
                onAskFollowUpQuestion={(q) => {
                  // Keep user in dashboard to review
                }}
              />
            </section>

            {/* 4. AI SQL Assistant Section (Integrated in Dashboard Flow) */}
            <section aria-labelledby="dashboard-sql-heading">
              <h2 id="dashboard-sql-heading" className="sr-only">AI SQL Assistant</h2>
              <AISqlAssistantSection dataset={currentDataset} />
            </section>

            {/* 5. Evidence-Based Business Insights */}
            <section aria-labelledby="insights-heading">
              <h2 id="insights-heading" className="sr-only">Business Insights</h2>
              <BusinessInsightsSection dataset={currentDataset} />
            </section>

            {/* 6. Natural Language Dataset Q&A */}
            <section aria-labelledby="qa-heading">
              <h2 id="qa-heading" className="sr-only">Dataset Q&A</h2>
              <DatasetQASection dataset={currentDataset} />
            </section>

            {/* 7. Data Cleaning Assistant Section */}
            <section aria-labelledby="dashboard-cleaning-heading">
              <h2 id="dashboard-cleaning-heading" className="sr-only">Data Cleaning Assistant</h2>
              <DataCleaningSection
                dataset={currentDataset}
                originalData={originalData || currentDataset.data}
                onApplyCleanedToApp={handleApplyCleanedToApp}
                onRevertToOriginal={handleRevertToOriginal}
                isDataModified={isDataCleanedApplied}
              />
            </section>

            {/* 8. Business Report Section */}
            <section aria-labelledby="dashboard-report-heading">
              <h2 id="dashboard-report-heading" className="sr-only">Automated Business Report</h2>
              <BusinessReportSection dataset={currentDataset} />
            </section>

            {/* 9. Data Preview Table */}
            <section aria-labelledby="preview-heading">
              <h2 id="preview-heading" className="sr-only">Data Preview</h2>
              <DataPreviewTable dataset={currentDataset} />
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">InsightPilot AI</span>
            <span>—</span>
            <span>Your AI Data Analyst Portfolio Edition</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Supports 10 Business Formats</span>
            <span>•</span>
            <span>Zero Fabrication Guarantee</span>
            <span>•</span>
            <button
              onClick={() => setIsFormatGuideOpen(true)}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Format Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Excel Sheet Selector Modal */}
      {excelWorkbookInfo && (
        <SheetSelectorModal
          isOpen={isSheetSelectorOpen}
          fileName={excelWorkbookInfo.fileName}
          sheetNames={excelWorkbookInfo.sheetNames}
          activeSheet={excelWorkbookInfo.activeSheet}
          onSelectSheet={handleSelectExcelSheet}
          onClose={() => setIsSheetSelectorOpen(false)}
        />
      )}

      {/* ZIP Archive Inspector Modal */}
      {zipInfo && (
        <ZipFileSelectorModal
          isOpen={isZipSelectorOpen}
          zipName={zipInfo.file.name}
          entries={zipInfo.entries}
          onSelectEntry={handleSelectZipEntry}
          onClose={() => setIsZipSelectorOpen(false)}
        />
      )}

      {/* Supported Formats Guide Modal */}
      <FormatSupportGuideModal
        isOpen={isFormatGuideOpen}
        onClose={() => setIsFormatGuideOpen(false)}
      />
    </div>
  );
}
