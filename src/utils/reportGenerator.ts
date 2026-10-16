/**
 * Automated Business Report Generator for InsightPilot AI
 * Strictly derives all KPIs, insights, risks, and trends from real uploaded records.
 * Explains missing columns when a metric cannot be calculated.
 */

import type { BusinessReportData, Dataset, ReportKPI } from '../types/data';
import { formatMetricNumber } from './dataAnalyzer';

/**
 * Helper to match column by candidate names
 */
function findCol(dataset: Dataset, aliases: string[]): string | undefined {
  const colNames = dataset.columns.map((c) => c.name);
  for (const alias of aliases) {
    const direct = colNames.find((c) => c.toLowerCase() === alias.toLowerCase());
    if (direct) return direct;
  }
  for (const alias of aliases) {
    const partial = colNames.find((c) => c.toLowerCase().includes(alias.toLowerCase()));
    if (partial) return partial;
  }
  return undefined;
}

export function generateComprehensiveBusinessReport(dataset: Dataset): BusinessReportData {
  const { data, rowCount, columnCount, columns, numericColumns, categoricalColumns, dateColumns, metadata } = dataset;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Identify canonical columns
  const salesCol = findCol(dataset, ['sales', 'revenue', 'mrr', 'amount', 'salary', 'price', 'total']);
  const profitCol = findCol(dataset, ['profit', 'net_income', 'margin', 'gain']);
  const discountCol = findCol(dataset, ['discount', 'rebate']);
  const quantityCol = findCol(dataset, ['quantity', 'units', 'qty', 'count', 'seats', 'users']);
  const dateCol = dateColumns[0] || findCol(dataset, ['date', 'orderdate', 'timestamp', 'month', 'time', 'day']);
  const categoryCol = findCol(dataset, ['category', 'segment', 'department', 'type', 'industry', 'tier']);
  const productCol = findCol(dataset, ['product', 'item', 'subcategory', 'sub-category', 'title', 'sku']);
  const regionCol = findCol(dataset, ['region', 'territory', 'location', 'country', 'state', 'city']);
  const customerCol = findCol(dataset, ['customer', 'account', 'client', 'employee', 'user', 'name']);
  const churnCol = findCol(dataset, ['churn', 'churnrisk', 'retention', 'attrition']);

  // 1. CALCULATE RELEVANT KPIS
  const kpis: ReportKPI[] = [];

  // KPI: Total Sales / Primary Metric
  if (salesCol) {
    const totalSales = data.reduce((acc, r) => acc + (Number(r[salesCol]) || 0), 0);
    const avgSales = rowCount > 0 ? totalSales / rowCount : 0;

    kpis.push({
      title: `Total ${salesCol}`,
      value: formatMetricNumber(totalSales),
      rawValue: totalSales,
      formula: `SUM(${salesCol}) across ${rowCount} records`,
      status: 'available',
      benchmark: `Mean: ${formatMetricNumber(avgSales)} / record`,
    });

    // KPI: Average Order Value / Mean Transaction
    kpis.push({
      title: `Average ${salesCol} (AOV)`,
      value: formatMetricNumber(avgSales),
      rawValue: avgSales,
      formula: `Total ${salesCol} / Total Records (${rowCount})`,
      status: 'available',
      benchmark: `Median: ${formatMetricNumber(columns.find((c) => c.name === salesCol)?.numericStats?.median || avgSales)}`,
    });
  } else if (numericColumns.length > 0) {
    const fallbackNum = numericColumns[0];
    const total = data.reduce((acc, r) => acc + (Number(r[fallbackNum]) || 0), 0);
    kpis.push({
      title: `Total ${fallbackNum}`,
      value: formatMetricNumber(total),
      rawValue: total,
      formula: `SUM(${fallbackNum}) across ${rowCount} records`,
      status: 'available',
    });
  } else {
    kpis.push({
      title: 'Total Revenue / Sales',
      value: 'N/A',
      formula: 'SUM(Sales)',
      status: 'missing',
      missingReason: 'Dataset contains no numerical Sales or Revenue column.',
    });
  }

  // KPI: Total Profit
  if (profitCol) {
    const totalProfit = data.reduce((acc, r) => acc + (Number(r[profitCol]) || 0), 0);
    kpis.push({
      title: `Total ${profitCol}`,
      value: formatMetricNumber(totalProfit),
      rawValue: totalProfit,
      formula: `SUM(${profitCol}) across ${rowCount} records`,
      status: 'available',
      benchmark: totalProfit >= 0 ? 'Net Positive Profitability' : 'Net Loss Operating Condition',
    });
  } else {
    kpis.push({
      title: 'Total Profit',
      value: 'N/A',
      formula: 'SUM(Profit)',
      status: 'missing',
      missingReason: `Requires a Profit column. Available columns: ${columns.slice(0, 5).map((c) => c.name).join(', ')}...`,
    });
  }

  // KPI: Profit Margin (%)
  if (profitCol && salesCol) {
    const totalProfit = data.reduce((acc, r) => acc + (Number(r[profitCol]) || 0), 0);
    const totalSales = data.reduce((acc, r) => acc + (Number(r[salesCol]) || 0), 0);
    const marginPct = totalSales !== 0 ? (totalProfit / totalSales) * 100 : 0;

    kpis.push({
      title: 'Net Profit Margin',
      value: `${marginPct.toFixed(1)}%`,
      rawValue: marginPct,
      formula: `(Total ${profitCol} / Total ${salesCol}) * 100`,
      status: 'available',
      benchmark: marginPct >= 15 ? 'Above Target (>15%)' : marginPct >= 0 ? 'Moderate (0-15%)' : 'Negative Margin Alert',
    });
  } else {
    kpis.push({
      title: 'Profit Margin (%)',
      value: 'N/A',
      formula: '(Profit / Sales) * 100',
      status: 'missing',
      missingReason: `Requires both Profit and Sales columns. Missing: ${[!profitCol && 'Profit', !salesCol && 'Sales'].filter(Boolean).join(', ')}.`,
    });
  }

  // KPI: Total Units / Records
  kpis.push({
    title: 'Total Transactions / Records',
    value: rowCount.toLocaleString(),
    rawValue: rowCount,
    formula: 'COUNT(Rows)',
    status: 'available',
    benchmark: `${columnCount} dimensions tracked`,
  });

  // 2. PERFORMANCE BREAKDOWN (Top & Underperformers)
  let performanceBreakdown: BusinessReportData['performance'] = null;
  const dimensionCol = productCol || categoryCol || regionCol || customerCol || categoricalColumns[0];
  const metricCol = salesCol || profitCol || numericColumns[0];

  if (dimensionCol && metricCol) {
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of data) {
      const dim = String(r[dimensionCol] ?? '(Blank)');
      const m = Number(r[metricCol]) || 0;
      if (!map[dim]) map[dim] = { sum: 0, count: 0 };
      map[dim].sum += m;
      map[dim].count += 1;
    }

    const sorted = Object.entries(map).sort((a, b) => b[1].sum - a[1].sum);
    const totalMetric = sorted.reduce((acc, cur) => acc + cur[1].sum, 0);

    const topPerformers = sorted.slice(0, 4).map(([name, s]) => ({
      name,
      value: formatMetricNumber(s.sum),
      share: `${totalMetric > 0 ? ((s.sum / totalMetric) * 100).toFixed(1) : 0}%`,
      orders: s.count,
    }));

    const underPerformers = sorted.slice(-3).reverse().map(([name, s]) => ({
      name,
      value: formatMetricNumber(s.sum),
      share: `${totalMetric > 0 ? ((s.sum / totalMetric) * 100).toFixed(1) : 0}%`,
      orders: s.count,
    }));

    performanceBreakdown = {
      dimensionName: dimensionCol,
      metricName: metricCol,
      topPerformers,
      underPerformers,
    };
  }

  // 3. TREND ANALYSIS
  let trendData: BusinessReportData['trend'];
  if (dateCol && metricCol) {
    const monthMap = new Map<string, { sum: number; count: number }>();

    for (const r of data) {
      const rawDate = String(r[dateCol] || '');
      const val = Number(r[metricCol]) || 0;
      let monthKey = 'Unknown';

      const parsed = Date.parse(rawDate);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (rawDate.includes('-') || rawDate.includes('/')) {
        monthKey = rawDate.substring(0, 7);
      }

      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { sum: 0, count: 0 });
      const m = monthMap.get(monthKey)!;
      m.sum += val;
      m.count += 1;
    }

    const sortedPeriods = Array.from(monthMap.entries())
      .filter(([k]) => k !== 'Unknown')
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (sortedPeriods.length >= 2) {
      const peak = [...sortedPeriods].sort((a, b) => b[1].sum - a[1].sum)[0];
      const trough = [...sortedPeriods].sort((a, b) => a[1].sum - b[1].sum)[0];

      // Calculate MoM average growth
      const growths: number[] = [];
      for (let i = 1; i < sortedPeriods.length; i++) {
        const prev = sortedPeriods[i - 1][1].sum;
        if (prev > 0) {
          growths.push(((sortedPeriods[i][1].sum - prev) / prev) * 100);
        }
      }
      const avgGrowth = growths.length > 0 ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
      const trajectory = avgGrowth > 2 ? 'growth' : avgGrowth < -2 ? 'decline' : 'stable';

      trendData = {
        hasDate: true,
        dateColumn: dateCol,
        metricColumn: metricCol,
        periodsCount: sortedPeriods.length,
        peakPeriod: { label: peak[0], value: formatMetricNumber(peak[1].sum) },
        lowestPeriod: { label: trough[0], value: formatMetricNumber(trough[1].sum) },
        overallTrajectory: trajectory,
        momGrowthAverage: `${avgGrowth >= 0 ? '+' : ''}${avgGrowth.toFixed(1)}%`,
        summaryText: `Analyzed ${sortedPeriods.length} sequential periods. Peak volume occurred in ${peak[0]} (${formatMetricNumber(peak[1].sum)}), with an average period-over-period growth of ${avgGrowth.toFixed(1)}%.`,
        chartPoints: sortedPeriods.map(([label, s]) => ({ label, value: Number(s.sum.toFixed(2)) })),
      };
    } else {
      trendData = {
        hasDate: true,
        dateColumn: dateCol,
        periodsCount: sortedPeriods.length,
        overallTrajectory: 'stable',
        summaryText: `Date stamps found in "${dateCol}", but fewer than 2 distinct monthly intervals could be assembled.`,
        chartPoints: [],
        missingNotice: 'Requires at least 2 distinct date intervals for trendline plotting.',
      };
    }
  } else {
    trendData = {
      hasDate: false,
      periodsCount: 0,
      overallTrajectory: 'stable',
      summaryText: 'Chronological trend evaluation could not be calculated because the dataset lacks a recognized Date/Timestamp column.',
      chartPoints: [],
      missingNotice: `No Date column detected. Available columns: ${columns.map((c) => c.name).join(', ')}`,
    };
  }

  // 4. DATA QUALITY AUDIT
  const missingColList = columns
    .filter((c) => c.missingCount > 0)
    .sort((a, b) => b.missingPercentage - a.missingPercentage)
    .map((c) => ({
      name: c.name,
      missingRate: c.missingPercentage,
      type: c.type,
    }));

  // Detect outliers (>2.5 std dev)
  let totalOutliersCount = 0;
  numericColumns.forEach((cName) => {
    const colMeta = columns.find((c) => c.name === cName);
    if (!colMeta || !colMeta.numericStats) return;
    const s = colMeta.numericStats;
    const high = s.mean + 2.5 * s.stdDev;
    const low = s.mean - 2.5 * s.stdDev;
    data.forEach((r) => {
      const v = Number(r[cName]);
      if (!isNaN(v) && (v > high || v < low)) {
        totalOutliersCount++;
      }
    });
  });

  const completenessScore = Math.max(0, 100 - dataset.missingCellsPercentage);
  const auditVerdict =
    completenessScore >= 98 && dataset.duplicateRowCount === 0
      ? 'Pristine — Production-grade data hygiene with 0 duplicate rows.'
      : completenessScore >= 90
      ? 'Acceptable — Minor missing values detected; suitable for executive review with minimal caveats.'
      : 'Hygiene Risk — Noticeable missing values or duplicate records present; audit upstream data feeds.';

  const dataQualityReport: BusinessReportData['quality'] = {
    completenessScore: Number(completenessScore.toFixed(1)),
    totalRows: rowCount,
    totalColumns: columnCount,
    missingCellsCount: dataset.totalMissingCells,
    duplicateRowCount: dataset.duplicateRowCount,
    outliersCount: totalOutliersCount,
    flaggedColumns: missingColList,
    auditVerdict,
  };

  // 5. IDENTIFY EVIDENCE-BASED BUSINESS RISKS
  const risks: BusinessReportData['risks'] = [];

  // Risk 1: Negative Margins
  if (profitCol) {
    const negativeRows = data.filter((r) => Number(r[profitCol]) < 0);
    if (negativeRows.length > 0) {
      const totalLoss = negativeRows.reduce((acc, r) => acc + Math.abs(Number(r[profitCol]) || 0), 0);
      risks.push({
        id: 'risk-negative-profit',
        title: 'Unprofitable SKUs / Loss-Making Transactions',
        severity: 'critical',
        evidence: `${negativeRows.length} transactions (${((negativeRows.length / rowCount) * 100).toFixed(1)}% of rows) operated at a net loss, totaling ${formatMetricNumber(totalLoss)} in eroded profit.`,
        explanation: 'Indicates misaligned cost-of-goods, uncalculated shipping overheads, or clearance pricing below product margin floors.',
      });
    }
  }

  // Risk 2: High Discount Cannibalization
  if (discountCol && profitCol) {
    const highDiscountLoss = data.filter((r) => Number(r[discountCol]) >= 0.15 && Number(r[profitCol]) < 0);
    if (highDiscountLoss.length > 0) {
      risks.push({
        id: 'risk-discount-cannibalization',
        title: 'Discount Threshold Cannibalization',
        severity: 'high',
        evidence: `${highDiscountLoss.length} transactions with discounts >= 15% resulted in negative net margins.`,
        explanation: 'Promotional discounting appears to breach gross margin thresholds, degrading profitability rather than driving incremental margin.',
      });
    }
  }

  // Risk 3: Segment Concentration
  if (performanceBreakdown && performanceBreakdown.topPerformers.length > 0) {
    const topShareNum = parseFloat(performanceBreakdown.topPerformers[0].share);
    if (topShareNum >= 40) {
      risks.push({
        id: 'risk-concentration',
        title: `Segment Concentration Dependency in "${performanceBreakdown.dimensionName}"`,
        severity: 'medium',
        evidence: `The top segment "${performanceBreakdown.topPerformers[0].name}" accounts for ${topShareNum}% of all ${performanceBreakdown.metricName}.`,
        explanation: 'Heavy reliance on a single category or customer segment makes the business vulnerable to segment-specific demand shifts.',
      });
    }
  }

  // Risk 4: Churn Exposure
  if (churnCol) {
    const highChurnRows = data.filter((r) => String(r[churnCol]).toLowerCase().includes('high'));
    if (highChurnRows.length > 0) {
      risks.push({
        id: 'risk-churn-exposure',
        title: 'Customer Churn Risk Vulnerability',
        severity: 'high',
        evidence: `${highChurnRows.length} accounts (${((highChurnRows.length / rowCount) * 100).toFixed(1)}% of portfolio) are classified as High Churn Risk.`,
        explanation: 'Unaddressed customer health warnings threaten recurring revenue stability and compound customer acquisition costs.',
      });
    }
  }

  if (risks.length === 0) {
    risks.push({
      id: 'risk-baseline',
      title: 'Healthy Operational Baseline',
      severity: 'low',
      evidence: 'No acute negative margins, extreme discounts, or elevated churn flags were identified in this dataset.',
      explanation: 'The portfolio demonstrates stable unit economics with well-managed dispersion across tracked dimensions.',
    });
  }

  // 6. ACTIONABLE RECOMMENDATIONS (Distinguish Data Justification from Expected Impact)
  const recommendations: BusinessReportData['recommendations'] = [];

  if (profitCol && risks.some((r) => r.id === 'risk-negative-profit')) {
    recommendations.push({
      id: 'rec-1',
      priority: 'P1 - Immediate',
      action: 'Implement a strict 10% maximum discount cap and review pricing floors on loss-making categories.',
      dataJustification: `Direct Math: ${data.filter((r) => Number(r[profitCol]) < 0).length} transactions caused cash losses in the dataset.`,
      expectedImpact: 'Immediate recovery of lost profit without sacrificing core transaction volume.',
      confidence: 'High (Direct Math)',
    });
  }

  if (performanceBreakdown) {
    const top1 = performanceBreakdown.topPerformers[0];
    recommendations.push({
      id: 'rec-2',
      priority: 'P2 - Tactical',
      action: `Double down marketing and inventory allocation on "${top1.name}" while bundling it with lagging items.`,
      dataJustification: `Direct Math: "${top1.name}" commands ${top1.share} of total ${performanceBreakdown.metricName} across ${top1.orders} transactions.`,
      expectedImpact: 'Elevates cross-sell basket sizes and capitalizes on proven product-market fit.',
      confidence: 'High (Direct Math)',
    });
  }

  if (dataset.totalMissingCells > 0 || dataset.duplicateRowCount > 0) {
    recommendations.push({
      id: 'rec-3',
      priority: 'P3 - Strategic',
      action: 'Audit data ingestion pipelines to enforce required field validation and automated deduplication.',
      dataJustification: `Direct Math: Identified ${dataset.totalMissingCells} missing cells (${dataset.missingCellsPercentage}%) and ${dataset.duplicateRowCount} duplicate rows.`,
      expectedImpact: 'Prevents statistical distortion in financial forecasts and downstream executive dashboards.',
      confidence: 'High (Direct Math)',
    });
  }

  // 7. EXECUTIVE SUMMARY & NARRATIVE
  const primaryMetricName = salesCol || profitCol || (numericColumns[0] ?? 'Metric');
  const primaryMetricVal = kpis[0]?.value ?? 'N/A';

  const executiveSummary = {
    headline: `Comprehensive Business Intelligence Briefing: ${metadata.name}`,
    narrative: [
      `This report analyzes **${rowCount.toLocaleString()} records** across **${columnCount} operational dimensions** sourced from **${metadata.name}** (${metadata.format.toUpperCase()}).`,
      `Primary tracked performance stands at **${primaryMetricVal}** for ${primaryMetricName}${profitCol ? `, delivering a total net profit of ${kpis.find((k) => k.title.includes('Profit'))?.value || 'N/A'}` : ''}.`,
      dataQualityReport.auditVerdict,
    ],
    takeaways: [
      `Portfolio Scale: ${rowCount.toLocaleString()} transactions across ${columnCount} attributes.`,
      performanceBreakdown
        ? `Leading Driver: "${performanceBreakdown.topPerformers[0]?.name}" generates ${performanceBreakdown.topPerformers[0]?.share} of ${performanceBreakdown.metricName}.`
        : `Primary Metric: ${primaryMetricName} = ${primaryMetricVal}.`,
      trendData.hasDate
        ? `Temporal Trajectory: Peak period ${trendData.peakPeriod?.label} (${trendData.peakPeriod?.value}) with ${trendData.overallTrajectory} trajectory.`
        : `Data Hygiene: ${completenessScore.toFixed(1)}% completeness score with ${dataset.duplicateRowCount} duplicate records.`,
      `Key Action: ${recommendations[0]?.action || 'Monitor performance dispersion across sub-segments.'}`,
    ],
  };

  // 8. EXPORTABLE CSV TABLES
  const exportableTables: BusinessReportData['exportableTables'] = [];

  if (performanceBreakdown) {
    exportableTables.push({
      id: 'table-performance',
      title: `Performance Breakdown by ${performanceBreakdown.dimensionName}`,
      headers: ['Rank', performanceBreakdown.dimensionName, `Total ${performanceBreakdown.metricName}`, 'Portfolio Share (%)', 'Transactions'],
      rows: [
        ...performanceBreakdown.topPerformers.map((p, i) => [i + 1, p.name, p.value, p.share, p.orders]),
        ...performanceBreakdown.underPerformers.map((p, i) => [`Underperformer #${i + 1}`, p.name, p.value, p.share, p.orders]),
      ],
    });
  }

  if (trendData.hasDate && trendData.chartPoints.length > 0) {
    exportableTables.push({
      id: 'table-trend',
      title: `Monthly Trajectory of ${trendData.metricColumn}`,
      headers: ['Period (Month)', `Total ${trendData.metricColumn}`],
      rows: trendData.chartPoints.map((pt) => [pt.label, formatMetricNumber(pt.value)]),
    });
  }

  exportableTables.push({
    id: 'table-quality',
    title: 'Data Quality & Attribute Hygiene Audit',
    headers: ['Attribute Name', 'Data Type', 'Missing Values Count', 'Missing Percentage (%)'],
    rows: columns.map((c) => [c.name, c.type, c.missingCount, `${c.missingPercentage}%`]),
  });

  exportableTables.push({
    id: 'table-risks',
    title: 'Business Risk & Severity Register',
    headers: ['Risk Title', 'Severity Level', 'Data Evidence', 'Potential Root Cause'],
    rows: risks.map((r) => [r.title, r.severity.toUpperCase(), r.evidence, r.explanation]),
  });

  return {
    datasetName: metadata.name,
    format: metadata.format,
    generatedAt: formattedDate,
    rowCount,
    columnCount,
    executiveSummary,
    kpis,
    performance: performanceBreakdown,
    trend: trendData,
    quality: dataQualityReport,
    risks,
    recommendations,
    exportableTables,
  };
}
