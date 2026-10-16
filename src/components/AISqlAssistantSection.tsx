import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Sparkles, 
  Play, 
  Copy, 
  Check, 
  HelpCircle, 
  BookOpen, 
  ShieldCheck, 
  Table2, 
  BarChart3, 
  RotateCcw, 
  ArrowRight, 
  Search, 
  Download, 
  Code2, 
  AlertTriangle, 
  Terminal, 
  Columns3, 
  Zap,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Dataset } from '../types/data';
import { 
  executeSafeSqlQuery, 
  explainSqlQuery, 
  generateStarterSqlQueries, 
  generateClientSideSql, 
  type SqlQueryResult, 
  type SqlLearningBreakdown, 
  type StarterQuery 
} from '../utils/sqlEngine';
import { formatMetricNumber } from '../utils/dataAnalyzer';

interface AISqlAssistantSectionProps {
  dataset: Dataset;
}

export const AISqlAssistantSection: React.FC<AISqlAssistantSectionProps> = ({ dataset }) => {
  // Natural language query input
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);

  // Active SQL query in editor
  const [sqlQuery, setSqlQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Execution Results
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Learning Mode ("Explain SQL") Toggle
  const [isExplainMode, setIsExplainMode] = useState(true);
  const [learningBreakdown, setLearningBreakdown] = useState<SqlLearningBreakdown | null>(null);

  // Results View Tab ('table' vs 'chart')
  const [resultTab, setResultTab] = useState<'table' | 'chart'>('table');

  // Schema Inspector Visibility
  const [isSchemaExpanded, setIsSchemaExpanded] = useState(false);

  // Result pagination
  const [resultPage, setResultPage] = useState(1);
  const resultPageSize = 8;

  // Starter queries for active dataset
  const starterQueries = useMemo<StarterQuery[]>(() => {
    return generateStarterSqlQueries(dataset);
  }, [dataset]);

  // Initial load: set default starter query and run it
  useEffect(() => {
    if (starterQueries.length > 0) {
      const defaultQuery = starterQueries[1] || starterQueries[0];
      setSqlQuery(defaultQuery.sql);
      setNaturalLanguageInput(defaultQuery.question);

      // Execute initial safe query
      const run = executeSafeSqlQuery(defaultQuery.sql, dataset);
      if (run.success && run.result) {
        setQueryResult(run.result);
        setExecutionError(null);
        if (run.result.suggestedChart !== 'table') {
          setResultTab('chart');
        } else {
          setResultTab('table');
        }
      }
      setLearningBreakdown(explainSqlQuery(defaultQuery.sql, dataset));
    }
  }, [dataset]);

  // Execute current SQL query
  const handleRunSql = () => {
    if (!sqlQuery.trim()) return;

    setIsExecuting(true);
    setExecutionError(null);

    setTimeout(() => {
      const run = executeSafeSqlQuery(sqlQuery, dataset);
      if (run.success && run.result) {
        setQueryResult(run.result);
        setExecutionError(null);
        if (run.result.suggestedChart !== 'table' && run.result.chartData) {
          setResultTab('chart');
        } else {
          setResultTab('table');
        }
      } else {
        setExecutionError(run.error || 'Execution failed.');
        setQueryResult(null);
      }

      setLearningBreakdown(explainSqlQuery(sqlQuery, dataset));
      setIsExecuting(false);
      setResultPage(1);
    }, 150);
  };

  // Generate SQL from Natural Language
  const handleGenerateSql = async (promptText?: string) => {
    const questionToAsk = (promptText || naturalLanguageInput).trim();
    if (!questionToAsk) return;

    setIsGeneratingSql(true);
    setExecutionError(null);

    try {
      // 1. Try server-side Gemini API
      const response = await fetch('/api/gemini/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionToAsk,
          schema: {
            tableName: 'dataset',
            columns: dataset.columns.map((c) => ({ name: c.name, type: c.type })),
          },
          sampleRows: dataset.data.slice(0, 3),
        }),
      });

      const data = await response.json();

      if (data.sql && !data.fallback) {
        setSqlQuery(data.sql);
        // Automatically execute generated SQL
        const run = executeSafeSqlQuery(data.sql, dataset);
        if (run.success && run.result) {
          setQueryResult(run.result);
          setExecutionError(null);
          if (run.result.suggestedChart !== 'table' && run.result.chartData) {
            setResultTab('chart');
          } else {
            setResultTab('table');
          }
        }
        setLearningBreakdown(explainSqlQuery(data.sql, dataset));
      } else {
        // 2. Client-side deterministic NLP generator fallback
        const clientGenerated = generateClientSideSql(questionToAsk, dataset);
        setSqlQuery(clientGenerated.sql);
        const run = executeSafeSqlQuery(clientGenerated.sql, dataset);
        if (run.success && run.result) {
          setQueryResult(run.result);
          setExecutionError(null);
          if (run.result.suggestedChart !== 'table' && run.result.chartData) {
            setResultTab('chart');
          } else {
            setResultTab('table');
          }
        }
        setLearningBreakdown(explainSqlQuery(clientGenerated.sql, dataset));
      }
    } catch (err: any) {
      // Client-side fallback on network failure
      const clientGenerated = generateClientSideSql(questionToAsk, dataset);
      setSqlQuery(clientGenerated.sql);
      const run = executeSafeSqlQuery(clientGenerated.sql, dataset);
      if (run.success && run.result) {
        setQueryResult(run.result);
      }
      setLearningBreakdown(explainSqlQuery(clientGenerated.sql, dataset));
    } finally {
      setIsGeneratingSql(false);
      setResultPage(1);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Export Results to CSV
  const handleExportCsv = () => {
    if (!queryResult || queryResult.rows.length === 0) return;

    const headers = queryResult.columns;
    const csvContent = [
      headers.join(','),
      ...queryResult.rows.map((row) =>
        headers
          .map((h) => {
            const v = row[h];
            if (v === null || v === undefined) return '';
            const str = String(v);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
    link.setAttribute('download', `${dataset.metadata.name.replace(/\.[^/.]+$/, '')}_sql_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Paginated rows
  const paginatedRows = useMemo(() => {
    if (!queryResult) return [];
    const start = (resultPage - 1) * resultPageSize;
    return queryResult.rows.slice(start, start + resultPageSize);
  }, [queryResult, resultPage, resultPageSize]);

  const totalPages = queryResult ? Math.ceil(queryResult.rowCount / resultPageSize) || 1 : 1;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden p-6 sm:p-8 space-y-8">
      {/* 1. SECTION HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1.5 shadow-2xs">
              <Database className="w-3.5 h-3.5 text-cyan-600" />
              <span>AI SQL Assistant</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>In-Memory AlaSQL • Read-Only Safe</span>
            </span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Natural Language to SQL Query & Learning Engine
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Ask analytical questions in simple English, generate standard ANSI SQL against your dataset's real schema, and inspect line-by-line syntax breakdowns.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSchemaExpanded(!isSchemaExpanded)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer shadow-2xs"
          >
            <Columns3 className="w-3.5 h-3.5 text-slate-600" />
            <span>Schema Inspector</span>
            {isSchemaExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. SCHEMA INSPECTOR DRAWER (Collapsible) */}
      {isSchemaExpanded && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-xs text-slate-900">
                Active Table: <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-cyan-700">dataset</code>
              </span>
              <span className="text-xs text-slate-400">({dataset.columnCount} columns available)</span>
            </div>
            <span className="text-[11px] text-slate-400 italic">Click a column badge to insert into query</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {dataset.columns.map((col) => (
              <button
                key={col.name}
                onClick={() => {
                  setSqlQuery((prev) => `${prev} "${col.name}" `);
                }}
                className="px-2.5 py-1 bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-200 rounded-lg text-xs font-mono text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs group"
                title={`Type: ${col.type} • Sample: ${dataset.data[0]?.[col.name] ?? 'null'}`}
              >
                <span className="font-semibold group-hover:text-cyan-800">{col.name}</span>
                <span className="text-[10px] text-slate-400 uppercase">({col.type})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. NATURAL LANGUAGE TO SQL INPUT BAR */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Ask a Question in Simple English:
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`e.g. "What are the top 5 ${dataset.categoricalColumns[0] || 'categories'} by ${dataset.numericColumns[0] || 'sales'}?", "Show average ${dataset.numericColumns[0] || 'amount'}"`}
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerateSql();
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 font-medium"
            />
          </div>

          <button
            onClick={() => handleGenerateSql()}
            disabled={isGeneratingSql || !naturalLanguageInput.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {isGeneratingSql ? (
              <>
                <Zap className="w-4 h-4 animate-spin text-cyan-200" />
                <span>Translating to SQL...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate & Run SQL</span>
              </>
            )}
          </button>
        </div>

        {/* Suggested Starter Questions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Suggestions:
          </span>
          {starterQueries.slice(0, 4).map((sq) => (
            <button
              key={sq.id}
              onClick={() => {
                setNaturalLanguageInput(sq.question);
                setSqlQuery(sq.sql);
                handleGenerateSql(sq.question);
              }}
              className="px-3 py-1 bg-slate-50 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 rounded-xl text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0 shadow-2xs"
            >
              {sq.title}
            </button>
          ))}
        </div>
      </div>

      {/* 4. INTERACTIVE SQL EDITOR & CONTROLS */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-700" />
            <span className="font-bold text-slate-900">SQL Query Editor</span>
            <span className="text-slate-400 text-[11px] font-mono">SELECT from "dataset"</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Learning Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200/70 px-3 py-1 rounded-xl text-xs font-bold text-slate-700 transition-colors select-none">
              <input
                type="checkbox"
                checked={isExplainMode}
                onChange={(e) => setIsExplainMode(e.target.checked)}
                className="w-3.5 h-3.5 text-cyan-600 rounded cursor-pointer"
              />
              <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
              <span>Explain SQL (Learning Mode)</span>
            </label>

            {/* Copy Button */}
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-semibold cursor-pointer text-xs"
              title="Copy SQL"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Code Block Editor Area */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRunSql();
              }
            }}
            placeholder="SELECT * FROM dataset LIMIT 10;"
            rows={5}
            className="w-full p-4 font-mono text-xs text-cyan-300 bg-transparent resize-y focus:outline-hidden leading-relaxed tracking-wide selection:bg-cyan-900"
            spellCheck={false}
          />

          {/* Bottom Editor Bar */}
          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">Ctrl+Enter</kbd> to execute
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleRunSql}
                disabled={isExecuting || !sqlQuery.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 text-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run Query</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. EXECUTION ERROR BANNER (if any) */}
      {executionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-bold">Execution Error:</span>
            <p className="leading-relaxed">{executionError}</p>
          </div>
        </div>
      )}

      {/* 6. LEARNING MODE: "EXPLAIN SQL" BREAKDOWN PANEL */}
      {isExplainMode && learningBreakdown && (
        <div className="p-5 bg-gradient-to-br from-cyan-50/40 via-blue-50/20 to-slate-50 border border-cyan-200 rounded-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-600" />
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                SQL Learning Breakdown (Beginner Guide)
              </h3>
            </div>
            {learningBreakdown.conceptsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {learningBreakdown.conceptsUsed.map((concept, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white border border-cyan-200 text-cyan-800 text-[10px] rounded-full font-bold">
                    {concept}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {learningBreakdown.summary}
          </p>

          {/* Clause-by-Clause Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {learningBreakdown.clauses.map((c, idx) => (
              <div key={idx} className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700">
                    {c.clause}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-700">{c.concept}</span>
                </div>
                <div className="font-mono text-[11px] text-cyan-800 bg-cyan-50/50 p-1.5 rounded border border-cyan-100 truncate">
                  {c.codeSnippet}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {c.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. QUERY RESULTS VIEW */}
      {queryResult && (
        <div className="space-y-4 pt-2">
          {/* Status & Tab Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Query Executed Successfully</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {queryResult.rowCount.toLocaleString()} row(s) in {queryResult.executionTimeMs}ms
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                {queryResult.plainEnglishExplanation}
              </p>
            </div>

            {/* View Switcher & Export */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <button
                  onClick={() => setResultTab('table')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    resultTab === 'table' ? 'bg-cyan-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table2 className="w-3 h-3" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => setResultTab('chart')}
                  disabled={!queryResult.chartData}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                    resultTab === 'chart' ? 'bg-cyan-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Chart</span>
                </button>
              </div>

              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="Download results as CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* RESULT TAB 1: TABLE VIEW */}
          {resultTab === 'table' && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 sticky top-0 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-12 text-center text-slate-400">#</th>
                      {queryResult.columns.map((c) => (
                        <th key={c} className="p-2.5 border-r border-slate-200/60 last:border-r-0 whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                    {paginatedRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-cyan-50/20 transition-colors">
                        <td className="p-2.5 text-center text-slate-400 bg-slate-50/40 border-r border-slate-100">
                          {(resultPage - 1) * resultPageSize + rIdx + 1}
                        </td>
                        {queryResult.columns.map((c) => {
                          const val = row[c];
                          const isNull = val === null || val === undefined;
                          return (
                            <td
                              key={c}
                              className={`p-2.5 border-r border-slate-100 last:border-r-0 truncate max-w-[220px] ${
                                isNull ? 'text-slate-300 italic' : ''
                              }`}
                            >
                              {isNull ? 'NULL' : typeof val === 'number' ? formatMetricNumber(val) : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Page {resultPage} of {totalPages} ({queryResult.rowCount} total rows)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setResultPage((p) => Math.max(p - 1, 1))}
                    disabled={resultPage === 1}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setResultPage((p) => Math.min(p + 1, totalPages))}
                    disabled={resultPage >= totalPages}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RESULT TAB 2: INLINE VISUAL CHART */}
          {resultTab === 'chart' && queryResult.chartData && (
            <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Query Visualization: {queryResult.chartData.categoryCol} vs. {queryResult.chartData.metricCol}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Automatically rendered from SQL query result set.
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-cyan-100 text-cyan-800">
                  {queryResult.suggestedChart} chart
                </span>
              </div>

              {/* Bar or Donut Chart */}
              {queryResult.suggestedChart === 'bar' && (
                <div className="h-52 flex items-end gap-2 pt-6 px-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  {queryResult.chartData.labels.map((lbl, idx) => {
                    const val = queryResult.chartData!.values[idx];
                    const maxVal = Math.max(...queryResult.chartData!.values) || 1;
                    const heightPct = Math.max(10, (val / maxVal) * 100);

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatMetricNumber(val)}
                        </span>
                        <div
                          className="w-full bg-gradient-to-t from-cyan-600 to-blue-500 rounded-t-md hover:from-cyan-700 hover:to-blue-600 transition-all cursor-pointer shadow-2xs"
                          style={{ height: `${heightPct}%` }}
                          title={`${lbl}: ${formatMetricNumber(val)}`}
                        />
                        <span className="text-[10px] text-slate-600 font-medium truncate w-full text-center mt-1">
                          {lbl}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Line Chart */}
              {queryResult.suggestedChart === 'line' && (
                <div className="h-52 flex items-end gap-3 pt-6 px-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  {queryResult.chartData.labels.map((lbl, idx) => {
                    const val = queryResult.chartData!.values[idx];
                    const maxVal = Math.max(...queryResult.chartData!.values) || 1;
                    const heightPct = Math.max(12, (val / maxVal) * 100);

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[10px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatMetricNumber(val)}
                        </span>
                        <div className="w-full flex items-center justify-center relative" style={{ height: `${heightPct}%` }}>
                          <div className="w-1 bg-cyan-200 h-full absolute" />
                          <div className="w-3.5 h-3.5 bg-cyan-600 border-2 border-white rounded-full shadow-xs relative z-10 group-hover:scale-125 transition-transform" />
                        </div>
                        <span className="text-[10px] text-slate-600 font-medium truncate w-full text-center mt-1">
                          {lbl}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
