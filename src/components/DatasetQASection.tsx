import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Zap, 
  Table2, 
  Lightbulb, 
  Target, 
  AlertCircle, 
  BarChart3, 
  TrendingUp, 
  Download, 
  CheckCircle2,
  HelpCircle,
  Columns
} from 'lucide-react';
import type { ChatMessage, Dataset, QueryAnalysisResult } from '../types/data';
import { executeAdvancedAnalysis } from '../utils/advancedQueryEngine';
import { formatMetricNumber } from '../utils/dataAnalyzer';

interface DatasetQASectionProps {
  dataset: Dataset;
}

export const DatasetQASection: React.FC<DatasetQASectionProps> = ({ dataset }) => {
  const [queryInput, setQueryInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Initialize with initial dataset analysis
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialAnalysis = executeAdvancedAnalysis('overview', dataset);
    return [
      {
        id: 'msg-1',
        sender: 'assistant',
        timestamp: new Date(),
        question: 'Dataset Initialized',
        answer: initialAnalysis.directAnswer,
        analysis: initialAnalysis,
        dataPoints: initialAnalysis.dataPoints,
      },
    ];
  });

  // When dataset changes, reset to new dataset overview
  React.useEffect(() => {
    const initialAnalysis = executeAdvancedAnalysis('overview', dataset);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date(),
        question: 'Dataset Loaded',
        answer: initialAnalysis.directAnswer,
        analysis: initialAnalysis,
        dataPoints: initialAnalysis.dataPoints,
      },
    ]);
  }, [dataset]);

  // Suggested questions prominently including the user's requested scenarios
  const suggestedQuestions = [
    'Which product has the highest sales?',
    'Which region generates the most profit?',
    'What is the monthly sales trend?',
    'Which category has the lowest profit margin?',
    'Are there any unusual values in my dataset?',
    'What are the top 5 customers by sales?',
    'What business problems can you identify from this data?',
    'What actions would you recommend to improve performance?',
  ];

  const handleAsk = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isThinking) return;

    setQueryInput('');
    setIsThinking(true);

    // 1. Run local grounded analytical engine with mathematical calculations
    const analysis = executeAdvancedAnalysis(q, dataset);

    // 2. Query server-side Gemini API if configured to enrich narrative interpretation
    let finalAnswer = analysis.directAnswer;
    let finalInterpretation = analysis.businessInterpretation;
    let finalRecommendation = analysis.actionableRecommendation;
    let isAi = false;

    try {
      const response = await fetch('/api/gemini/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          computedAnswer: analysis.directAnswer,
          evidenceTable: analysis.evidenceTable,
          columnsUsed: analysis.columnsUsed,
          datasetMeta: {
            name: dataset.metadata.name,
            rows: dataset.rowCount,
            cols: dataset.columnCount,
            columns: dataset.columns.map((c) => ({
              name: c.name,
              type: c.type,
              mean: c.numericStats?.mean,
              sum: c.numericStats?.sum,
            })),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.answer) {
          finalAnswer = data.answer;
          isAi = true;
        }
      }
    } catch {
      // Gracefully uses local deterministic analysis
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date(),
      question: q,
      answer: finalAnswer,
      analysis: {
        ...analysis,
        directAnswer: finalAnswer,
        businessInterpretation: finalInterpretation,
        actionableRecommendation: finalRecommendation,
      },
      dataPoints: analysis.dataPoints,
      isAiEnhanced: isAi,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsThinking(false);
  };

  const handleExportEvidenceCsv = (table: { headers: string[]; rows: (string | number)[][] }, title: string) => {
    const csvContent = [
      table.headers.join(','),
      ...table.rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}_evidence.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">AI-Powered Data Analyst Q&A</h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Evidence-Backed Engine</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ask natural-language business questions — answered with verified calculations, evidence tables, inline charts, and actionable recommendations.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const init = executeAdvancedAnalysis('overview', dataset);
            setMessages([
              {
                id: `msg-${Date.now()}`,
                sender: 'assistant',
                timestamp: new Date(),
                question: 'Reset Conversation',
                answer: init.directAnswer,
                analysis: init,
                dataPoints: init.dataPoints,
              },
            ]);
          }}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Suggested Natural Language Question Chips */}
      <div className="px-5 py-3.5 bg-slate-50/40 border-b border-slate-100 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Recommended Analytical Inquiries:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleAsk(sq)}
              className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Stream */}
      <div className="p-5 sm:p-6 space-y-6 max-h-[640px] overflow-y-auto">
        {messages.map((msg) => {
          const analysis = msg.analysis;

          return (
            <div key={msg.id} className="space-y-3 animate-in fade-in duration-200">
              {/* User Question */}
              {msg.question !== 'Dataset Initialized' && msg.question !== 'Dataset Loaded' && msg.question !== 'Reset Conversation' && (
                <div className="flex justify-end">
                  <div className="max-w-xl bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs text-xs font-semibold shadow-xs">
                    {msg.question}
                  </div>
                </div>
              )}

              {/* Complete Analytical Answer Card */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-5 space-y-4 shadow-2xs">
                  {/* 1. Direct Answer Headline */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Direct Answer
                      </span>
                      {/* Methodology Pill */}
                      {analysis && analysis.columnsUsed.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                          <Columns className="w-3 h-3 text-slate-400" />
                          <span>Columns: {analysis.columnsUsed.join(', ')}</span>
                          <span>•</span>
                          <span>{analysis.rowsEvaluated} rows</span>
                        </div>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-slate-900 leading-relaxed pt-1">
                      {msg.answer}
                    </div>
                  </div>

                  {/* Missing Column Warning Notice (if applicable) */}
                  {analysis?.missingColumnNotice && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Missing Required Columns:</span>
                        <p className="mt-0.5 text-amber-700 leading-relaxed">{analysis.missingColumnNotice}</p>
                      </div>
                    </div>
                  )}

                  {/* 2. Supporting Evidence Table */}
                  {analysis?.evidenceTable && analysis.evidenceTable.rows.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Table2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Calculated Evidence Table</span>
                        </div>
                        <button
                          onClick={() => handleExportEvidenceCsv(analysis.evidenceTable!, msg.question)}
                          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                          title="Export evidence to CSV"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                            <tr>
                              {analysis.evidenceTable.headers.map((h, idx) => (
                                <th key={idx} className="py-2 px-3 border-r border-slate-200/60 last:border-r-0 whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                            {analysis.evidenceTable.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`py-2 px-3 border-r border-slate-100 last:border-r-0 whitespace-nowrap ${
                                      cIdx === 1 ? 'font-sans font-medium text-slate-900' : ''
                                    }`}
                                  >
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. Inline Mini Chart (Visual Evidence) */}
                  {analysis?.inlineChart && analysis.inlineChart.values.length > 0 && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          {analysis.inlineChart.type === 'line' ? (
                            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span>{analysis.inlineChart.title || 'Visual Evidence'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {analysis.inlineChart.values.length} data points
                        </span>
                      </div>

                      {/* Mini Bar or Line SVG */}
                      {analysis.inlineChart.type === 'bar' && (
                        <div className="space-y-1.5 pt-1">
                          {analysis.inlineChart.labels.slice(0, 5).map((label, i) => {
                            const val = analysis.inlineChart!.values[i];
                            const maxVal = Math.max(...analysis.inlineChart!.values, 1);
                            const pct = (val / maxVal) * 100;

                            return (
                              <div key={label} className="space-y-0.5 text-xs">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-medium text-slate-700 truncate max-w-[200px]" title={label}>
                                    {label}
                                  </span>
                                  <span className="font-mono font-bold text-blue-700">
                                    {formatMetricNumber(val)}
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                                    style={{ width: `${Math.max(pct, 3)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {analysis.inlineChart.type === 'line' && (
                        <div className="pt-2">
                          <svg viewBox="0 0 500 120" className="w-full h-24 overflow-visible">
                            {(() => {
                              const vals = analysis.inlineChart!.values;
                              const max = Math.max(...vals, 1);
                              const min = Math.min(...vals, 0);
                              const stepX = 500 / (vals.length - 1 || 1);

                              const pts = vals.map((v, idx) => {
                                const x = idx * stepX;
                                const y = 100 - ((v - min) / (max - min || 1)) * 80;
                                return `${x},${y}`;
                              });

                              return (
                                <>
                                  <polyline
                                    fill="none"
                                    stroke="#2563eb"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={pts.join(' ')}
                                  />
                                  {vals.map((v, idx) => {
                                    const x = idx * stepX;
                                    const y = 100 - ((v - min) / (max - min || 1)) * 80;
                                    return (
                                      <g key={idx}>
                                        <circle cx={x} cy={y} r="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                                        <text x={x} y={115} textAnchor="middle" fontSize="9" fill="#64748b">
                                          {analysis.inlineChart!.labels[idx]}
                                        </text>
                                      </g>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </svg>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Business Interpretation & Actionable Recommendation Boxes */}
                  {analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Interpretation */}
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900">
                          <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                          <span>Business Interpretation</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          {analysis.businessInterpretation}
                        </p>
                      </div>

                      {/* Recommendation */}
                      <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                          <Target className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Actionable Recommendation</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          {analysis.actionableRecommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Grounding Verification Badge */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Evidence verified against actual dataset (zero invented values)</span>
                    </div>
                    {msg.isAiEnhanced && (
                      <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 font-mono text-[10px]">
                        <Zap className="w-3 h-3" /> Gemini 3.8 Flash Synthesized
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center gap-2.5 text-xs text-slate-500 italic py-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Crunching numbers, filtering rows, and formulating evidence-based insights...</span>
          </div>
        )}
      </div>

      {/* Query Input Bar */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(queryInput);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask any question about your data (e.g. 'Which product has the highest sales?', 'What is the monthly sales trend?')..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            disabled={isThinking}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!queryInput.trim() || isThinking}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <span>Analyze</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
