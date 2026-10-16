/**
 * Evidence-based business insights generator for InsightPilot AI
 * Calculates genuine statistical patterns, concentration risks, outliers, and data health audits.
 * Does not invent data or fabricate assumptions.
 */

import type { BusinessInsight, Dataset } from '../types/data';
import { formatMetricNumber } from './dataAnalyzer';

export function generateEvidenceBasedInsights(dataset: Dataset): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const { rowCount, columnCount, columns, data, totalMissingCells, missingCellsPercentage, duplicateRowCount } = dataset;

  if (rowCount === 0) return [];

  // 1. Data Quality & Integrity Insight
  if (totalMissingCells === 0 && duplicateRowCount === 0) {
    insights.push({
      id: 'quality-pristine',
      category: 'quality',
      title: 'High-Integrity Clean Dataset',
      description: `All ${rowCount.toLocaleString()} records across ${columnCount} attributes are fully populated with 0 missing cells and 0 duplicate rows. Data is ready for immediate modeling and analysis.`,
      metricBadge: '100% Complete',
      severity: 'positive',
      impact: 'Zero data wrangling needed before reporting.',
    });
  } else {
    const issues: string[] = [];
    if (totalMissingCells > 0) {
      const topMissingCol = [...columns].sort((a, b) => b.missingCount - a.missingCount)[0];
      issues.push(`${totalMissingCells} missing cells (${missingCellsPercentage}% overall), led by "${topMissingCol.name}" with ${topMissingCol.missingCount} empty values (${topMissingCol.missingPercentage}%)`);
    }
    if (duplicateRowCount > 0) {
      issues.push(`${duplicateRowCount} exact duplicate rows (${((duplicateRowCount / rowCount) * 100).toFixed(1)}%)`);
    }

    insights.push({
      id: 'quality-audit',
      category: 'quality',
      title: 'Data Hygiene & Quality Notice',
      description: `Identified quality concerns: ${issues.join(' and ')}. Imputation or deduplication is advised prior to statistical inferences.`,
      metricBadge: `${missingCellsPercentage}% Missing`,
      severity: missingCellsPercentage > 10 || duplicateRowCount > 0 ? 'warning' : 'info',
      impact: 'May introduce bias into aggregations if left untreated.',
    });
  }

  // 2. Numerical Driver & Skewness Analysis
  const primaryNumeric = columns.find((c) => c.numericStats && (
    c.name.toLowerCase().includes('sales') ||
    c.name.toLowerCase().includes('revenue') ||
    c.name.toLowerCase().includes('profit') ||
    c.name.toLowerCase().includes('amount') ||
    c.name.toLowerCase().includes('salary') ||
    c.name.toLowerCase().includes('price') ||
    c.name.toLowerCase().includes('cost') ||
    c.name.toLowerCase().includes('total')
  )) || columns.find((c) => c.numericStats);

  if (primaryNumeric && primaryNumeric.numericStats) {
    const s = primaryNumeric.numericStats;
    const skewDiff = s.mean - s.median;
    const skewRatio = s.median !== 0 ? Math.abs(skewDiff) / Math.abs(s.median) : 0;

    let skewDescription = '';
    if (skewRatio > 0.25) {
      const direction = skewDiff > 0 ? 'right (positive)' : 'left (negative)';
      skewDescription = ` The distribution is heavily skewed to the ${direction}: mean (${formatMetricNumber(s.mean)}) diverges significantly from the median (${formatMetricNumber(s.median)}), indicating influential high-value transactions.`;
    } else {
      skewDescription = ` The distribution is relatively symmetrical, with mean (${formatMetricNumber(s.mean)}) closely tracking median (${formatMetricNumber(s.median)}).`;
    }

    insights.push({
      id: 'metric-volume',
      category: 'overview',
      title: `Core Financial / Quantitative Metric: ${primaryNumeric.name}`,
      description: `Across ${rowCount} rows, total cumulative ${primaryNumeric.name} is ${formatMetricNumber(s.sum)} with an average of ${formatMetricNumber(s.mean)} (Std Dev: ${formatMetricNumber(s.stdDev)}).${skewDescription}`,
      metricBadge: `Sum: ${formatMetricNumber(s.sum)}`,
      severity: 'info',
      impact: `Median baseline: ${formatMetricNumber(s.median)}`,
    });

    // 3. Outlier / Anomaly Detection
    const upperLimit = s.mean + 2.5 * s.stdDev;
    const lowerLimit = s.mean - 2.5 * s.stdDev;
    const highOutliers = data.filter((r) => typeof r[primaryNumeric.name] === 'number' && r[primaryNumeric.name] > upperLimit);
    const lowOutliers = data.filter((r) => typeof r[primaryNumeric.name] === 'number' && r[primaryNumeric.name] < lowerLimit);
    const totalOutliers = highOutliers.length + lowOutliers.length;

    if (totalOutliers > 0) {
      const topOutlierVal = highOutliers.length > 0 ? Math.max(...highOutliers.map((r) => r[primaryNumeric.name])) : s.max;
      insights.push({
        id: 'outliers-detected',
        category: 'outlier',
        title: `Statistical Outliers in ${primaryNumeric.name}`,
        description: `Found ${totalOutliers} record(s) (>2.5 standard deviations from the mean). The maximum observed value is ${formatMetricNumber(topOutlierVal)}, exceeding the statistical threshold of ${formatMetricNumber(upperLimit)}.`,
        metricBadge: `${totalOutliers} Outliers`,
        severity: 'warning',
        impact: `Extreme peak: ${formatMetricNumber(topOutlierVal)}`,
      });
    }
  }

  // 4. Pareto & Categorical Concentration Risk (80/20 Rule)
  const primaryCategory = columns.find((c) => c.categoryStats && c.uniqueCount > 1 && c.uniqueCount <= 30 && (
    c.name.toLowerCase().includes('category') ||
    c.name.toLowerCase().includes('segment') ||
    c.name.toLowerCase().includes('department') ||
    c.name.toLowerCase().includes('region') ||
    c.name.toLowerCase().includes('type') ||
    c.name.toLowerCase().includes('industry') ||
    c.name.toLowerCase().includes('tier')
  )) || columns.find((c) => c.categoryStats && c.uniqueCount > 1);

  if (primaryCategory && primaryCategory.categoryStats) {
    const stats = primaryCategory.categoryStats;
    const topVal = stats.topValues[0];
    const top2 = stats.topValues.slice(0, 2);
    const top2Share = top2.reduce((acc, v) => acc + v.percentage, 0);

    if (top2Share >= 60 && stats.uniqueCount >= 3) {
      insights.push({
        id: 'concentration-pareto',
        category: 'pareto',
        title: `High Concentration in "${primaryCategory.name}"`,
        description: `The top 2 categories ("${top2[0].value}" and "${top2[1]?.value}") represent ${top2Share.toFixed(1)}% of all observations (${top2.reduce((acc, v) => acc + v.count, 0)} out of ${rowCount} records).`,
        metricBadge: `${top2Share.toFixed(0)}% Share (Top 2)`,
        severity: 'warning',
        impact: 'Exposes the business to segment concentration dependency.',
      });
    } else {
      insights.push({
        id: 'category-spread',
        category: 'driver',
        title: `Categorical Distribution: ${primaryCategory.name}`,
        description: `Contains ${stats.uniqueCount} unique segments. The leading segment is "${topVal.value}" with ${topVal.count} entries (${topVal.percentage}% share), followed by "${stats.topValues[1]?.value || 'N/A'}" (${stats.topValues[1]?.percentage || 0}%).`,
        metricBadge: `Mode: ${topVal.value}`,
        severity: 'info',
        impact: `Evenly diversified across ${stats.uniqueCount} segments.`,
      });
    }
  }

  // 5. Cross-Metric Driver Insight (Categorical Grouping x Numeric Sum)
  if (primaryCategory && primaryNumeric) {
    const groupSums: Record<string, { sum: number; count: number }> = {};
    for (const row of data) {
      const cat = String(row[primaryCategory.name] ?? 'Unknown');
      const num = Number(row[primaryNumeric.name]);
      if (!isNaN(num)) {
        if (!groupSums[cat]) groupSums[cat] = { sum: 0, count: 0 };
        groupSums[cat].sum += num;
        groupSums[cat].count += 1;
      }
    }

    const sortedGroups = Object.entries(groupSums).sort((a, b) => b[1].sum - a[1].sum);
    if (sortedGroups.length >= 2) {
      const [topGroup, topMetrics] = sortedGroups[0];
      const totalSum = sortedGroups.reduce((acc, g) => acc + g[1].sum, 0);
      const topGroupShare = totalSum > 0 ? ((topMetrics.sum / totalSum) * 100).toFixed(1) : '0';

      insights.push({
        id: 'segment-driver',
        category: 'driver',
        title: `Top Performance Driver: ${topGroup}`,
        description: `Segment "${topGroup}" generates ${formatMetricNumber(topMetrics.sum)} in total ${primaryNumeric.name} (${topGroupShare}% of total portfolio) across ${topMetrics.count} transactions (avg ${formatMetricNumber(topMetrics.sum / topMetrics.count)} per record).`,
        metricBadge: `${topGroupShare}% of ${primaryNumeric.name}`,
        severity: 'positive',
        impact: `Highest yield segment in ${primaryCategory.name}`,
      });
    }
  }

  // 6. Actionable Prescriptive Recommendation
  insights.push({
    id: 'action-plan',
    category: 'action',
    title: 'Data-Driven Action Item',
    description: `1. Prioritize resources on the top volume segment (${primaryCategory ? primaryCategory.name : 'key dimension'}). 2. Inspect the ${totalMissingCells > 0 ? `${totalMissingCells} missing records` : 'outliers'} to verify data pipeline consistency. 3. Monitor performance variance across subsets.`,
    metricBadge: 'Actionable',
    severity: 'info',
    impact: 'Executive decision recommendation.',
  });

  return insights;
}
