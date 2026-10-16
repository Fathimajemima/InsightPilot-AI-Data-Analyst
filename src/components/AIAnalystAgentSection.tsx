import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Sparkles, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  BarChart3, 
  Table2, 
  Layers, 
  ShieldCheck, 
  HelpCircle, 
  Sliders, 
  Lightbulb, 
  Download, 
  ChevronRight, 
  Zap, 
  TrendingUp, 
  Hash, 
  Type, 
  Calendar, 
  FileSpreadsheet,
  Check,
  Info
} from 'lucide-react';
import type { Dataset, EvidenceTable } from '../types/data';
import type { 
  DatasetUnderstanding, 
  AnalysisPlan, 
  AgentFinding, 
  AgentChartData,
  AnalysisPlanTask 
} from '../types/analystAgent';
import { 
  generateDatasetUnderstanding, 
  createAnalysisPlan, 
  executeAnalysisTasks 
} from '../utils/analystAgent';
import { formatMetricNumber } from '../utils/dataAnalyzer';

interface AIAnalystAgentSectionProps {
  dataset: Dataset;
  onAskFollowUpQuestion?: (question: string) => void;
}

export const AIAnalystAgentSection: React.FC<AIAnalystAgentSectionProps> = ({
  dataset,
  onAskFollowUpQuestion,
}) => {
  // Workflow Stages: 1. Understanding -> 2. Plan -> 3. Calculations -> 4. Findings -> 5. Recommendations
  type WorkflowStage = 'understanding' | 'plan' | 'calculations' | 'findings' | 'recommendations';
  const [currentStage, setCurrentStage] = useState<WorkflowStage>('findings');

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(100);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  // Generated Agent State
  const [understanding, setUnderstanding] = useState<DatasetUnderstanding>(() =>
    generateDatasetUnderstanding(dataset)
  );
  const [plan, setPlan] = useState<AnalysisPlan>(() =>
    createAnalysisPlan(dataset, generateDatasetUnderstanding(dataset))
  );
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Re-initialize when dataset changes
  useEffect(() => {
    const freshUnderstanding = generateDatasetUnderstanding(dataset);
    const freshPlan = createAnalysisPlan(dataset, freshUnderstanding);
    const { findings: initialFindings, followUpQuestions: initialFollowUps } = executeAnalysisTasks(
      dataset,
      freshPlan,
      freshUnderstanding
    );

    setUnderstanding(freshUnderstanding);
    setPlan(freshPlan);
    setFindings(initialFindings);
    setFollowUpQuestions(initialFollowUps);
    if (initialFindings.length > 0) {
      setSelectedFindingId(initialFindings[0].id);
    }
  }, [dataset]);

  // Run or Rerun Analysis Workflow with simulated progressive execution
  const handleRunFullAnalysis = () => {
    setIsExecuting(true);
    setExecutionProgress(10);
    setExecutionLogs([`[Step 1/5] Ingesting "${dataset.metadata.name}" (${dataset.rowCount} rows × ${dataset.columnCount} cols)...`]);
    setCurrentStage('calculations');

    setTimeout(() => {
      setExecutionProgress(35);
      const freshUnderstanding = generateDatasetUnderstanding(dataset);
      setUnderstanding(freshUnderstanding);
      setExecutionLogs((prev) => [
        ...prev,
        `[Step 2/5] Domain identified: ${freshUnderstanding.likelyDomain}`,
        `[Step 2/5] Analyzed ${freshUnderstanding.columnSemantics.length} column attributes and business semantics...`,
      ]);

      setTimeout(() => {
        setExecutionProgress(65);
        const freshPlan = createAnalysisPlan(dataset, freshUnderstanding);
        setPlan(freshPlan);
        setExecutionLogs((prev) => [
          ...prev,
          `[Step 3/5] Formulated ${freshPlan.tasks.length} analytical tasks based on available dimensions and metrics...`,
          `[Step 3/5] Executing verified mathematical models (zero fabrication)...`,
        ]);

        setTimeout(() => {
          setExecutionProgress(90);
          const { findings: freshFindings, followUpQuestions: freshFollowUps } = executeAnalysisTasks(
            dataset,
            freshPlan,
            freshUnderstanding
          );
          setFindings(freshFindings);
          setFollowUpQuestions(freshFollowUps);
          if (freshFindings.length > 0) {
            setSelectedFindingId(freshFindings[0].id);
          }
          setExecutionLogs((prev) => [
            ...prev,
            `[Step 4/5] Generated ${freshFindings.length} evidence-backed business findings with inline visualizations...`,
            `[Step 5/5] Synthesized actionable strategic recommendations and follow-up inquiries.`,
          ]);

          setTimeout(() => {
            setExecutionProgress(100);
            setIsExecuting(false);
            setCurrentStage('findings');
          }, 400);
        }, 500);
      }, 500);
    }, 400);
  };

  // Toggle task in plan
  const handleToggleTask = (taskId: string) => {
    setPlan((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, enabled: !t.enabled } : t)),
    }));
  };

  // Execute currently enabled tasks from plan stage
  const handleExecutePlan = () => {
    setIsExecuting(true);
    setCurrentStage('calculations');
    setExecutionProgress(50);
    setExecutionLogs([
      `[Execution] Running ${plan.tasks.filter((t) => t.enabled).length} enabled tasks from customized analysis plan...`,
    ]);

    setTimeout(() => {
      const { findings: freshFindings, followUpQuestions: freshFollowUps } = executeAnalysisTasks(
        dataset,
        plan,
        understanding
      );
      setFindings(freshFindings);
      setFollowUpQuestions(freshFollowUps);
      if (freshFindings.length > 0) {
        setSelectedFindingId(freshFindings[0].id);
      }
      setExecutionProgress(100);
      setIsExecuting(false);
      setCurrentStage('findings');
    }, 600);
  };

  // Export Findings as Markdown
  const handleExportMarkdown = () => {
    const lines = [
      `# InsightPilot AI — AI Data Analyst Executive Briefing`,
      `**Dataset:** ${dataset.metadata.name} (${dataset.metadata.format.toUpperCase()})`,
      `**Domain:** ${understanding.likelyDomain}`,
      `**Analyzed Records:** ${dataset.rowCount} rows × ${dataset.columnCount} columns`,
      `**Date:** ${new Date().toLocaleDateString()}`,
      '',
      `## 1. Executive Purpose & Scope`,
      understanding.likelyPurpose,
      '',
      `## 2. Key Limitations`,
      ...understanding.keyLimitations.map((lim) => `- ${lim}`),
      '',
      `## 3. Business Findings & Evidence`,
    ];

    findings.forEach((f, idx) => {
      lines.push(`### Finding ${idx + 1}: ${f.title}`);
      lines.push(`**Headline:** ${f.headline}`);
      lines.push(`**Summary:** ${f.summary}`);
      lines.push(`**Columns Used:** ${f.columnsUsed.join(', ')}`);
      lines.push(`**Why It Matters:** ${f.whyItMatters}`);
      lines.push(`**Actionable Recommendation:** ${f.recommendation}`);
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.metadata.name.replace(/\.[^/.]+$/, '')}_ai_analyst_briefing.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Selected active finding for detailed view
  const activeFinding = useMemo(() => {
    return findings.find((f) => f.id === selectedFindingId) || findings[0];
  }, [findings, selectedFindingId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden p-6 sm:p-8 space-y-8">
      {/* 1. SECTION HEADER & AUTONOMOUS AGENT IDENTITY */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5 shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              <span>AI Data Analyst Agent</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verified Math • Zero Fabrication</span>
            </span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Autonomous Data Analysis & Strategic Insights
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            The AI Analyst Agent autonomously analyzes column semantics, formulates a tailored research plan, calculates verified statistics, and surfaces prioritized business recommendations.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 cursor-pointer shadow-2xs"
            title="Export full briefing to Markdown document"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Briefing</span>
          </button>

          <button
            onClick={handleRunFullAnalysis}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Zap className="w-4 h-4 animate-spin text-purple-200" />
                <span>Executing Workflow...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Agent Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. FIVE-STAGE ANALYSIS WORKFLOW PIPELINE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="uppercase tracking-wider text-[11px] text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Analysis Workflow Stages</span>
          </span>
          <span className="text-[11px] text-purple-700 font-mono">
            {currentStage === 'understanding' && 'Stage 1 of 5: Dataset Understanding'}
            {currentStage === 'plan' && 'Stage 2 of 5: Analysis Plan Review'}
            {currentStage === 'calculations' && 'Stage 3 of 5: Deterministic Calculations'}
            {currentStage === 'findings' && 'Stage 4 of 5: Business Findings'}
            {currentStage === 'recommendations' && 'Stage 5 of 5: Strategic Recommendations'}
          </span>
        </div>

        {/* Interactive Step Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Step 1: Understanding */}
          <button
            onClick={() => setCurrentStage('understanding')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStage === 'understanding'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Step 1</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-1">Understanding</div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Semantics & domain</p>
          </button>

          {/* Step 2: Plan */}
          <button
            onClick={() => setCurrentStage('plan')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStage === 'plan'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Step 2</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-1">Analysis Plan</div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{plan.tasks.length} targeted tasks</p>
          </button>

          {/* Step 3: Calculations */}
          <button
            onClick={() => setCurrentStage('calculations')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStage === 'calculations'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Step 3</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-1">Calculations</div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Verified math run</p>
          </button>

          {/* Step 4: Findings */}
          <button
            onClick={() => setCurrentStage('findings')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStage === 'findings'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Step 4</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-purple-100 text-purple-800 font-bold">
                {findings.length}
              </span>
            </div>
            <div className="font-bold text-xs text-slate-900 mt-1">Business Findings</div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Evidence & charts</p>
          </button>

          {/* Step 5: Recommendations */}
          <button
            onClick={() => setCurrentStage('recommendations')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              currentStage === 'recommendations'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Step 5</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="font-bold text-xs text-slate-900 mt-1">Recommendations</div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Action roadmap</p>
          </button>
        </div>
      </div>

      {/* 3. STAGE VIEWS */}

      {/* STAGE 1: DATASET UNDERSTANDING */}
      {currentStage === 'understanding' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Domain & Purpose Banner */}
          <div className="p-5 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-200 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md text-[10px] font-bold uppercase font-mono">
                  Identified Domain
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">{understanding.likelyDomain}</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {dataset.rowCount.toLocaleString()} Rows • {dataset.columnCount} Columns
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Likely Business Purpose:
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {understanding.likelyPurpose}
              </p>
            </div>
          </div>

          {/* Column Semantics & Business Meaning Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                Column Semantics & Analytical Roles ({understanding.columnSemantics.length})
              </h4>
              <span className="text-xs text-slate-500">
                {understanding.metricColumns.length} Metrics • {understanding.dimensionColumns.length} Dimensions • {understanding.dateColumns.length} Temporal
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Column</th>
                    <th className="p-3">Detected Type</th>
                    <th className="p-3">Semantic Role</th>
                    <th className="p-3">Inferred Business Meaning</th>
                    <th className="p-3 text-right">Completeness</th>
                    <th className="p-3">Sample Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {understanding.columnSemantics.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{col.name}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 uppercase">
                        {col.type}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          col.semanticRole === 'metric' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          col.semanticRole === 'temporal' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          col.semanticRole === 'identifier' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {col.semanticRole}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-[11px]">
                        {col.businessMeaning}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {col.completeness}%
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 truncate max-w-[180px]">
                        {col.sampleValues.join(', ') || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Limitations Notice */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Dataset Scope & Limitations to Consider</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-900/90 leading-relaxed pl-1">
              {understanding.keyLimitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </div>

          {/* Advance Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setCurrentStage('plan')}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Review Analysis Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: ANALYSIS PLAN */}
      {currentStage === 'plan' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">{plan.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{plan.objective}</p>
            </div>

            <button
              onClick={handleExecutePlan}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Selected Tasks ({plan.tasks.filter((t) => t.enabled).length})</span>
            </button>
          </div>

          {/* Task Checklist */}
          <div className="space-y-3">
            {plan.tasks.map((task, idx) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  task.enabled ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50/70 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold font-mono text-purple-600">Task {idx + 1}</span>
                    <span className="font-extrabold text-slate-900 text-sm">{task.title}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono font-bold uppercase">
                      {task.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-slate-500">Columns:</span>{' '}
                      <span className="font-mono text-slate-700">{task.columnsRequired.join(', ')}</span>
                    </span>
                    <span>•</span>
                    <span className="italic text-slate-500">{task.explanation}</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 shrink-0">
                  <input
                    type="checkbox"
                    checked={task.enabled}
                    onChange={() => handleToggleTask(task.id)}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <span>Include</span>
                </label>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStage('understanding')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              ← Back to Understanding
            </button>

            <button
              onClick={handleExecutePlan}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Execute Calculations</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: CALCULATIONS & EXECUTION LOG */}
      {currentStage === 'calculations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
                <h3 className="font-bold text-sm text-white">Deterministic Execution Engine Active</h3>
              </div>
              <span className="text-xs font-mono text-purple-300 font-bold">{executionProgress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${executionProgress}%` }}
              />
            </div>

            {/* Terminal Style Execution Log */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-purple-300 space-y-1.5 max-h-60 overflow-y-auto">
              {executionLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Calculations executed entirely client-side against raw data. No hallucinations or unvalidated logic.</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setCurrentStage('findings')}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>View Business Findings</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 4: BUSINESS FINDINGS & EVIDENCE */}
      {currentStage === 'findings' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Finding Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
            {findings.map((f, idx) => (
              <button
                key={f.id}
                onClick={() => setSelectedFindingId(f.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  activeFinding?.id === f.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Finding {idx + 1}</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">
                  ({f.category.replace('_', ' ')})
                </span>
              </button>
            ))}
          </div>

          {/* Active Finding Card */}
          {activeFinding && (
            <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-6">
              {/* Finding Header */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                      {activeFinding.category.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{activeFinding.confidence}</span>
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    Columns: <strong>{activeFinding.columnsUsed.join(', ')}</strong>
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  {activeFinding.headline}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeFinding.summary}
                </p>
              </div>

              {/* Supporting Numbers KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeFinding.supportingNumbers.map((num, i) => (
                  <div key={i} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                      {num.label}
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-black text-slate-900 font-mono">{num.value}</span>
                      {num.trend === 'up' && <span className="text-xs text-emerald-600 font-bold">▲</span>}
                      {num.trend === 'down' && <span className="text-xs text-rose-600 font-bold">▼</span>}
                    </div>
                    {num.sublabel && (
                      <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                        {num.sublabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline Visual Chart (if available) */}
              {activeFinding.chartData && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                      <span>{activeFinding.chartData.title}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {activeFinding.chartData.type} visualization
                    </span>
                  </div>

                  {/* Responsive SVG Bar / Line Chart */}
                  {activeFinding.chartData.type === 'bar' && (
                    <div className="h-44 flex items-end gap-2 pt-4 px-2">
                      {activeFinding.chartData.labels.map((lbl, idx) => {
                        const val = activeFinding.chartData!.values[idx];
                        const maxVal = Math.max(...activeFinding.chartData!.values) || 1;
                        const heightPct = Math.max(8, (val / maxVal) * 100);

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                            <span className="text-[9px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatMetricNumber(val)}
                            </span>
                            <div
                              className="w-full bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t-md hover:from-purple-700 hover:to-indigo-600 transition-all cursor-pointer shadow-2xs"
                              style={{ height: `${heightPct}%` }}
                              title={`${lbl}: ${formatMetricNumber(val)}`}
                            />
                            <span className="text-[10px] text-slate-500 truncate w-full text-center mt-1">
                              {lbl}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeFinding.chartData.type === 'line' && (
                    <div className="h-44 flex items-end gap-3 pt-4 px-2">
                      {activeFinding.chartData.labels.map((lbl, idx) => {
                        const val = activeFinding.chartData!.values[idx];
                        const maxVal = Math.max(...activeFinding.chartData!.values) || 1;
                        const heightPct = Math.max(10, (val / maxVal) * 100);

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[9px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatMetricNumber(val)}
                            </span>
                            <div className="w-full flex items-center justify-center relative" style={{ height: `${heightPct}%` }}>
                              <div className="w-1 bg-purple-200 h-full absolute" />
                              <div className="w-3 h-3 bg-purple-600 border-2 border-white rounded-full shadow-xs relative z-10 group-hover:scale-125 transition-transform" />
                            </div>
                            <span className="text-[10px] text-slate-500 truncate w-full text-center mt-1">
                              {lbl}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Supporting Evidence Table */}
              {activeFinding.evidenceTable && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                    Supporting Calculation Evidence:
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          {activeFinding.evidenceTable.headers.map((h, i) => (
                            <th key={i} className="p-2.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-800">
                        {activeFinding.evidenceTable.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 truncate max-w-[200px]">
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

              {/* Why It Matters & Actionable Recommendation Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Why It Matters */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Why This Finding Matters</span>
                  </div>
                  <p className="text-xs text-blue-950/80 leading-relaxed">
                    {activeFinding.whyItMatters}
                  </p>
                </div>

                {/* Practical Recommendation */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                    <span>Actionable Recommendation</span>
                  </div>
                  <p className="text-xs text-emerald-950/80 leading-relaxed font-medium">
                    {activeFinding.recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Follow-Up Inquiries */}
          {followUpQuestions.length > 0 && (
            <div className="p-5 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Suggested Follow-up Analytical Inquiries</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {followUpQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (onAskFollowUpQuestion) {
                        onAskFollowUpQuestion(q);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-100/70 border border-purple-200 rounded-xl text-xs font-medium text-purple-900 transition-colors shadow-2xs cursor-pointer group"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-3 h-3 text-purple-400 group-hover:text-purple-700 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation to Recommendations */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStage('plan')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              ← Review Plan
            </button>

            <button
              onClick={() => setCurrentStage('recommendations')}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>View Executive Action Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 5: STRATEGIC RECOMMENDATIONS */}
      {currentStage === 'recommendations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Strategic Recommendations Roadmap
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Prioritized interventions directly grounded in empirical dataset findings.
              </p>
            </div>

            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Download Recommendations</span>
            </button>
          </div>

          {/* Priority Recommendation Cards */}
          <div className="space-y-4">
            {findings.map((f, idx) => (
              <div
                key={f.id}
                className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3 hover:border-purple-200 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black">
                      {idx + 1}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Recommendation based on: {f.title}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono font-bold uppercase">
                    Data-Backed
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800 font-medium">
                  {f.recommendation}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                  <div>
                    <span className="font-bold text-slate-700">Supporting Signal:</span>{' '}
                    <span>{f.headline}</span>
                  </div>
                  <span className="font-mono text-purple-700 font-bold shrink-0">
                    Source Columns: {f.columnsUsed.join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Return & Review */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStage('findings')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              ← Back to Findings & Evidence
            </button>

            <button
              onClick={handleRunFullAnalysis}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rerun Agent Analysis</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
