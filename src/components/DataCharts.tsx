import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Layers, 
  Activity, 
  Table2, 
  Sparkles, 
  TrendingUp, 
  ArrowUpDown, 
  Info, 
  Download,
  Check,
  CircleDot
} from 'lucide-react';
import type { Dataset } from '../types/data';
import { formatMetricNumber } from '../utils/dataAnalyzer';

export type ChartType = 
  | 'bar' 
  | 'line' 
  | 'pie' 
  | 'donut' 
  | 'area' 
  | 'scatter' 
  | 'stacked-bar' 
  | 'histogram' 
  | 'table';

interface DataChartsProps {
  dataset: Dataset;
}

interface ChartRecommendation {
  type: ChartType;
  label: string;
  reason: string;
}

const PALETTE = [
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#0891b2', // cyan-600
  '#4f46e5', // indigo-600
  '#9333ea', // purple-600
  '#0d9488', // teal-600
  '#ea580c', // orange-600
  '#475569', // slate-600
  '#be185d', // pink-700
];

export const DataCharts: React.FC<DataChartsProps> = ({ dataset }) => {
  const { columns, data } = dataset;

  const numericCols = useMemo(() => columns.filter((c) => c.numericStats), [columns]);
  const catCols = useMemo(() => columns.filter((c) => c.type === 'string' || c.type === 'boolean' || c.categoryStats), [columns]);
  const dateCols = useMemo(() => columns.filter((c) => c.type === 'date' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('month') || c.name.toLowerCase().includes('year')), [columns]);

  // Default axes selections
  const defaultX = dateCols[0]?.name || catCols[0]?.name || columns[0]?.name || '';
  const defaultY = numericCols[0]?.name || '';
  const defaultStack = catCols[1]?.name || catCols[0]?.name || '';

  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>(defaultX);
  const [yAxisCol, setYAxisCol] = useState<string>(defaultY);
  const [stackCol, setStackCol] = useState<string>(defaultStack);
  const [aggregation, setAggregation] = useState<'sum' | 'average' | 'count' | 'min' | 'max'>('sum');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'none'>('desc');
  const [itemLimit, setItemLimit] = useState<number>(10);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    items: { label: string; value: string | number; color?: string }[];
  } | null>(null);

  // SVG dimensions
  const svgWidth = 840;
  const svgHeight = 380;
  const margin = { top: 30, right: 30, bottom: 65, left: 75 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // Compute recommendation based on dataset structure and selected columns
  const recommendation = useMemo<ChartRecommendation>(() => {
    const xMeta = columns.find((c) => c.name === xAxisCol);
    const yMeta = columns.find((c) => c.name === yAxisCol);

    const isXDate = xMeta?.type === 'date' || xAxisCol.toLowerCase().includes('date') || xAxisCol.toLowerCase().includes('time') || xAxisCol.toLowerCase().includes('month');
    const isXNumeric = xMeta?.type === 'number';
    const isYNumeric = yMeta?.type === 'number';

    if (isXNumeric && isYNumeric && xAxisCol !== yAxisCol) {
      return {
        type: 'scatter',
        label: 'Scatter Plot',
        reason: 'Both X and Y are continuous numerical metrics — ideal for correlation and covariance analysis.',
      };
    }

    if (isXDate && isYNumeric) {
      return {
        type: 'line',
        label: 'Line Chart',
        reason: 'X-axis represents temporal/date intervals — optimal for tracking chronological progression and trends.',
      };
    }

    if (xMeta && xMeta.uniqueCount <= 6 && isYNumeric && aggregation === 'sum') {
      return {
        type: 'donut',
        label: 'Donut Chart',
        reason: `Few distinct segments (${xMeta.uniqueCount}) — excellent for part-to-whole market share distribution.`,
      };
    }

    if (selectedChartType === 'histogram' || (!isYNumeric && isXNumeric)) {
      return {
        type: 'histogram',
        label: 'Histogram',
        reason: 'Displays frequency density and distribution spread for single numerical metrics.',
      };
    }

    return {
      type: 'bar',
      label: 'Bar Chart',
      reason: 'Categorical dimensions vs numeric metrics — best for clear ranking and magnitude comparisons.',
    };
  }, [columns, xAxisCol, yAxisCol, aggregation, selectedChartType]);

  // Quick preset data lenses
  const presets = useMemo(() => {
    const list: { label: string; type: ChartType; x: string; y: string; agg: 'sum' | 'average' | 'count'; reason: string }[] = [];

    // 1. Bar Chart Preset
    const firstCat = catCols[0]?.name;
    const firstNum = numericCols[0]?.name;
    if (firstCat && firstNum) {
      list.push({
        label: `📊 ${firstCat} by ${firstNum}`,
        type: 'bar',
        x: firstCat,
        y: firstNum,
        agg: 'sum',
        reason: 'Magnitude ranking by category',
      });
    }

    // 2. Line Chart Preset (Date trend)
    const firstDate = dateCols[0]?.name;
    if (firstDate && firstNum) {
      list.push({
        label: `📈 Trend: ${firstDate} vs ${firstNum}`,
        type: 'line',
        x: firstDate,
        y: firstNum,
        agg: 'sum',
        reason: 'Chronological trendline',
      });
    }

    // 3. Donut / Pie share
    const smallCat = catCols.find((c) => c.uniqueCount >= 2 && c.uniqueCount <= 6)?.name || firstCat;
    if (smallCat && firstNum) {
      list.push({
        label: `🍩 ${smallCat} Share`,
        type: 'donut',
        x: smallCat,
        y: firstNum,
        agg: 'sum',
        reason: 'Proportional share breakdown',
      });
    }

    // 4. Scatter Plot (Correlation)
    if (numericCols.length >= 2) {
      list.push({
        label: `🎯 ${numericCols[0].name} vs ${numericCols[1].name}`,
        type: 'scatter',
        x: numericCols[0].name,
        y: numericCols[1].name,
        agg: 'sum',
        reason: 'Metric correlation & scatter',
      });
    }

    // 5. Histogram
    if (firstNum) {
      list.push({
        label: `📶 ${firstNum} Spread`,
        type: 'histogram',
        x: firstNum,
        y: firstNum,
        agg: 'count',
        reason: 'Distribution frequency bins',
      });
    }

    return list;
  }, [catCols, numericCols, dateCols]);

  // Aggregated data for discrete chart types (bar, line, pie, donut, area, table)
  const aggregatedData = useMemo(() => {
    if (!xAxisCol || data.length === 0) return [];

    const map = new Map<string, { values: number[]; count: number }>();

    for (const row of data) {
      const rawX = row[xAxisCol];
      const xKey = rawX !== null && rawX !== undefined && rawX !== '' ? String(rawX) : '(Blank)';
      const rawY = yAxisCol ? Number(row[yAxisCol]) : 0;
      const numY = isNaN(rawY) ? 0 : rawY;

      if (!map.has(xKey)) {
        map.set(xKey, { values: [], count: 0 });
      }
      const entry = map.get(xKey)!;
      entry.count += 1;
      if (yAxisCol && row[yAxisCol] !== null && row[yAxisCol] !== undefined && !isNaN(Number(row[yAxisCol]))) {
        entry.values.push(numY);
      }
    }

    let items = Array.from(map.entries()).map(([label, record]) => {
      let value = 0;
      if (aggregation === 'count') {
        value = record.count;
      } else if (record.values.length === 0) {
        value = 0;
      } else if (aggregation === 'sum') {
        value = record.values.reduce((a, b) => a + b, 0);
      } else if (aggregation === 'average') {
        value = record.values.reduce((a, b) => a + b, 0) / record.values.length;
      } else if (aggregation === 'min') {
        value = Math.min(...record.values);
      } else if (aggregation === 'max') {
        value = Math.max(...record.values);
      }
      return {
        label,
        value: Number(value.toFixed(2)),
        count: record.count,
      };
    });

    if (sortOrder === 'desc') {
      items.sort((a, b) => b.value - a.value);
    } else if (sortOrder === 'asc') {
      items.sort((a, b) => a.value - b.value);
    }

    if (itemLimit > 0 && items.length > itemLimit) {
      items = items.slice(0, itemLimit);
    }

    return items;
  }, [data, xAxisCol, yAxisCol, aggregation, sortOrder, itemLimit]);

  // Stacked Bar series data
  const stackedData = useMemo(() => {
    if (selectedChartType !== 'stacked-bar' || !xAxisCol || !stackCol || data.length === 0) {
      return { categories: [], segments: [], data: [], maxStack: 1 };
    }

    const segmentsSet = new Set<string>();
    const xMap = new Map<string, Record<string, number>>();

    for (const row of data) {
      const xKey = String(row[xAxisCol] ?? '(Blank)');
      const segKey = String(row[stackCol] ?? 'Other');
      segmentsSet.add(segKey);

      const numVal = yAxisCol ? Number(row[yAxisCol]) || 0 : 1;
      if (!xMap.has(xKey)) {
        xMap.set(xKey, {});
      }
      const segs = xMap.get(xKey)!;
      segs[segKey] = (segs[segKey] || 0) + (aggregation === 'count' ? 1 : numVal);
    }

    const segments = Array.from(segmentsSet).slice(0, 6);
    let categories = Array.from(xMap.entries()).map(([label, segs]) => {
      const total = Object.values(segs).reduce((a, b) => a + b, 0);
      return { label, segs, total };
    });

    if (sortOrder === 'desc') categories.sort((a, b) => b.total - a.total);
    else if (sortOrder === 'asc') categories.sort((a, b) => a.total - b.total);

    if (itemLimit > 0) categories = categories.slice(0, itemLimit);

    const maxStack = Math.max(...categories.map((c) => c.total), 1);

    return { categories, segments, maxStack };
  }, [selectedChartType, data, xAxisCol, stackCol, yAxisCol, aggregation, sortOrder, itemLimit]);

  // Scatter plot data (raw continuous pairs)
  const scatterData = useMemo(() => {
    if (selectedChartType !== 'scatter' || !xAxisCol || !yAxisCol || data.length === 0) return [];

    return data
      .map((row, idx) => {
        const x = Number(row[xAxisCol]);
        const y = Number(row[yAxisCol]);
        if (isNaN(x) || isNaN(y)) return null;
        return {
          id: idx,
          x,
          y,
          label: String(row[catCols[0]?.name || ''] ?? `#${idx + 1}`),
        };
      })
      .filter((d): d is { id: number; x: number; y: number; label: string } => d !== null);
  }, [selectedChartType, data, xAxisCol, yAxisCol, catCols]);

  // Histogram Binned Data
  const histogramData = useMemo(() => {
    if (selectedChartType !== 'histogram') return [];

    const targetCol = numericCols.find((c) => c.name === (yAxisCol || xAxisCol)) || numericCols[0];
    if (!targetCol || !targetCol.numericStats) return [];

    const { min, max } = targetCol.numericStats;
    const binCount = 7;
    const range = max - min || 1;
    const binWidth = range / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => {
      const start = min + i * binWidth;
      const end = i === binCount - 1 ? max : start + binWidth;
      return {
        start,
        end,
        label: `${formatMetricNumber(start)} – ${formatMetricNumber(end)}`,
        count: 0,
      };
    });

    for (const row of data) {
      const val = Number(row[targetCol.name]);
      if (isNaN(val)) continue;
      for (let i = 0; i < bins.length; i++) {
        if (i === bins.length - 1 ? val >= bins[i].start && val <= bins[i].end : val >= bins[i].start && val < bins[i].end) {
          bins[i].count++;
          break;
        }
      }
    }

    return bins;
  }, [selectedChartType, numericCols, yAxisCol, xAxisCol, data]);

  // Apply a smart preset
  const handleApplyPreset = (preset: typeof presets[0]) => {
    setSelectedChartType(preset.type);
    setXAxisCol(preset.x);
    setYAxisCol(preset.y);
    setAggregation(preset.agg);
  };

  // Calculations for Scales
  const maxAggValue = useMemo(() => {
    if (aggregatedData.length === 0) return 1;
    return Math.max(...aggregatedData.map((d) => d.value), 1);
  }, [aggregatedData]);

  const minAggValue = useMemo(() => {
    if (aggregatedData.length === 0) return 0;
    return Math.min(...aggregatedData.map((d) => d.value), 0);
  }, [aggregatedData]);

  const totalAggSum = useMemo(() => {
    return aggregatedData.reduce((acc, d) => acc + Math.max(d.value, 0), 0);
  }, [aggregatedData]);

  // Download chart data as CSV
  const handleExportChartCsv = () => {
    if (aggregatedData.length === 0) return;
    const csvContent = [
      `${xAxisCol},${aggregation.toUpperCase()}_of_${yAxisCol || 'Count'},Percentage`,
      ...aggregatedData.map(
        (d) =>
          `"${d.label.replace(/"/g, '""')}",${d.value},${totalAggSum > 0 ? ((d.value / totalAggSum) * 100).toFixed(1) : '0'}%`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chart_${selectedChartType}_${xAxisCol}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartTypes: { id: ChartType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { id: 'line', label: 'Line Chart', icon: LineChartIcon },
    { id: 'pie', label: 'Pie Chart', icon: PieChartIcon },
    { id: 'donut', label: 'Donut Chart', icon: CircleDot },
    { id: 'area', label: 'Area Chart', icon: TrendingUp },
    { id: 'scatter', label: 'Scatter Plot', icon: Activity },
    { id: 'stacked-bar', label: 'Stacked Bar', icon: Layers },
    { id: 'histogram', label: 'Histogram', icon: BarChart3 },
    { id: 'table', label: 'Table View', icon: Table2 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-6">
      {/* 1. Header with Title & Smart Recommendation Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Interactive Visual Analytics</h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Auto-Recommender Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Explore 9 chart types computed directly from real records with interactive tooltips
            </p>
          </div>
        </div>

        {/* Recommendation Pill */}
        <div className="p-2.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-xl flex items-center gap-2.5 max-w-md">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="text-xs leading-tight">
            <span className="font-bold text-blue-950">Recommended: {recommendation.label}</span>
            <p className="text-[11px] text-slate-600 line-clamp-1">{recommendation.reason}</p>
          </div>
          {selectedChartType !== recommendation.type && (
            <button
              onClick={() => setSelectedChartType(recommendation.type)}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
            >
              Switch
            </button>
          )}
        </div>
      </div>

      {/* 2. One-Click Smart Presets */}
      {presets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-600">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Smart Presets:</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium text-xs rounded-lg border border-slate-200 hover:border-blue-300 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                title={p.reason}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Chart Type Selection Tabs (All 9 Types) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
        {chartTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedChartType === type.id;
          const isRec = recommendation.type === type.id;

          return (
            <button
              key={type.id}
              onClick={() => setSelectedChartType(type.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{type.label}</span>
              {isRec && (
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  Best
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Interactive Configuration Toolbar */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* X Axis Column */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 uppercase text-[10px]">
              {selectedChartType === 'scatter' ? 'X Axis (Metric):' : 'X Dimension:'}
            </span>
            <select
              value={xAxisCol}
              onChange={(e) => setXAxisCol(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Y Axis Column (Metric) */}
          {selectedChartType !== 'pie' && selectedChartType !== 'donut' && selectedChartType !== 'histogram' && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase text-[10px]">
                {selectedChartType === 'scatter' ? 'Y Axis (Metric):' : 'Y Metric:'}
              </span>
              <select
                value={yAxisCol}
                onChange={(e) => setYAxisCol(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {numericCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stack Column (Only for Stacked Bar) */}
          {selectedChartType === 'stacked-bar' && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase text-[10px]">Segment By:</span>
              <select
                value={stackCol}
                onChange={(e) => setStackCol(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {catCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Aggregation Selector */}
          {selectedChartType !== 'scatter' && selectedChartType !== 'histogram' && (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase text-[10px]">Aggregation:</span>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-white text-[11px]">
                {(['sum', 'average', 'count', 'max'] as const).map((agg) => (
                  <button
                    key={agg}
                    onClick={() => setAggregation(agg)}
                    className={`px-2 py-1 rounded font-medium cursor-pointer transition-colors ${
                      aggregation === agg ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {agg === 'sum' ? 'Sum' : agg === 'average' ? 'Avg' : agg === 'count' ? 'Count' : 'Max'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Limit and Export */}
        <div className="flex items-center gap-2">
          {selectedChartType !== 'scatter' && selectedChartType !== 'histogram' && (
            <div className="flex items-center gap-1 text-slate-600">
              <span className="font-bold text-slate-400 text-[10px] uppercase">Limit:</span>
              <select
                value={itemLimit}
                onChange={(e) => setItemLimit(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={50}>Top 50</option>
              </select>
            </div>
          )}

          <button
            onClick={handleExportChartCsv}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs font-semibold text-xs cursor-pointer"
            title="Download aggregated data"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 5. Main Chart Canvas Area */}
      <div className="relative min-h-[380px] w-full flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200/80 overflow-hidden p-2">
        {/* Floating Tooltip */}
        {activeTooltip && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/90 text-white text-xs px-3 py-2 rounded-xl shadow-xl backdrop-blur-xs border border-slate-700/80 space-y-1 transition-all -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: activeTooltip.x, top: activeTooltip.y }}
          >
            <div className="font-bold border-b border-slate-700 pb-1 text-[11px] text-slate-200">
              {activeTooltip.title}
            </div>
            {activeTooltip.items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {it.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />}
                  <span className="text-slate-400">{it.label}:</span>
                </div>
                <span className="font-mono font-bold text-white">{it.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ---------------- CHART RENDERING ---------------- */}

        {/* A. BAR CHART */}
        {selectedChartType === 'bar' && aggregatedData.length > 0 && (
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[380px]">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = margin.top + chartHeight * (1 - ratio);
              const val = minAggValue + (maxAggValue - minAggValue) * ratio;
              return (
                <g key={ratio}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                    {formatMetricNumber(val)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {aggregatedData.map((d, idx) => {
              const barWidth = Math.min(chartWidth / aggregatedData.length - 12, 60);
              const x = margin.left + (idx + 0.5) * (chartWidth / aggregatedData.length) - barWidth / 2;
              const barHeight = Math.max(((d.value - Math.min(minAggValue, 0)) / (maxAggValue - Math.min(minAggValue, 0))) * chartHeight, 4);
              const y = margin.top + chartHeight - barHeight;
              const color = PALETTE[idx % PALETTE.length];

              return (
                <g
                  key={d.label}
                  className="cursor-pointer group"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      title: d.label,
                      items: [
                        { label: `${aggregation.toUpperCase()} ${yAxisCol || 'Value'}`, value: formatMetricNumber(d.value), color },
                        { label: 'Share', value: `${totalAggSum > 0 ? ((d.value / totalAggSum) * 100).toFixed(1) : '0'}%` },
                        { label: 'Row Count', value: d.count },
                      ],
                    });
                  }}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    fill={color}
                    className="transition-all duration-300 hover:brightness-110 hover:opacity-90"
                  />
                  {/* Value on top of bar if space */}
                  {barWidth >= 28 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#334155"
                      fontFamily="monospace"
                    >
                      {formatMetricNumber(d.value)}
                    </text>
                  )}
                  {/* X Axis Label */}
                  <text
                    x={x + barWidth / 2}
                    y={margin.top + chartHeight + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#475569"
                    className="select-none font-medium"
                    transform={`rotate(${aggregatedData.length > 7 ? -25 : 0}, ${x + barWidth / 2}, ${margin.top + chartHeight + 18})`}
                  >
                    {d.label.length > 14 ? `${d.label.substring(0, 12)}…` : d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* B. LINE CHART */}
        {selectedChartType === 'line' && aggregatedData.length > 0 && (
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[380px]">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = margin.top + chartHeight * (1 - ratio);
              const val = minAggValue + (maxAggValue - minAggValue) * ratio;
              return (
                <g key={ratio}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                    {formatMetricNumber(val)}
                  </text>
                </g>
              );
            })}

            {/* Polyline Path */}
            {(() => {
              const points = aggregatedData.map((d, i) => {
                const x = margin.left + (i + 0.5) * (chartWidth / aggregatedData.length);
                const y = margin.top + chartHeight - ((d.value - minAggValue) / (maxAggValue - minAggValue || 1)) * chartHeight;
                return `${x},${y}`;
              });

              return (
                <>
                  <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points.join(' ')} />
                  {/* Data Points */}
                  {aggregatedData.map((d, i) => {
                    const x = margin.left + (i + 0.5) * (chartWidth / aggregatedData.length);
                    const y = margin.top + chartHeight - ((d.value - minAggValue) / (maxAggValue - minAggValue || 1)) * chartHeight;
                    return (
                      <g
                        key={d.label}
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            title: d.label,
                            items: [
                              { label: `${aggregation.toUpperCase()} ${yAxisCol}`, value: formatMetricNumber(d.value), color: '#2563eb' },
                              { label: 'Observations', value: d.count },
                            ],
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                      >
                        <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="3" className="hover:scale-125 transition-transform" />
                        <text
                          x={x}
                          y={margin.top + chartHeight + 18}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#475569"
                          transform={`rotate(${aggregatedData.length > 7 ? -25 : 0}, ${x}, ${margin.top + chartHeight + 18})`}
                        >
                          {d.label.length > 12 ? `${d.label.substring(0, 10)}…` : d.label}
                        </text>
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        )}

        {/* C. AREA CHART */}
        {selectedChartType === 'area' && aggregatedData.length > 0 && (
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[380px]">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = margin.top + chartHeight * (1 - ratio);
              return <line key={ratio} x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />;
            })}

            {(() => {
              const points = aggregatedData.map((d, i) => {
                const x = margin.left + (i + 0.5) * (chartWidth / aggregatedData.length);
                const y = margin.top + chartHeight - ((d.value - minAggValue) / (maxAggValue - minAggValue || 1)) * chartHeight;
                return { x, y, ...d };
              });

              const firstX = points[0].x;
              const lastX = points[points.length - 1].x;
              const baseY = margin.top + chartHeight;

              const pathString = `M ${firstX} ${baseY} L ` + points.map((p) => `${p.x} ${p.y}`).join(' L ') + ` L ${lastX} ${baseY} Z`;

              return (
                <>
                  <path d={pathString} fill="url(#areaGradient)" />
                  <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
                  {points.map((p) => (
                    <circle
                      key={p.label}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#2563eb"
                      className="cursor-pointer hover:scale-150 transition-transform"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveTooltip({
                          x: rect.left,
                          y: rect.top,
                          title: p.label,
                          items: [{ label: `${aggregation.toUpperCase()} ${yAxisCol}`, value: formatMetricNumber(p.value), color: '#2563eb' }],
                        });
                      }}
                      onMouseLeave={() => setActiveTooltip(null)}
                    />
                  ))}
                </>
              );
            })()}
          </svg>
        )}

        {/* D. PIE & DONUT CHARTS */}
        {(selectedChartType === 'pie' || selectedChartType === 'donut') && aggregatedData.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full p-4">
            <svg viewBox="0 0 320 320" className="w-72 h-72 shrink-0">
              {(() => {
                const centerX = 160;
                const centerY = 160;
                const radius = 130;
                const innerRadius = selectedChartType === 'donut' ? 70 : 0;

                let cumulativeAngle = 0;

                return aggregatedData.map((d, i) => {
                  const sliceAngle = totalAggSum > 0 ? (d.value / totalAggSum) * 2 * Math.PI : 0;
                  const startAngle = cumulativeAngle;
                  const endAngle = cumulativeAngle + sliceAngle;
                  cumulativeAngle = endAngle;

                  const x1 = centerX + radius * Math.cos(startAngle);
                  const y1 = centerY + radius * Math.sin(startAngle);
                  const x2 = centerX + radius * Math.cos(endAngle);
                  const y2 = centerY + radius * Math.sin(endAngle);

                  const x1Inner = centerX + innerRadius * Math.cos(startAngle);
                  const y1Inner = centerY + innerRadius * Math.sin(startAngle);
                  const x2Inner = centerX + innerRadius * Math.cos(endAngle);
                  const y2Inner = centerY + innerRadius * Math.sin(endAngle);

                  const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
                  const color = PALETTE[i % PALETTE.length];

                  const pathData =
                    selectedChartType === 'donut'
                      ? `M ${x1Inner} ${y1Inner} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x2Inner} ${y2Inner} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner} Z`
                      : `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                  return (
                    <path
                      key={d.label}
                      d={pathData}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-200 hover:opacity-90 hover:scale-[1.02] origin-center"
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActiveTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                          title: d.label,
                          items: [
                            { label: 'Value', value: formatMetricNumber(d.value), color },
                            { label: 'Share', value: `${totalAggSum > 0 ? ((d.value / totalAggSum) * 100).toFixed(1) : 0}%` },
                            { label: 'Rows', value: d.count },
                          ],
                        });
                      }}
                      onMouseLeave={() => setActiveTooltip(null)}
                    />
                  );
                });
              })()}
              {selectedChartType === 'donut' && (
                <text x="160" y="155" textAnchor="middle" className="text-xs font-mono font-bold" fill="#0f172a">
                  <tspan x="160" dy="0" fontSize="16" fontWeight="bold">
                    {formatMetricNumber(totalAggSum)}
                  </tspan>
                  <tspan x="160" dy="16" fontSize="10" fill="#64748b">
                    Total Sum
                  </tspan>
                </text>
              )}
            </svg>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs max-w-sm">
              {aggregatedData.map((d, i) => (
                <div key={d.label} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-100">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 truncate" title={d.label}>
                      {d.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {totalAggSum > 0 ? ((d.value / totalAggSum) * 100).toFixed(1) : 0}% ({formatMetricNumber(d.value)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* E. SCATTER PLOT */}
        {selectedChartType === 'scatter' && (
          <div className="w-full">
            {scatterData.length > 0 ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[380px]">
                {(() => {
                  const minX = Math.min(...scatterData.map((d) => d.x));
                  const maxX = Math.max(...scatterData.map((d) => d.x)) || 1;
                  const minY = Math.min(...scatterData.map((d) => d.y));
                  const maxY = Math.max(...scatterData.map((d) => d.y)) || 1;

                  return (
                    <>
                      {/* Grid */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = margin.top + chartHeight * (1 - ratio);
                        const val = minY + (maxY - minY) * ratio;
                        return (
                          <g key={ratio}>
                            <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                              {formatMetricNumber(val)}
                            </text>
                          </g>
                        );
                      })}

                      {/* X Axis Ticks */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const x = margin.left + chartWidth * ratio;
                        const val = minX + (maxX - minX) * ratio;
                        return (
                          <g key={ratio}>
                            <text x={x} y={margin.top + chartHeight + 20} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">
                              {formatMetricNumber(val)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Scatter Dots */}
                      {scatterData.map((pt) => {
                        const cx = margin.left + ((pt.x - minX) / (maxX - minX || 1)) * chartWidth;
                        const cy = margin.top + chartHeight - ((pt.y - minY) / (maxY - minY || 1)) * chartHeight;

                        return (
                          <circle
                            key={pt.id}
                            cx={cx}
                            cy={cy}
                            r="5"
                            fill="#3b82f6"
                            fillOpacity="0.7"
                            stroke="#1d4ed8"
                            strokeWidth="1.5"
                            className="cursor-pointer hover:scale-150 hover:fill-rose-500 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveTooltip({
                                x: rect.left,
                                y: rect.top,
                                title: pt.label,
                                items: [
                                  { label: `X (${xAxisCol})`, value: formatMetricNumber(pt.x) },
                                  { label: `Y (${yAxisCol})`, value: formatMetricNumber(pt.y) },
                                ],
                              });
                            }}
                            onMouseLeave={() => setActiveTooltip(null)}
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Please select two numerical columns for X and Y axis to generate a Scatter plot.
              </div>
            )}
          </div>
        )}

        {/* F. STACKED BAR CHART */}
        {selectedChartType === 'stacked-bar' && stackedData.categories.length > 0 && (
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[380px]">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = margin.top + chartHeight * (1 - ratio);
              return (
                <g key={ratio}>
                  <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                    {formatMetricNumber(stackedData.maxStack * ratio)}
                  </text>
                </g>
              );
            })}

            {stackedData.categories.map((cat, idx) => {
              const barWidth = Math.min(chartWidth / stackedData.categories.length - 12, 50);
              const x = margin.left + (idx + 0.5) * (chartWidth / stackedData.categories.length) - barWidth / 2;
              let currentBottom = margin.top + chartHeight;

              return (
                <g key={cat.label}>
                  {stackedData.segments.map((seg, sIdx) => {
                    const segVal = cat.segs[seg] || 0;
                    if (segVal <= 0) return null;
                    const h = (segVal / stackedData.maxStack) * chartHeight;
                    const y = currentBottom - h;
                    currentBottom = y;
                    const color = PALETTE[sIdx % PALETTE.length];

                    return (
                      <rect
                        key={seg}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        fill={color}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            title: `${cat.label} • ${seg}`,
                            items: [
                              { label: 'Segment Value', value: formatMetricNumber(segVal), color },
                              { label: 'Total Category', value: formatMetricNumber(cat.total) },
                            ],
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                      />
                    );
                  })}
                  <text
                    x={x + barWidth / 2}
                    y={margin.top + chartHeight + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#475569"
                    transform={`rotate(${stackedData.categories.length > 7 ? -25 : 0}, ${x + barWidth / 2}, ${margin.top + chartHeight + 16})`}
                  >
                    {cat.label.substring(0, 10)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* G. HISTOGRAM */}
        {selectedChartType === 'histogram' && (
          <div className="w-full">
            {histogramData.length > 0 ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[380px]">
                {(() => {
                  const maxCount = Math.max(...histogramData.map((b) => b.count), 1);

                  return (
                    <>
                      {/* Grid */}
                      {[0, 0.5, 1].map((r) => {
                        const y = margin.top + chartHeight * (1 - r);
                        return (
                          <g key={r}>
                            <line x1={margin.left} y1={y} x2={svgWidth - margin.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" fontFamily="monospace">
                              {Math.round(maxCount * r)}
                            </text>
                          </g>
                        );
                      })}

                      {histogramData.map((bin, i) => {
                        const barWidth = chartWidth / histogramData.length - 8;
                        const x = margin.left + i * (chartWidth / histogramData.length) + 4;
                        const h = (bin.count / maxCount) * chartHeight;
                        const y = margin.top + chartHeight - h;

                        return (
                          <g
                            key={bin.label}
                            className="cursor-pointer"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveTooltip({
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                title: bin.label,
                                items: [{ label: 'Frequency (Count)', value: `${bin.count} records`, color: '#059669' }],
                              });
                            }}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            <rect x={x} y={y} width={barWidth} height={h} rx="4" fill="#059669" className="hover:fill-emerald-400 transition-colors" />
                            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#065f46" fontFamily="monospace">
                              {bin.count}
                            </text>
                            <text x={x + barWidth / 2} y={margin.top + chartHeight + 16} textAnchor="middle" fontSize="9" fill="#475569">
                              {bin.label}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Please select a numerical column to generate frequency histogram distribution.
              </div>
            )}
          </div>
        )}

        {/* H. TABLE VIEW */}
        {selectedChartType === 'table' && (
          <div className="w-full max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">{xAxisCol}</th>
                  <th className="p-3 text-right">
                    {aggregation.toUpperCase()} of {yAxisCol || 'Count'}
                  </th>
                  <th className="p-3 text-right">Share (%)</th>
                  <th className="p-3 text-right">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {aggregatedData.map((d, idx) => (
                  <tr key={d.label} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-semibold text-slate-900">{d.label}</td>
                    <td className="p-2.5 text-right font-bold text-blue-700">{formatMetricNumber(d.value)}</td>
                    <td className="p-2.5 text-right text-slate-600">
                      {totalAggSum > 0 ? ((d.value / totalAggSum) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="p-2.5 text-right text-slate-400">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Context Footer with Interpretation */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-500" />
          <span>
            Visualizing <strong>{aggregatedData.length || scatterData.length || histogramData.length} data elements</strong> from {dataset.rowCount.toLocaleString()} total rows.
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Tip: Hover over any bar, slice, point, or area segment to view exact numbers.
        </div>
      </div>
    </div>
  );
};
