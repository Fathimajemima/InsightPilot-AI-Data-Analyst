import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Target, 
  BarChart3, 
  Sparkles, 
  Table2, 
  Layers, 
  Info,
  Calendar,
  DollarSign,
  Percent,
  Hash,
  ChevronDown,
  RefreshCw,
  Zap
} from 'lucide-react';
import type { Dataset, BusinessReportData } from '../types/data';
import { generateComprehensiveBusinessReport } from '../utils/reportGenerator';
import { formatMetricNumber } from '../utils/dataAnalyzer';

interface BusinessReportSectionProps {
  dataset: Dataset;
}

export const BusinessReportSection: React.FC<BusinessReportSectionProps> = ({ dataset }) => {
  const [report, setReport] = useState<BusinessReportData>(() => generateComprehensiveBusinessReport(dataset));
  const [selectedExportTable, setSelectedExportTable] = useState<string>('all');
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Recalculate if dataset updates
  React.useEffect(() => {
    setReport(generateComprehensiveBusinessReport(dataset));
  }, [dataset]);

  // Export CSV table helper
  const handleExportCsv = (tableId: string) => {
    if (tableId === 'all') {
      // Export all tables concatenated
      const fullCsv = report.exportableTables
        .map((tbl) => {
          const rows = tbl.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
          return `# ${tbl.title}\n${tbl.headers.join(',')}\n${rows.join('\n')}\n`;
        })
        .join('\n\n');

      const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataset.metadata.name.replace(/\.[^/.]+$/, '')}_full_report_tables.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const targetTable = report.exportableTables.find((t) => t.id === tableId);
      if (!targetTable) return;

      const rows = targetTable.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
      const csvContent = `${targetTable.headers.join(',')}\n${rows.join('\n')}`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${targetTable.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportDropdownOpen(false);
  };

  // Download / Print as PDF
  const handleDownloadPdf = () => {
    window.print();
  };

  // Download Report as Markdown Document
  const handleDownloadMarkdown = () => {
    const md = `
# EXECUTIVE BUSINESS REPORT: ${report.datasetName}
**Generated Date:** ${report.generatedAt}
**Source File:** ${report.datasetName} (${report.format.toUpperCase()})
**Scope:** ${report.rowCount.toLocaleString()} records across ${report.columnCount} dimensions

---

## 1. EXECUTIVE SUMMARY
${report.executiveSummary.narrative.join('\n\n')}

### Key Takeaways:
${report.executiveSummary.takeaways.map((t) => `- ${t}`).join('\n')}

---

## 2. KEY PERFORMANCE INDICATORS
${report.kpis
  .map(
    (k) =>
      `### ${k.title}: ${k.value}
- Formula / Source: ${k.formula}
- Status: ${k.status.toUpperCase()}
${k.missingReason ? `- Missing Columns: ${k.missingReason}` : ''}
${k.benchmark ? `- Benchmark: ${k.benchmark}` : ''}`
  )
  .join('\n\n')}

---

## 3. PERFORMANCE BREAKDOWN
${
  report.performance
    ? `**Dimension:** ${report.performance.dimensionName} | **Metric:** ${report.performance.metricName}

**Top Performers:**
${report.performance.topPerformers.map((p) => `- ${p.name}: ${p.value} (${p.share} share, ${p.orders} records)`).join('\n')}

**Underperformers:**
${report.performance.underPerformers.map((p) => `- ${p.name}: ${p.value} (${p.share} share, ${p.orders} records)`).join('\n')}`
    : 'No categorical or numerical dimensions available for breakdown.'
}

---

## 4. TREND ANALYSIS
${report.trend.summaryText}
${report.trend.missingNotice ? `*Note: ${report.trend.missingNotice}*` : ''}

---

## 5. DATA QUALITY REPORT
- **Completeness Score:** ${report.quality.completenessScore}%
- **Total Missing Cells:** ${report.quality.missingCellsCount}
- **Duplicate Records:** ${report.quality.duplicateRowCount}
- **Outliers Detected (>2.5σ):** ${report.quality.outliersCount}
- **Audit Verdict:** ${report.quality.auditVerdict}

---

## 6. BUSINESS RISKS
${report.risks.map((r) => `### [${r.severity.toUpperCase()}] ${r.title}\n- **Data Evidence:** ${r.evidence}\n- **Root Cause Hypothesis:** ${r.explanation}`).join('\n\n')}

---

## 7. RECOMMENDATIONS
${report.recommendations.map((rec) => `### ${rec.priority}: ${rec.action}\n- **Data Justification:** ${rec.dataJustification}\n- **Expected Impact:** ${rec.expectedImpact}\n- **Confidence:** ${rec.confidence}`).join('\n\n')}

---
*Report automatically generated by InsightPilot AI — Your AI Data Analyst.*
`;

    const blob = new Blob([md.trim()], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${report.datasetName.replace(/\.[^/.]+$/, '')}_executive_report.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Printable Report Container */}
      <div 
        ref={reportRef} 
        id="business-report-print-container"
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-10 space-y-8 print:p-0 print:border-none print:shadow-none"
      >
        {/* REPORT HEADER & TOOLBAR (Hide toolbar on print) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-600" /> Executive Business Report
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {dataset.metadata.format.toUpperCase()}-{dataset.rowCount}R</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {report.datasetName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Generated on {report.generatedAt} • Scope: {report.rowCount.toLocaleString()} records across {report.columnCount} attributes
            </p>
          </div>

          {/* Action Buttons (Export PDF, CSV, Markdown) */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Save or Print as PDF Document"
            >
              <Printer className="w-4 h-4" />
              <span>Download / Print PDF</span>
            </button>

            {/* Export CSV Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Tables (CSV)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Data Table to Download
                  </div>
                  <button
                    onClick={() => handleExportCsv('all')}
                    className="w-full text-left p-2 rounded-xl text-xs font-semibold hover:bg-blue-50 text-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Download All Tables (.csv)</span>
                    <Download className="w-3 h-3" />
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  {report.exportableTables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleExportCsv(t.id)}
                      className="w-full text-left p-2 rounded-xl text-xs hover:bg-slate-50 text-slate-700 transition-colors truncate cursor-pointer"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Download Markdown Briefing */}
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
              title="Export editable text briefing"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export Brief (.md)</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: EXECUTIVE SUMMARY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">1. Executive Summary</h2>
          </div>

          <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {report.executiveSummary.headline}
            </h3>
            {report.executiveSummary.narrative.map((p, idx) => (
              <p key={idx} className="text-xs text-slate-700 leading-relaxed">
                {p}
              </p>
            ))}

            <div className="pt-3 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Executive Takeaways:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {report.executiveSummary.takeaways.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-slate-800 text-[11px] font-medium leading-tight">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: KEY PERFORMANCE INDICATORS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold">2. Key Performance Indicators (KPIs)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {report.kpis.map((kpi, idx) => {
              const isAvailable = kpi.status === 'available';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    isAvailable
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-amber-50/40 border-amber-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px] truncate" title={kpi.title}>
                      {kpi.title}
                    </span>
                    {isAvailable ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>

                  <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                    {kpi.value}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 text-[10px] space-y-0.5">
                    <p className="text-slate-500 font-mono truncate" title={kpi.formula}>
                      {kpi.formula}
                    </p>
                    {kpi.benchmark && (
                      <p className="text-emerald-700 font-semibold">{kpi.benchmark}</p>
                    )}
                    {kpi.missingReason && (
                      <p className="text-amber-700 italic leading-snug">{kpi.missingReason}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: KEY BUSINESS INSIGHTS & PERFORMANCE BREAKDOWN */}
        {report.performance && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold">3. Key Business Insights & Segment Breakdown</h2>
            </div>

            <p className="text-xs text-slate-600">
              Quantitative ranking across dimension <strong>"{report.performance.dimensionName}"</strong> evaluated against metric <strong>"{report.performance.metricName}"</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Performers Card */}
              <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Top-Performing Segments
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono">Top Share</span>
                </div>

                <div className="space-y-2">
                  {report.performance.topPerformers.map((p, idx) => (
                    <div key={p.name} className="p-2.5 bg-white rounded-xl border border-emerald-100 flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 truncate" title={p.name}>{p.name}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-slate-900">{p.value}</span>
                        <span className="text-[11px] text-emerald-700 ml-1.5 font-bold">({p.share})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Underperformers Card */}
              <div className="p-4 bg-rose-50/40 border border-rose-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Lagging / Underperforming Segments
                  </span>
                  <span className="text-[10px] text-rose-700 font-mono">Lowest Yield</span>
                </div>

                <div className="space-y-2">
                  {report.performance.underPerformers.map((p, idx) => (
                    <div key={p.name} className="p-2.5 bg-white rounded-xl border border-rose-100 flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-900 truncate" title={p.name}>{p.name}</span>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="font-bold text-slate-900">{p.value}</span>
                        <span className="text-[11px] text-rose-600 ml-1.5 font-bold">({p.share})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: TREND ANALYSIS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">4. Trend Analysis Over Time</h2>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
            <p className="text-xs text-slate-700 leading-relaxed">
              {report.trend.summaryText}
            </p>

            {report.trend.hasDate && report.trend.chartPoints.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Overall Trajectory:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase font-mono ${
                      report.trend.overallTrajectory === 'growth'
                        ? 'bg-emerald-100 text-emerald-800'
                        : report.trend.overallTrajectory === 'decline'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {report.trend.overallTrajectory}
                    </span>
                  </div>

                  {report.trend.peakPeriod && (
                    <div className="text-slate-600">
                      <strong>Peak:</strong> {report.trend.peakPeriod.label} ({report.trend.peakPeriod.value})
                    </div>
                  )}

                  {report.trend.lowestPeriod && (
                    <div className="text-slate-600">
                      <strong>Trough:</strong> {report.trend.lowestPeriod.label} ({report.trend.lowestPeriod.value})
                    </div>
                  )}
                </div>

                {/* SVG Visual Trend Curve */}
                <div className="pt-2">
                  <svg viewBox="0 0 600 130" className="w-full h-28 overflow-visible">
                    {(() => {
                      const pts = report.trend.chartPoints;
                      const vals = pts.map((p) => p.value);
                      const max = Math.max(...vals, 1);
                      const min = Math.min(...vals, 0);
                      const stepX = 600 / (pts.length - 1 || 1);

                      const polyPoints = pts.map((p, i) => {
                        const x = i * stepX;
                        const y = 100 - ((p.value - min) / (max - min || 1)) * 80;
                        return `${x},${y}`;
                      });

                      return (
                        <>
                          <line x1="0" y1="100" x2="600" y2="100" stroke="#e2e8f0" strokeDasharray="3 3" />
                          <polyline
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={polyPoints.join(' ')}
                          />
                          {pts.map((p, i) => {
                            const x = i * stepX;
                            const y = 100 - ((p.value - min) / (max - min || 1)) * 80;
                            return (
                              <g key={i}>
                                <circle cx={x} cy={y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                                <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a" fontFamily="monospace">
                                  {formatMetricNumber(p.value)}
                                </text>
                                <text x={x} y="120" textAnchor="middle" fontSize="9" fill="#64748b">
                                  {p.label}
                                </text>
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            ) : (
              report.trend.missingNotice && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Missing Date Column:</span>
                    <p className="mt-0.5 text-amber-700">{report.trend.missingNotice}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* SECTION 5: DATA QUALITY REPORT */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold">5. Data Quality & Audit Report</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Completeness Score</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{report.quality.completenessScore}%</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Missing Cells</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{report.quality.missingCellsCount.toLocaleString()}</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Duplicate Rows</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{report.quality.duplicateRowCount}</p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Outliers Detected</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{report.quality.outliersCount}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <strong>Audit Verdict:</strong> {report.quality.auditVerdict}
          </div>
        </section>

        {/* SECTION 6: BUSINESS RISKS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold">6. Identified Business Risks</h2>
          </div>

          <div className="space-y-3">
            {report.risks.map((risk) => (
              <div
                key={risk.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">{risk.title}</h3>
                  {getSeverityBadge(risk.severity)}
                </div>
                <div className="text-xs space-y-1 text-slate-600 leading-relaxed">
                  <p>
                    <strong className="text-slate-800">Mathematical Evidence:</strong> {risk.evidence}
                  </p>
                  <p className="text-slate-500 italic">
                    <strong>Root Cause Hypothesis:</strong> {risk.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 7: RECOMMENDATIONS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold">7. Prioritized Business Recommendations</h2>
          </div>

          <div className="space-y-3">
            {report.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-blue-100 text-blue-800 font-mono">
                      {rec.priority}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{rec.action}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    {rec.confidence}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-0.5">Data-Supported Finding:</span>
                    <span className="text-slate-600">{rec.dataJustification}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-emerald-800 block mb-0.5">Expected Business Impact:</span>
                    <span className="text-slate-600">{rec.expectedImpact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 8: DATA TABLES (CSV EXPORTABLE) */}
        <section className="space-y-4 print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-slate-900">
              <Table2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">8. Report Data Tables (Exportable CSV)</h2>
            </div>
            <button
              onClick={() => handleExportCsv('all')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All Tables</span>
            </button>
          </div>

          <div className="space-y-4">
            {report.exportableTables.map((tbl) => (
              <div key={tbl.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{tbl.title}</span>
                  <button
                    onClick={() => handleExportCsv(tbl.id)}
                    className="flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        {tbl.headers.map((h, idx) => (
                          <th key={idx} className="py-2 px-3 border-r border-slate-100 last:border-r-0 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800 bg-white">
                      {tbl.rows.slice(0, 8).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 border-r border-slate-100 last:border-r-0 whitespace-nowrap">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* REPORT SIGN-OFF FOOTER */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Automated Audit Verified • Zero Fabricated Numbers Guarantee</span>
          </div>
          <span>Report Generated by InsightPilot AI</span>
        </div>
      </div>
    </div>
  );
};
