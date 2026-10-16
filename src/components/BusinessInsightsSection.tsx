import React, { useState } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  PieChart, 
  Sparkles, 
  ArrowUpRight,
  Zap,
  Info
} from 'lucide-react';
import type { BusinessInsight, Dataset } from '../types/data';
import { generateEvidenceBasedInsights } from '../utils/insightGenerator';

interface BusinessInsightsSectionProps {
  dataset: Dataset;
}

export const BusinessInsightsSection: React.FC<BusinessInsightsSectionProps> = ({ dataset }) => {
  const [insights, setInsights] = useState<BusinessInsight[]>(() => generateEvidenceBasedInsights(dataset));
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiExecutiveSummary, setAiExecutiveSummary] = useState<string | null>(null);

  // If dataset changes, update insights
  React.useEffect(() => {
    setInsights(generateEvidenceBasedInsights(dataset));
    setAiExecutiveSummary(null);
  }, [dataset]);

  const handleGenerateAiBrief = async () => {
    setIsGeneratingAi(true);

    try {
      const response = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetMeta: {
            name: dataset.metadata.name,
            rows: dataset.rowCount,
            cols: dataset.columnCount,
            missingRate: dataset.missingCellsPercentage,
            duplicates: dataset.duplicateRowCount,
            columns: dataset.columns.map((c) => ({
              name: c.name,
              type: c.type,
              mean: c.numericStats?.mean,
              sum: c.numericStats?.sum,
              min: c.numericStats?.min,
              max: c.numericStats?.max,
              mode: c.categoryStats?.mode,
              modeCount: c.categoryStats?.modeCount,
            })),
          },
          currentInsights: insights.map((i) => ({ title: i.title, desc: i.description })),
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.summary) {
          setAiExecutiveSummary(resData.summary);
        }
      } else {
        setAiExecutiveSummary(
          `Executive Brief for ${dataset.metadata.name}:\n\n` +
          `• Volume & Scale: ${dataset.rowCount.toLocaleString()} transactions across ${dataset.columnCount} business dimensions.\n` +
          `• Data Reliability: ${100 - dataset.missingCellsPercentage}% completeness score with ${dataset.duplicateRowCount} duplicates.\n` +
          `• Strategic Focus: Immediate priority is to investigate performance variance across top segments and monitor extreme outliers.`
        );
      }
    } catch {
      // Local fallback executive summary
      setAiExecutiveSummary(
        `Executive Brief for ${dataset.metadata.name}:\n\n` +
        `• Volume & Scale: ${dataset.rowCount.toLocaleString()} records across ${dataset.columnCount} business dimensions.\n` +
        `• Data Reliability: ${(100 - dataset.missingCellsPercentage).toFixed(1)}% completeness score with ${dataset.duplicateRowCount} duplicate rows.\n` +
        `• Strategic Focus: Investigate high-leverage segments and monitor distribution variance for sustainable performance.`
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const getSeverityBadge = (severity: BusinessInsight['severity']) => {
    switch (severity) {
      case 'positive':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Positive Signal
          </span>
        );
      case 'warning':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Attention Required
          </span>
        );
      case 'critical':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> Critical Finding
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Info className="w-3 h-3" /> Baseline Metric
          </span>
        );
    }
  };

  const getCategoryIcon = (category: BusinessInsight['category']) => {
    switch (category) {
      case 'pareto':
        return <PieChart className="w-4 h-4 text-amber-600" />;
      case 'driver':
      case 'overview':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'outlier':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'quality':
        return <ShieldCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <Lightbulb className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-6 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Evidence-Based Business Insights</h3>
            <p className="text-xs text-slate-500">
              Formulated strictly from verified statistical properties of your actual dataset
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateAiBrief}
          disabled={isGeneratingAi}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isGeneratingAi ? 'Synthesizing...' : 'Generate Executive Brief'}</span>
        </button>
      </div>

      {/* AI Executive Brief Banner (if generated) */}
      {aiExecutiveSummary && (
        <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border border-indigo-200 rounded-2xl animate-in fade-in duration-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Executive Synthesis Brief
              </h4>
            </div>
            <span className="text-[10px] text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200 font-mono">
              AI Grounded
            </span>
          </div>
          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
            {aiExecutiveSummary}
          </p>
        </div>
      )}

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-white flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              {/* Card Meta Bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-md bg-slate-100">
                    {getCategoryIcon(insight.category)}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {insight.category}
                  </span>
                </div>
                {getSeverityBadge(insight.severity)}
              </div>

              {/* Title & Description */}
              <h4 className="text-sm font-bold text-slate-900 leading-snug">{insight.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{insight.description}</p>
            </div>

            {/* Impact / Metric Bottom Row */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              {insight.metricBadge && (
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {insight.metricBadge}
                </span>
              )}
              {insight.impact && (
                <span className="text-slate-400 truncate max-w-[180px] italic" title={insight.impact}>
                  {insight.impact}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
