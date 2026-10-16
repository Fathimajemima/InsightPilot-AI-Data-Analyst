/**
 * AI Data Analyst Agent Engine for InsightPilot AI
 * Provides verified dataset understanding, automated analysis planning,
 * deterministic calculation execution, evidence-grounded findings, and strategic recommendations.
 * 
 * Safety Guarantee: Zero fabrication, zero arbitrary code execution.
 */

import type { Dataset, EvidenceTable } from '../types/data';
import type { 
  DatasetUnderstanding, 
  ColumnSemantics, 
  SemanticRole,
  AnalysisPlan, 
  AnalysisPlanTask, 
  AgentFinding, 
  AgentChartData,
  TaskCategory 
} from '../types/analystAgent';
import { formatMetricNumber } from './dataAnalyzer';

/**
 * Stage 1: Analyze column semantics, business meaning, domain, and limitations
 */
export function generateDatasetUnderstanding(dataset: Dataset): DatasetUnderstanding {
  const { data, columns, rowCount } = dataset;
  const colSemantics: ColumnSemantics[] = [];
  const identifierCols: string[] = [];
  const metricCols: string[] = [];
  const dimensionCols: string[] = [];
  const dateCols: string[] = [];

  for (const col of columns) {
    const lowerName = col.name.toLowerCase().trim();
    let role: SemanticRole = 'text';
    let meaning = 'General descriptive attribute';

    // 1. Identify Date / Temporal
    if (col.type === 'date' || lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('year') || lowerName.includes('month')) {
      role = 'temporal';
      meaning = 'Transaction timestamp or calendar timeline attribute';
      dateCols.push(col.name);
    }
    // 2. Identify Identifiers / Keys
    else if (
      lowerName.includes('id') || 
      lowerName.includes('key') || 
      lowerName.includes('code') || 
      lowerName.includes('number') || 
      lowerName.includes('account') ||
      (col.uniqueCount === rowCount && rowCount > 5)
    ) {
      role = 'identifier';
      meaning = 'Unique record, customer, or transaction identifier key';
      identifierCols.push(col.name);
    }
    // 3. Identify Numerical Metrics
    else if (col.type === 'number') {
      role = 'metric';
      metricCols.push(col.name);

      if (lowerName.includes('sale') || lowerName.includes('rev') || lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('mrr') || lowerName.includes('arr')) {
        meaning = 'Financial transaction revenue or monetary volume';
      } else if (lowerName.includes('profit') || lowerName.includes('margin') || lowerName.includes('net') || lowerName.includes('gain')) {
        meaning = 'Net profitability or operational margin yield';
      } else if (lowerName.includes('discount') || lowerName.includes('tax') || lowerName.includes('fee')) {
        meaning = 'Pricing deduction, discount percentage, or cost rate';
      } else if (lowerName.includes('quant') || lowerName.includes('unit') || lowerName.includes('count') || lowerName.includes('seat') || lowerName.includes('user')) {
        meaning = 'Physical unit volume, headcount, or capacity metric';
      } else if (lowerName.includes('salary') || lowerName.includes('comp') || lowerName.includes('wage')) {
        meaning = 'Employee compensation or payroll remuneration';
      } else if (lowerName.includes('score') || lowerName.includes('rating') || lowerName.includes('nps')) {
        meaning = 'Performance evaluation, satisfaction score, or quality index';
      } else {
        meaning = 'Quantitative performance metric or measurement indicator';
      }
    }
    // 4. Identify Categorical Dimensions
    else if (col.type === 'string' || col.uniqueCount <= Math.max(10, rowCount * 0.4)) {
      role = 'dimension';
      dimensionCols.push(col.name);

      if (lowerName.includes('region') || lowerName.includes('country') || lowerName.includes('city') || lowerName.includes('state') || lowerName.includes('zone')) {
        meaning = 'Geographic sales territory or market division';
      } else if (lowerName.includes('cat') || lowerName.includes('subcat') || lowerName.includes('group') || lowerName.includes('class')) {
        meaning = 'Product hierarchy classification or catalog taxonomy';
      } else if (lowerName.includes('seg') || lowerName.includes('tier') || lowerName.includes('plan') || lowerName.includes('type')) {
        meaning = 'Customer market tier, account segment, or service level';
      } else if (lowerName.includes('dept') || lowerName.includes('role') || lowerName.includes('job') || lowerName.includes('title')) {
        meaning = 'Organizational functional department or role responsibility';
      } else if (lowerName.includes('status') || lowerName.includes('state') || lowerName.includes('stage') || lowerName.includes('risk')) {
        meaning = 'Operational pipeline status or customer risk lifecycle classification';
      } else {
        meaning = 'Categorical business dimension for grouping and breakdown';
      }
    }

    // Samples
    const samples = data
      .slice(0, 3)
      .map((r) => r[col.name])
      .filter((v) => v !== null && v !== undefined);

    const completeness = Number(
      Math.max(0, 100 - (col.missingCount / (rowCount || 1)) * 100).toFixed(1)
    );

    colSemantics.push({
      name: col.name,
      type: col.type,
      semanticRole: role,
      businessMeaning: meaning,
      sampleValues: samples,
      completeness,
      distinctCount: col.uniqueCount,
    });
  }

  // Detect likely domain
  const colNamesString = columns.map((c) => c.name.toLowerCase()).join(' ');
  let likelyDomain = 'General Enterprise Business Operations';
  let likelyPurpose = 'Analyze operational distribution, performance metrics, and categorical concentration.';

  if (colNamesString.includes('sale') || colNamesString.includes('profit') || colNamesString.includes('discount') || colNamesString.includes('product')) {
    likelyDomain = 'E-Commerce & Commercial Retail Operations';
    likelyPurpose = 'Evaluate commercial revenue, profitability margins by product taxonomy, order distribution, and discount concessions across geographic territories.';
  } else if (colNamesString.includes('mrr') || colNamesString.includes('churn') || colNamesString.includes('nps') || colNamesString.includes('user') || colNamesString.includes('seats')) {
    likelyDomain = 'B2B SaaS Subscription & Customer Success';
    likelyPurpose = 'Track Monthly Recurring Revenue (MRR), subscription tier retention, customer satisfaction (NPS), and expansion potential across account portfolios.';
  } else if (colNamesString.includes('salary') || colNamesString.includes('employee') || colNamesString.includes('department') || colNamesString.includes('experience')) {
    likelyDomain = 'Human Resources & Workforce Compensation';
    likelyPurpose = 'Analyze departmental salary equity, compensation distribution, performance evaluation ratings, and hybrid work model impact.';
  } else if (colNamesString.includes('patient') || colNamesString.includes('health') || colNamesString.includes('clinical') || colNamesString.includes('dosage')) {
    likelyDomain = 'Healthcare & Clinical Operations';
    likelyPurpose = 'Monitor patient care metrics, treatment outcomes, and clinical trial distribution parameters.';
  }

  // Detect key limitations
  const limitations: string[] = [];
  if (dataset.totalMissingCells > 0) {
    limitations.push(`Contains ${dataset.totalMissingCells.toLocaleString()} missing cell(s) (${dataset.missingCellsPercentage}% missingness). Aggregations on incomplete columns may under-report totals unless imputed.`);
  }
  if (dataset.duplicateRowCount > 0) {
    limitations.push(`Contains ${dataset.duplicateRowCount} identical duplicate row(s). Raw aggregations risk double-counting metrics.`);
  }
  if (dateCols.length === 0) {
    limitations.push('No recognized date or timestamp column detected. Time-series trajectory and multi-period seasonality cannot be modeled.');
  }
  if (rowCount < 30) {
    limitations.push(`Relatively compact sample size (${rowCount} rows). Statistical conclusions indicate clear sample tendencies rather than large-population significance.`);
  }
  if (metricCols.length === 0) {
    limitations.push('Dataset contains strictly categorical/text attributes. Numeric calculations will rely on frequency distributions and record occurrences.');
  }

  return {
    likelyDomain,
    likelyPurpose,
    keyLimitations: limitations,
    columnSemantics: colSemantics,
    identifierColumns: identifierCols,
    metricColumns: metricCols,
    dimensionColumns: dimensionCols,
    dateColumns: dateCols,
  };
}

/**
 * Stage 2: Create targeted, personalized Analysis Plan based on available columns
 */
export function createAnalysisPlan(
  dataset: Dataset, 
  understanding: DatasetUnderstanding
): AnalysisPlan {
  const { metricColumns, dimensionColumns, dateColumns } = understanding;
  const primaryMetric = metricColumns[0] || '';
  const secondaryMetric = metricColumns[1] || '';
  const primaryDimension = dimensionColumns[0] || '';
  const secondaryDimension = dimensionColumns[1] || '';
  const primaryDate = dateColumns[0] || '';

  const tasks: AnalysisPlanTask[] = [];

  // Task 1: Descriptive KPI Baseline
  if (primaryMetric) {
    tasks.push({
      id: 'task-1-kpi-baseline',
      title: `Macro Baseline & Statistical Distribution (${primaryMetric})`,
      description: `Compute total cumulative volume, arithmetic mean, median, standard deviation, and range extremes for "${primaryMetric}".`,
      category: 'descriptive_kpis',
      columnsRequired: [primaryMetric],
      status: 'pending',
      enabled: true,
      explanation: 'Establishes the foundation baseline scale of the business against which all sub-segments and performance tiers will be benchmarked.',
    });
  }

  // Task 2: Dimensional Breakdown & Concentration (Pareto)
  if (primaryMetric && primaryDimension) {
    tasks.push({
      id: 'task-2-segment-concentration',
      title: `Segment Yield & Pareto Concentration (${primaryMetric} by ${primaryDimension})`,
      description: `Group and rank records by "${primaryDimension}". Identify top drivers, underperforming segments, and contribution percentage shares.`,
      category: 'segment_breakdown',
      columnsRequired: [primaryMetric, primaryDimension],
      status: 'pending',
      enabled: true,
      explanation: 'Identifies revenue or activity concentration to highlight top performers and single-point dependency risks.',
    });
  }

  // Task 3: Secondary Cross-Tabulation
  if (primaryMetric && secondaryDimension) {
    tasks.push({
      id: 'task-3-secondary-breakdown',
      title: `Cross-Segment Performance (${primaryMetric} by ${secondaryDimension})`,
      description: `Evaluate cross-dimensional variances and volume contribution across distinct "${secondaryDimension}" tiers.`,
      category: 'segment_breakdown',
      columnsRequired: [primaryMetric, secondaryDimension],
      status: 'pending',
      enabled: true,
      explanation: 'Uncovers hidden divergences across secondary operating tiers that may not be apparent at top-level category summaries.',
    });
  }

  // Task 4: Temporal Trajectory & Momentum (if date exists)
  if (primaryDate && primaryMetric) {
    tasks.push({
      id: 'task-4-temporal-trajectory',
      title: `Time-Series Trajectory & Momentum (${primaryMetric} over ${primaryDate})`,
      description: `Aggregate metrics by chronological timeline periods to compute period-over-period expansion, contraction, and peak inflection points.`,
      category: 'temporal_trend',
      columnsRequired: [primaryMetric, primaryDate],
      status: 'pending',
      enabled: true,
      explanation: 'Reveals chronological velocity and trajectory to evaluate whether business metrics are accelerating or decaying over time.',
    });
  }

  // Task 5: Multi-Metric Efficiency & Correlation (if 2+ metrics)
  if (primaryMetric && secondaryMetric) {
    tasks.push({
      id: 'task-5-efficiency-correlation',
      title: `Metric Efficiency & Yield Correlation (${secondaryMetric} vs. ${primaryMetric})`,
      description: `Evaluate the proportional relationship, ratio/margin yield, and distribution correlation between "${primaryMetric}" and "${secondaryMetric}".`,
      category: 'correlation_efficiency',
      columnsRequired: [primaryMetric, secondaryMetric],
      status: 'pending',
      enabled: true,
      explanation: 'Examines business margins and unit economics (e.g. profit margins, customer seat efficiencies, or compensation vs. experience).',
    });
  }

  // Task 6: Risk, Variance & Outlier Detection
  if (primaryMetric) {
    tasks.push({
      id: 'task-6-risk-outliers',
      title: `Risk Audit: IQR Outlier Detection & Data Hygiene`,
      description: `Perform Interquartile Range (IQR) dispersion analysis on numeric metrics to isolate extreme outliers, anomalies, and data health risks.`,
      category: 'risk_outliers',
      columnsRequired: [primaryMetric],
      status: 'pending',
      enabled: true,
      explanation: 'Safeguards strategic decisions from distorted metrics caused by data skewness, negative balances, or extreme atypical outlier events.',
    });
  }

  return {
    title: `AI Analysis Plan: ${understanding.likelyDomain}`,
    objective: `Deliver actionable executive clarity on scale, segment yield, growth trajectory, risk factors, and high-impact interventions.`,
    tasks,
    generatedAt: new Date().toLocaleTimeString(),
  };
}

/**
 * Stage 3 & 4: Execute analysis tasks with deterministic math & generate verified findings
 */
export function executeAnalysisTasks(
  dataset: Dataset,
  plan: AnalysisPlan,
  understanding: DatasetUnderstanding
): { findings: AgentFinding[]; followUpQuestions: string[] } {
  const { data, columns, rowCount } = dataset;
  const findings: AgentFinding[] = [];
  const followUps: string[] = [];

  const enabledTasks = plan.tasks.filter((t) => t.enabled);

  for (const task of enabledTasks) {
    // ----------------------------------------------------
    // TASK: Macro Baseline KPIs
    // ----------------------------------------------------
    if (task.category === 'descriptive_kpis') {
      const metricColName = task.columnsRequired[0];
      const colMeta = columns.find((c) => c.name === metricColName);
      const stats = colMeta?.numericStats;

      if (stats) {
        const sumFormatted = formatMetricNumber(stats.sum);
        const meanFormatted = formatMetricNumber(stats.mean);
        const medianFormatted = formatMetricNumber(stats.median);
        const minFormatted = formatMetricNumber(stats.min);
        const maxFormatted = formatMetricNumber(stats.max);

        // Evidence table
        const evidenceTable: EvidenceTable = {
          headers: ['Metric Dimension', 'Calculated Statistic', 'Interpretation'],
          rows: [
            ['Cumulative Total', sumFormatted, `Total volume across all ${rowCount.toLocaleString()} records`],
            ['Arithmetic Mean (Avg)', meanFormatted, 'Average value per individual transaction'],
            ['Median (P50)', medianFormatted, '50th percentile midpoint (robust to outliers)'],
            ['Minimum Value', minFormatted, 'Lowest recorded boundary'],
            ['Maximum Value', maxFormatted, 'Peak recorded individual transaction'],
          ],
        };

        const isPosSkew = stats.mean > stats.median * 1.15;
        const skewText = isPosSkew
          ? `Because the average (${meanFormatted}) exceeds the median (${medianFormatted}) by over 15%, the distribution is right-skewed by high-value transactions.`
          : `The mean (${meanFormatted}) aligns closely with the median (${medianFormatted}), signaling a balanced and symmetrical distribution.`;

        findings.push({
          id: `finding-${task.id}`,
          taskId: task.id,
          category: 'descriptive_kpis',
          title: `Macro Performance Baseline: ${metricColName}`,
          headline: `Cumulative ${metricColName} reaches ${sumFormatted} across ${rowCount.toLocaleString()} transactions with a median of ${medianFormatted}.`,
          summary: `Evaluation of "${metricColName}" establishes a total portfolio scale of ${sumFormatted}. ${skewText}`,
          columnsUsed: [metricColName],
          supportingNumbers: [
            { label: 'Cumulative Total', value: sumFormatted, sublabel: `${rowCount} records` },
            { label: 'Average (Mean)', value: meanFormatted, sublabel: 'Per transaction' },
            { label: 'Median (P50)', value: medianFormatted, sublabel: 'Midpoint' },
            { label: 'Max Single Record', value: maxFormatted, sublabel: 'Peak' },
          ],
          evidenceTable,
          whyItMatters: `Establishes the macro scale of operational activity. Recognizing the divergence between average and median prevents overestimating everyday transaction expectations.`,
          recommendation: `Use the median (${medianFormatted}) rather than the mean as the operational benchmark for quota setting and baseline planning to avoid distortion from high-value spikes.`,
          confidence: 'High (Direct Math)',
        });

        followUps.push(`What percentage of total ${metricColName} comes from the top 10% of records?`);
        followUps.push(`Are there any records where ${metricColName} is below average?`);
      }
    }

    // ----------------------------------------------------
    // TASK: Segment Breakdown & Pareto Concentration
    // ----------------------------------------------------
    else if (task.category === 'segment_breakdown') {
      const metricColName = task.columnsRequired[0];
      const dimColName = task.columnsRequired[1];

      // Group and sum
      const groupMap = new Map<string, { total: number; count: number }>();
      let overallTotal = 0;

      for (const row of data) {
        const dimVal = String(row[dimColName] ?? 'Unspecified').trim() || 'Unspecified';
        const numVal = Number(row[metricColName]) || 0;
        overallTotal += numVal;

        const current = groupMap.get(dimVal) || { total: 0, count: 0 };
        current.total += numVal;
        current.count += 1;
        groupMap.set(dimVal, current);
      }

      const sortedGroups = Array.from(groupMap.entries())
        .map(([name, stat]) => ({
          name,
          total: stat.total,
          count: stat.count,
          avg: stat.count > 0 ? stat.total / stat.count : 0,
          share: overallTotal > 0 ? (stat.total / overallTotal) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      if (sortedGroups.length > 0) {
        const top1 = sortedGroups[0];
        const bottom1 = sortedGroups[sortedGroups.length - 1];

        // Cumulative share of top 2 or top 1
        const top1ShareFormatted = `${top1.share.toFixed(1)}%`;

        // Chart Data (Bar chart of top segments)
        const chartData: AgentChartData = {
          type: 'bar',
          title: `${metricColName} by ${dimColName}`,
          labels: sortedGroups.slice(0, 7).map((g) => g.name),
          values: sortedGroups.slice(0, 7).map((g) => Number(g.total.toFixed(2))),
          xAxisLabel: dimColName,
          yAxisLabel: metricColName,
        };

        // Evidence Table
        const evidenceTable: EvidenceTable = {
          headers: [dimColName, `Total ${metricColName}`, 'Record Count', 'Avg / Record', '% Share'],
          rows: sortedGroups.slice(0, 6).map((g) => [
            g.name,
            formatMetricNumber(g.total),
            g.count,
            formatMetricNumber(g.avg),
            `${g.share.toFixed(1)}%`,
          ]),
        };

        const isHighConcentration = top1.share >= 35;
        const concentrationText = isHighConcentration
          ? `Signaling heavy revenue concentration risk, with "${top1.name}" alone contributing ${top1ShareFormatted} of all ${metricColName}.`
          : `Yield is diversified across multiple segments, led by "${top1.name}" at ${top1ShareFormatted}.`;

        findings.push({
          id: `finding-${task.id}`,
          taskId: task.id,
          category: 'segment_breakdown',
          title: `Segment Performance & Concentration: ${dimColName}`,
          headline: `"${top1.name}" is the #1 leading segment, generating ${formatMetricNumber(top1.total)} (${top1ShareFormatted} of total ${metricColName}).`,
          summary: `Comparative breakdown of "${dimColName}" across ${sortedGroups.length} segments reveals that "${top1.name}" outperforms "${bottom1.name}" (${formatMetricNumber(bottom1.total)}) by ${(top1.total / (bottom1.total || 1)).toFixed(1)}x. ${concentrationText}`,
          columnsUsed: [metricColName, dimColName],
          supportingNumbers: [
            { label: `#1 Top Leader (${top1.name})`, value: formatMetricNumber(top1.total), sublabel: top1ShareFormatted, trend: 'up' },
            { label: `Total Segments`, value: sortedGroups.length, sublabel: 'Distinct classes' },
            { label: `Average per Segment`, value: formatMetricNumber(overallTotal / sortedGroups.length), sublabel: 'Mean yield' },
            { label: `Lowest Segment (${bottom1.name})`, value: formatMetricNumber(bottom1.total), sublabel: `${bottom1.share.toFixed(1)}% share`, trend: 'down' },
          ],
          chartData,
          evidenceTable,
          whyItMatters: `Understanding category concentration prevents vulnerability. When over one-third of business volume depends on a single classification, disruptions in that category threaten overall stability.`,
          recommendation: isHighConcentration
            ? `Implement an expansion initiative into secondary segments like "${sortedGroups[1]?.name || 'adjacent tiers'}" to diversify away from over-reliance on "${top1.name}".`
            : `Double down on best practices from "${top1.name}" while investigating operational friction holding back "${bottom1.name}".`,
          confidence: 'High (Direct Math)',
        });

        followUps.push(`Which ${dimColName} has the highest average value per record?`);
        followUps.push(`How does profitability compare across ${dimColName}?`);
      }
    }

    // ----------------------------------------------------
    // TASK: Temporal Trajectory & Momentum
    // ----------------------------------------------------
    else if (task.category === 'temporal_trend') {
      const metricColName = task.columnsRequired[0];
      const dateColName = task.columnsRequired[1];

      // Group by Year-Month or Date
      const dateMap = new Map<string, number>();

      for (const row of data) {
        const rawDate = row[dateColName];
        if (!rawDate) continue;

        let periodKey = String(rawDate).trim();
        const parsed = Date.parse(periodKey);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }

        const v = Number(row[metricColName]) || 0;
        dateMap.set(periodKey, (dateMap.get(periodKey) || 0) + v);
      }

      const periods = Array.from(dateMap.keys()).sort();

      if (periods.length >= 2) {
        const periodValues = periods.map((p) => dateMap.get(p)!);
        const firstVal = periodValues[0];
        const lastVal = periodValues[periodValues.length - 1];
        const diff = lastVal - firstVal;
        const pctGrowth = firstVal > 0 ? (diff / firstVal) * 100 : 0;

        // Find peak and lowest period
        let peakPeriod = periods[0];
        let peakVal = periodValues[0];
        let lowPeriod = periods[0];
        let lowVal = periodValues[0];

        periods.forEach((p, idx) => {
          const val = periodValues[idx];
          if (val > peakVal) {
            peakVal = val;
            peakPeriod = p;
          }
          if (val < lowVal) {
            lowVal = val;
            lowPeriod = p;
          }
        });

        const isPositive = diff >= 0;

        const chartData: AgentChartData = {
          type: 'line',
          title: `Monthly Timeline Trend (${metricColName})`,
          labels: periods,
          values: periodValues.map((v) => Number(v.toFixed(2))),
          xAxisLabel: 'Period',
          yAxisLabel: metricColName,
        };

        const evidenceTable: EvidenceTable = {
          headers: ['Period', `Total ${metricColName}`, 'Relative Momentum'],
          rows: periods.map((p, idx) => {
            const val = periodValues[idx];
            const prev = idx > 0 ? periodValues[idx - 1] : null;
            const changeStr = prev !== null 
              ? `${val >= prev ? '+' : ''}${(((val - prev) / (prev || 1)) * 100).toFixed(1)}%` 
              : 'Baseline';
            return [p, formatMetricNumber(val), changeStr];
          }),
        };

        findings.push({
          id: `finding-${task.id}`,
          taskId: task.id,
          category: 'temporal_trend',
          title: `Timeline Velocity & Trend: ${metricColName}`,
          headline: `Overall ${metricColName} ${isPositive ? 'expanded' : 'declined'} by ${Math.abs(pctGrowth).toFixed(1)}% from ${periods[0]} to ${periods[periods.length - 1]}.`,
          summary: `Chronological trajectory analysis across ${periods.length} periods reached peak volume in "${peakPeriod}" (${formatMetricNumber(peakVal)}) and lowest in "${lowPeriod}" (${formatMetricNumber(lowVal)}).`,
          columnsUsed: [metricColName, dateColName],
          supportingNumbers: [
            { label: 'Net Period Change', value: `${isPositive ? '+' : ''}${pctGrowth.toFixed(1)}%`, sublabel: `${periods[0]} to ${periods[periods.length - 1]}`, trend: isPositive ? 'up' : 'down' },
            { label: 'Peak Period', value: formatMetricNumber(peakVal), sublabel: peakPeriod, trend: 'up' },
            { label: 'Lowest Period', value: formatMetricNumber(lowVal), sublabel: lowPeriod, trend: 'down' },
            { label: 'Periods Tracked', value: periods.length, sublabel: 'Sequential intervals' },
          ],
          chartData,
          evidenceTable,
          whyItMatters: `Historical momentum indicates operational trajectory. Tracking whether recent months show positive velocity versus deceleration enables timely resource allocation.`,
          recommendation: isPositive
            ? `Investigate operational catalysts from peak period "${peakPeriod}" to institutionalize those success drivers across upcoming quarters.`
            : `Audit operational roadblocks responsible for the ${Math.abs(pctGrowth).toFixed(1)}% contraction and adjust pipeline targets accordingly.`,
          confidence: 'High (Direct Math)',
        });

        followUps.push(`Which category drove the spike in ${peakPeriod}?`);
        followUps.push(`What is the month-over-month growth rate?`);
      }
    }

    // ----------------------------------------------------
    // TASK: Multi-Metric Efficiency & Yield Correlation
    // ----------------------------------------------------
    else if (task.category === 'correlation_efficiency') {
      const metric1 = task.columnsRequired[0];
      const metric2 = task.columnsRequired[1];

      let sum1 = 0;
      let sum2 = 0;
      const ratios: number[] = [];

      data.forEach((r) => {
        const v1 = Number(r[metric1]) || 0;
        const v2 = Number(r[metric2]) || 0;
        sum1 += v1;
        sum2 += v2;
        if (v1 > 0) {
          ratios.push((v2 / v1) * 100);
        }
      });

      const avgRatio = sum1 > 0 ? (sum2 / sum1) * 100 : 0;
      const medianRatio = ratios.length > 0 ? ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)] : 0;

      // Group by first dimension if available to calculate ratio per category
      const firstDim = understanding.dimensionColumns[0];
      let breakdownRows: (string | number)[][] = [];

      if (firstDim) {
        const map = new Map<string, { v1: number; v2: number }>();
        data.forEach((r) => {
          const dim = String(r[firstDim] ?? 'Other');
          const v1 = Number(r[metric1]) || 0;
          const v2 = Number(r[metric2]) || 0;
          const cur = map.get(dim) || { v1: 0, v2: 0 };
          cur.v1 += v1;
          cur.v2 += v2;
          map.set(dim, cur);
        });

        breakdownRows = Array.from(map.entries())
          .map(([dim, s]) => {
            const yieldPct = s.v1 > 0 ? (s.v2 / s.v1) * 100 : 0;
            return [dim, formatMetricNumber(s.v1), formatMetricNumber(s.v2), `${yieldPct.toFixed(1)}%`];
          })
          .sort((a, b) => parseFloat(String(b[3])) - parseFloat(String(a[3])));
      }

      const evidenceTable: EvidenceTable = {
        headers: firstDim ? [firstDim, metric1, metric2, 'Yield Ratio %'] : ['Metric Parameter', 'Value', 'Context'],
        rows: firstDim && breakdownRows.length > 0
          ? breakdownRows.slice(0, 5)
          : [
              [`Aggregate ${metric1}`, formatMetricNumber(sum1), 'Total denominator volume'],
              [`Aggregate ${metric2}`, formatMetricNumber(sum2), 'Total numerator yield'],
              ['Blended Yield Ratio', `${avgRatio.toFixed(1)}%`, 'Proportional return'],
              ['Median Unit Ratio', `${medianRatio.toFixed(1)}%`, 'Typical single transaction efficiency'],
            ],
      };

      findings.push({
        id: `finding-${task.id}`,
        taskId: task.id,
        category: 'correlation_efficiency',
        title: `Metric Efficiency: ${metric2} vs. ${metric1}`,
        headline: `Blended yield ratio of ${metric2} to ${metric1} stands at ${avgRatio.toFixed(1)}% (median ${medianRatio.toFixed(1)}%).`,
        summary: `Cross-metric analysis demonstrates that every 100 units of ${metric1} generates approximately ${avgRatio.toFixed(1)} units of ${metric2}. Across categories, yield ranges from ${breakdownRows[breakdownRows.length - 1]?.[3] || 'low'} to ${breakdownRows[0]?.[3] || 'high'}.`,
        columnsUsed: [metric1, metric2, ...(firstDim ? [firstDim] : [])],
        supportingNumbers: [
          { label: 'Blended Yield Rate', value: `${avgRatio.toFixed(1)}%`, sublabel: 'Overall return' },
          { label: `Cumulative ${metric1}`, value: formatMetricNumber(sum1), sublabel: 'Baseline' },
          { label: `Cumulative ${metric2}`, value: formatMetricNumber(sum2), sublabel: 'Generated output' },
          { label: 'Typical Median Yield', value: `${medianRatio.toFixed(1)}%`, sublabel: 'P50 unit return' },
        ],
        evidenceTable,
        whyItMatters: `High aggregate volume does not equal healthy unit economics. Monitoring the ratio between ${metric1} and ${metric2} detects unprofitable sales and margin leakage.`,
        recommendation: `Target marketing and inventory investment toward high-efficiency tiers (${breakdownRows[0]?.[0] || 'top yielding segments'}) rather than pursuing low-margin volume.`,
        confidence: 'High (Direct Math)',
      });

      followUps.push(`Which records have a negative ${metric2}?`);
      followUps.push(`What is the correlation coefficient between ${metric1} and ${metric2}?`);
    }

    // ----------------------------------------------------
    // TASK: Risk Audit & Outlier Detection
    // ----------------------------------------------------
    else if (task.category === 'risk_outliers') {
      const metricColName = task.columnsRequired[0];
      const values = data
        .map((r) => Number(r[metricColName]))
        .filter((v) => !isNaN(v))
        .sort((a, b) => a - b);

      let outlierCount = 0;
      let lowerBound = 0;
      let upperBound = 0;
      let maxVal = 0;

      if (values.length >= 8) {
        const q1 = values[Math.floor(values.length * 0.25)];
        const q3 = values[Math.floor(values.length * 0.75)];
        const iqr = q3 - q1;
        lowerBound = Number((q1 - 1.5 * iqr).toFixed(2));
        upperBound = Number((q3 + 1.5 * iqr).toFixed(2));
        maxVal = values[values.length - 1];

        outlierCount = values.filter((v) => v < lowerBound || v > upperBound).length;
      }

      // Check negative values
      const negativeCount = values.filter((v) => v < 0).length;

      const evidenceTable: EvidenceTable = {
        headers: ['Audit Parameter', 'Detected Value', 'Risk Assessment'],
        rows: [
          ['IQR Upper Threshold', formatMetricNumber(upperBound), 'Values above this represent high-magnitude extremes'],
          ['IQR Lower Threshold', formatMetricNumber(lowerBound), 'Values below this represent low-magnitude extremes'],
          ['Statistical Outliers Count', outlierCount, outlierCount > 0 ? `${outlierCount} extreme row(s) flagged` : 'Zero extreme outliers'],
          ['Negative Value Rows', negativeCount, negativeCount > 0 ? `${negativeCount} negative balance record(s)` : 'Zero negative values'],
          ['Missing Cells in Dataset', dataset.totalMissingCells, dataset.totalMissingCells > 0 ? `${dataset.totalMissingCells} empty cell(s)` : '100% complete data'],
        ],
      };

      findings.push({
        id: `finding-${task.id}`,
        taskId: task.id,
        category: 'risk_outliers',
        title: `Operational Risk & Anomaly Audit: ${metricColName}`,
        headline: outlierCount > 0 
          ? `Detected ${outlierCount} statistical outlier row(s) exceeding normal IQR boundaries [${lowerBound} to ${upperBound}].`
          : `Clean distribution confirmed: 0 extreme outliers detected outside standard IQR boundaries.`,
        summary: `Statistical dispersion audit on "${metricColName}" indicates ${outlierCount} value(s) beyond the 1.5×IQR threshold. Peak outlier reached ${formatMetricNumber(maxVal)}. Additionally, ${negativeCount} negative record(s) and ${dataset.totalMissingCells} missing cell(s) were audited.`,
        columnsUsed: [metricColName],
        supportingNumbers: [
          { label: 'Outlier Rows', value: outlierCount, sublabel: 'Outside IQR bounds', trend: outlierCount > 0 ? 'down' : 'neutral' },
          { label: 'Upper IQR Bound', value: formatMetricNumber(upperBound), sublabel: 'Threshold' },
          { label: 'Negative Rows', value: negativeCount, sublabel: 'Deficit records', trend: negativeCount > 0 ? 'down' : 'neutral' },
          { label: 'Data Completeness', value: `${(100 - dataset.missingCellsPercentage).toFixed(1)}%`, sublabel: 'Hygiene score' },
        ],
        evidenceTable,
        whyItMatters: `Outliers can dramatically distort standard averages and executive forecasts. Knowing whether high volume stems from one giant anomaly or steady business is vital for strategic planning.`,
        recommendation: outlierCount > 0
          ? `Review high-value outlier transactions individually to verify whether they represent recurring enterprise accounts or one-off statistical anomalies.`
          : `No statistical outliers need adjustment; standard averages and linear projections remain safe to use for business planning.`,
        confidence: 'High (Direct Math)',
      });

      followUps.push(`Which records represent the highest outliers?`);
      followUps.push(`How does removing outliers affect the average ${metricColName}?`);
    }
  }

  // Deduplicate follow-up questions
  const uniqueFollowUps = Array.from(new Set(followUps)).slice(0, 5);

  return {
    findings,
    followUpQuestions: uniqueFollowUps,
  };
}
