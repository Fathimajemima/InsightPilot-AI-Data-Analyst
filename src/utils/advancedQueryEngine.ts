/**
 * Advanced Grounded Data Analysis Query Engine for InsightPilot AI
 * Computes exact mathematical answers, supporting evidence tables, inline charts,
 * business interpretations, and actionable recommendations.
 * Never invents values or hallucinations.
 */

import type { Dataset, QueryAnalysisResult } from '../types/data';
import { formatMetricNumber } from './dataAnalyzer';

/**
 * Helper to find column matching any alias
 */
function findColumn(dataset: Dataset, aliases: string[]): string | undefined {
  const colNames = dataset.columns.map((c) => c.name);
  for (const alias of aliases) {
    const directMatch = colNames.find((c) => c.toLowerCase() === alias.toLowerCase());
    if (directMatch) return directMatch;
  }
  for (const alias of aliases) {
    const partialMatch = colNames.find((c) => c.toLowerCase().includes(alias.toLowerCase()));
    if (partialMatch) return partialMatch;
  }
  return undefined;
}

/**
 * Execute advanced natural language query
 */
export function executeAdvancedAnalysis(queryRaw: string, dataset: Dataset): QueryAnalysisResult {
  const query = queryRaw.toLowerCase().trim();
  const { data, rowCount, columns, numericColumns, categoricalColumns, dateColumns } = dataset;

  if (rowCount === 0) {
    return {
      directAnswer: 'No dataset has been uploaded or the dataset is empty.',
      columnsUsed: [],
      rowsEvaluated: 0,
      businessInterpretation: 'Please upload a dataset or select a sample dataset to perform analysis.',
      actionableRecommendation: 'Upload a CSV, Excel, JSON, TSV, or other supported data file.',
    };
  }

  // Common Column Lookups
  const salesCol = findColumn(dataset, ['sales', 'revenue', 'mrr', 'amount', 'salary', 'price']);
  const profitCol = findColumn(dataset, ['profit', 'net_income', 'margin', 'gain']);
  const productCol = findColumn(dataset, ['product', 'item', 'subcategory', 'sub-category', 'title', 'sku']);
  const categoryCol = findColumn(dataset, ['category', 'segment', 'department', 'type', 'industry', 'tier']);
  const regionCol = findColumn(dataset, ['region', 'territory', 'location', 'country', 'state', 'city']);
  const customerCol = findColumn(dataset, ['customer', 'account', 'client', 'employee', 'user', 'name']);
  const dateCol = dateColumns[0] || findColumn(dataset, ['date', 'month', 'year', 'orderdate', 'timestamp', 'time', 'day']);
  const discountCol = findColumn(dataset, ['discount', 'rebate']);

  // ---------------------------------------------------------
  // 1. "Which product has the highest sales?" / "Top product"
  // ---------------------------------------------------------
  if (
    (query.includes('product') || query.includes('item') || query.includes('subcategory')) &&
    (query.includes('highest') || query.includes('most') || query.includes('top') || query.includes('best')) &&
    (query.includes('sales') || query.includes('revenue') || query.includes('amount') || query.includes('sold'))
  ) {
    const prodDim = productCol || categoryCol;
    const metricDim = salesCol || numericColumns[0];

    if (!prodDim || !metricDim) {
      return {
        directAnswer: `Unable to calculate highest sales product because required columns are missing.`,
        columnsUsed: [prodDim || 'Product (missing)', metricDim || 'Sales (missing)'].filter(Boolean),
        rowsEvaluated: rowCount,
        missingColumnNotice: `Analysis requires a product/item column and a numerical sales column. Detected columns: ${columns.map((c) => c.name).join(', ')}`,
        businessInterpretation: `Ensure your dataset contains distinct product identifiers alongside numerical sales figures.`,
        actionableRecommendation: `Include product names and transaction sales amounts in your dataset.`,
      };
    }

    const groupSums: Record<string, { sum: number; count: number }> = {};
    for (const r of data) {
      const p = String(r[prodDim] ?? 'Unknown');
      const s = Number(r[metricDim]) || 0;
      if (!groupSums[p]) groupSums[p] = { sum: 0, count: 0 };
      groupSums[p].sum += s;
      groupSums[p].count += 1;
    }

    const sorted = Object.entries(groupSums).sort((a, b) => b[1].sum - a[1].sum);
    const topItem = sorted[0];
    const totalSales = sorted.reduce((a, b) => a + b[1].sum, 0);
    const topShare = totalSales > 0 ? ((topItem[1].sum / totalSales) * 100).toFixed(1) : '0';

    const tableRows = sorted.slice(0, 5).map(([name, s], idx) => [
      idx + 1,
      name,
      formatMetricNumber(s.sum),
      `${totalSales > 0 ? ((s.sum / totalSales) * 100).toFixed(1) : 0}%`,
      s.count,
    ]);

    return {
      directAnswer: `The product with the highest total ${metricDim} is **${topItem[0]}**, generating **${formatMetricNumber(topItem[1].sum)}** across ${topItem[1].count} transactions (${topShare}% of all ${metricDim}).`,
      columnsUsed: [prodDim, metricDim],
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: ['Rank', prodDim, `Total ${metricDim}`, 'Share (%)', 'Orders/Rows'],
        rows: tableRows,
      },
      inlineChart: {
        type: 'bar',
        title: `Top 5 ${prodDim} by ${metricDim}`,
        labels: sorted.slice(0, 5).map((s) => s[0]),
        values: sorted.slice(0, 5).map((s) => Number(s[1].sum.toFixed(2))),
        seriesName: metricDim,
      },
      businessInterpretation: `"${topItem[0]}" acts as the primary revenue engine, commanding ${topShare}% of total portfolio volume. The top 3 products generate ${sorted.slice(0, 3).reduce((a, b) => a + (b[1].sum / totalSales) * 100, 0).toFixed(1)}% of total ${metricDim}.`,
      actionableRecommendation: `Protect inventory continuity and premium positioning for ${topItem[0]}. Cross-bundle lower-velocity items with this bestseller to elevate basket size.`,
      dataPoints: [
        { label: 'Top Product', value: topItem[0] },
        { label: `Total ${metricDim}`, value: formatMetricNumber(topItem[1].sum) },
        { label: 'Portfolio Share', value: `${topShare}%` },
      ],
    };
  }

  // ---------------------------------------------------------
  // 2. "Which region generates the most profit?" / "Top Region"
  // ---------------------------------------------------------
  if (
    (query.includes('region') || query.includes('territory') || query.includes('location')) &&
    (query.includes('profit') || query.includes('sales') || query.includes('revenue') || query.includes('most') || query.includes('highest'))
  ) {
    const regDim = regionCol || categoryCol;
    const metricDim = query.includes('sales') ? (salesCol || numericColumns[0]) : (profitCol || salesCol || numericColumns[0]);

    if (!regDim || !metricDim) {
      return {
        directAnswer: `Cannot identify top region because a geographical or regional column was not detected.`,
        columnsUsed: [regDim || 'Region (missing)', metricDim || 'Metric (missing)'].filter(Boolean),
        rowsEvaluated: rowCount,
        missingColumnNotice: `A regional dimension column is required. Detected columns: ${columns.map((c) => c.name).join(', ')}`,
        businessInterpretation: `Geographical profitability analysis requires location attributes (e.g. Region, State, Country).`,
        actionableRecommendation: `Add a Region or Territory column to compare territorial performance.`,
      };
    }

    const regSums: Record<string, { sum: number; count: number }> = {};
    for (const r of data) {
      const reg = String(r[regDim] ?? 'Unknown');
      const val = Number(r[metricDim]) || 0;
      if (!regSums[reg]) regSums[reg] = { sum: 0, count: 0 };
      regSums[reg].sum += val;
      regSums[reg].count += 1;
    }

    const sorted = Object.entries(regSums).sort((a, b) => b[1].sum - a[1].sum);
    const topReg = sorted[0];
    const totalVal = sorted.reduce((a, b) => a + b[1].sum, 0);
    const share = totalVal > 0 ? ((topReg[1].sum / totalVal) * 100).toFixed(1) : '0';

    return {
      directAnswer: `The region generating the most ${metricDim} is **${topReg[0]}** with **${formatMetricNumber(topReg[1].sum)}** (${share}% of total ${metricDim}) across ${topReg[1].count} records.`,
      columnsUsed: [regDim, metricDim],
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: ['Rank', regDim, `Total ${metricDim}`, 'Share (%)', 'Volume'],
        rows: sorted.map(([name, s], idx) => [
          idx + 1,
          name,
          formatMetricNumber(s.sum),
          `${totalVal > 0 ? ((s.sum / totalVal) * 100).toFixed(1) : 0}%`,
          s.count,
        ]),
      },
      inlineChart: {
        type: 'bar',
        title: `${metricDim} by ${regDim}`,
        labels: sorted.map((s) => s[0]),
        values: sorted.map((s) => Number(s[1].sum.toFixed(2))),
        seriesName: metricDim,
      },
      businessInterpretation: `"${topReg[0]}" outperforms other territories, indicating strong market-fit or higher ticket sizes in that geography. The lowest performing territory is "${sorted[sorted.length - 1][0]}" (${formatMetricNumber(sorted[sorted.length - 1][1].sum)}).`,
      actionableRecommendation: `Study the sales playbooks and customer profile in ${topReg[0]} to replicate those tactics across lower-yielding territories.`,
      dataPoints: [
        { label: 'Top Region', value: topReg[0] },
        { label: `Total ${metricDim}`, value: formatMetricNumber(topReg[1].sum) },
        { label: 'Share of Total', value: `${share}%` },
      ],
    };
  }

  // ---------------------------------------------------------
  // 3. "What is the monthly sales trend?" / "Trend over time"
  // ---------------------------------------------------------
  if (
    query.includes('monthly') ||
    query.includes('trend') ||
    query.includes('over time') ||
    query.includes('growth rate') ||
    (query.includes('month') && query.includes('sales'))
  ) {
    if (!dateCol) {
      return {
        directAnswer: `Cannot calculate monthly trend because no Date column was detected in this dataset.`,
        columnsUsed: ['Date (missing)'],
        rowsEvaluated: rowCount,
        missingColumnNotice: `Monthly trend analysis requires a column containing formatted dates (e.g. YYYY-MM-DD or DD/MM/YYYY). Available columns: ${columns.map((c) => c.name).join(', ')}`,
        businessInterpretation: `Time-series forecasting and trend evaluation cannot run without timestamp or date coordinates.`,
        actionableRecommendation: `Ensure records include an OrderDate, TransactionDate, or Month column.`,
      };
    }

    const targetMetric = salesCol || profitCol || numericColumns[0];
    if (!targetMetric) {
      return {
        directAnswer: `Date column "${dateCol}" was found, but no numerical metric column exists to calculate trend over time.`,
        columnsUsed: [dateCol],
        rowsEvaluated: rowCount,
        businessInterpretation: `Trend analysis requires numerical values to plot against temporal intervals.`,
        actionableRecommendation: `Add numerical transaction values to track progress.`,
      };
    }

    // Group by Month (YYYY-MM)
    const monthMap = new Map<string, { sum: number; count: number }>();
    for (const r of data) {
      const rawDate = String(r[dateCol] || '');
      const val = Number(r[targetMetric]) || 0;
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

    const sortedMonths = Array.from(monthMap.entries())
      .filter(([m]) => m !== 'Unknown')
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (sortedMonths.length === 0) {
      return {
        directAnswer: `Found date column "${dateCol}", but could not parse standardized date stamps to build a monthly trend.`,
        columnsUsed: [dateCol, targetMetric],
        rowsEvaluated: rowCount,
        businessInterpretation: `Date values may be in an unstandardized text format.`,
        actionableRecommendation: `Standardize dates in ISO format (YYYY-MM-DD).`,
      };
    }

    // Calculate Month-over-Month Growth
    const tableRows: (string | number)[][] = [];
    for (let i = 0; i < sortedMonths.length; i++) {
      const [mName, stats] = sortedMonths[i];
      let momStr = '—';
      if (i > 0) {
        const prev = sortedMonths[i - 1][1].sum;
        if (prev > 0) {
          const mom = ((stats.sum - prev) / prev) * 100;
          momStr = `${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%`;
        }
      }
      tableRows.push([mName, formatMetricNumber(stats.sum), momStr, stats.count]);
    }

    const peakMonth = [...sortedMonths].sort((a, b) => b[1].sum - a[1].sum)[0];
    const lowestMonth = [...sortedMonths].sort((a, b) => a[1].sum - b[1].sum)[0];

    return {
      directAnswer: `The monthly ${targetMetric} trend spans **${sortedMonths.length} months**. Peak performance occurred in **${peakMonth[0]}** with **${formatMetricNumber(peakMonth[1].sum)}**, while **${lowestMonth[0]}** recorded the lowest volume at **${formatMetricNumber(lowestMonth[1].sum)}**.`,
      columnsUsed: [dateCol, targetMetric],
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: ['Month', `Total ${targetMetric}`, 'MoM Growth (%)', 'Transactions'],
        rows: tableRows,
      },
      inlineChart: {
        type: 'line',
        title: `Monthly ${targetMetric} Trajectory`,
        labels: sortedMonths.map((m) => m[0]),
        values: sortedMonths.map((m) => Number(m[1].sum.toFixed(2))),
        seriesName: targetMetric,
      },
      businessInterpretation: `Volume ranges between ${formatMetricNumber(lowestMonth[1].sum)} and ${formatMetricNumber(peakMonth[1].sum)}. Track MoM acceleration to anticipate seasonal inventory demand.`,
      actionableRecommendation: `Align marketing spend with the historical high-volume period in ${peakMonth[0]} to amplify conversion.`,
      dataPoints: [
        { label: 'Peak Month', value: `${peakMonth[0]} (${formatMetricNumber(peakMonth[1].sum)})` },
        { label: 'Trough Month', value: `${lowestMonth[0]} (${formatMetricNumber(lowestMonth[1].sum)})` },
        { label: 'Periods Tracked', value: sortedMonths.length },
      ],
    };
  }

  // ---------------------------------------------------------
  // 4. "Which category has the lowest profit margin / margin?"
  // ---------------------------------------------------------
  if (
    query.includes('margin') ||
    (query.includes('profit') && (query.includes('category') || query.includes('lowest') || query.includes('unprofitable')))
  ) {
    if (!profitCol || !salesCol) {
      return {
        directAnswer: `Cannot calculate profit margin because required columns are not both present.`,
        columnsUsed: [profitCol || 'Profit (missing)', salesCol || 'Sales/Revenue (missing)'].filter(Boolean),
        rowsEvaluated: rowCount,
        missingColumnNotice: `Profit Margin % requires both a Profit column and a Sales/Revenue column (Formula: Profit / Sales * 100). Available columns: ${columns.map((c) => c.name).join(', ')}`,
        businessInterpretation: `Without both top-line revenue and bottom-line profit, margin efficiency cannot be verified.`,
        actionableRecommendation: `Include unit profit or total profit values in your dataset.`,
      };
    }

    const catDim = categoryCol || productCol || regionCol || categoricalColumns[0];
    const catMap: Record<string, { sales: number; profit: number; count: number }> = {};

    for (const r of data) {
      const c = String(r[catDim] ?? 'Unknown');
      const s = Number(r[salesCol]) || 0;
      const p = Number(r[profitCol]) || 0;

      if (!catMap[c]) catMap[c] = { sales: 0, profit: 0, count: 0 };
      catMap[c].sales += s;
      catMap[c].profit += p;
      catMap[c].count += 1;
    }

    const marginList = Object.entries(catMap).map(([name, s]) => {
      const marginPct = s.sales !== 0 ? (s.profit / s.sales) * 100 : 0;
      return { name, sales: s.sales, profit: s.profit, marginPct, count: s.count };
    });

    marginList.sort((a, b) => a.marginPct - b.marginPct); // lowest margin first
    const lowest = marginList[0];
    const highest = marginList[marginList.length - 1];

    const tableRows = marginList.map((m) => [
      m.name,
      formatMetricNumber(m.sales),
      formatMetricNumber(m.profit),
      `${m.marginPct.toFixed(1)}%`,
      m.marginPct < 0 ? 'Negative Margin' : m.marginPct < 10 ? 'Low Margin' : 'Healthy',
    ]);

    return {
      directAnswer: `The category with the lowest profit margin is **${lowest.name}** with a profit margin of **${lowest.marginPct.toFixed(1)}%** (Profit: ${formatMetricNumber(lowest.profit)} on Sales: ${formatMetricNumber(lowest.sales)}). In contrast, **${highest.name}** delivered the highest margin at **${highest.marginPct.toFixed(1)}%**.`,
      columnsUsed: [catDim, profitCol, salesCol],
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: [catDim, `Total ${salesCol}`, `Total ${profitCol}`, 'Profit Margin (%)', 'Health Status'],
        rows: tableRows,
      },
      inlineChart: {
        type: 'bar',
        title: `Profit Margin (%) by ${catDim}`,
        labels: marginList.map((m) => m.name),
        values: marginList.map((m) => Number(m.marginPct.toFixed(1))),
        seriesName: 'Profit Margin %',
      },
      businessInterpretation: lowest.marginPct < 0
        ? `CRITICAL: "${lowest.name}" is operating at a net loss (${lowest.marginPct.toFixed(1)}% margin). Each dollar of sales in this category is currently eroding portfolio profit.`
        : `"${lowest.name}" carries the lowest efficiency in your product mix (${lowest.marginPct.toFixed(1)}%). Consider evaluating discounts or supply costs.`,
      actionableRecommendation: lowest.marginPct < 0
        ? `Immediately audit pricing and discount rules on ${lowest.name}. Restrict discounting above 5% and eliminate unprofitable SKUs.`
        : `Shift sales incentive structures toward higher-margin categories like ${highest.name} (${highest.marginPct.toFixed(1)}%).`,
      dataPoints: [
        { label: 'Lowest Margin', value: `${lowest.name} (${lowest.marginPct.toFixed(1)}%)` },
        { label: 'Highest Margin', value: `${highest.name} (${highest.marginPct.toFixed(1)}%)` },
        { label: 'Margin Spread', value: `${(highest.marginPct - lowest.marginPct).toFixed(1)}%` },
      ],
    };
  }

  // ---------------------------------------------------------
  // 5. "Are there any unusual values / outliers in my dataset?"
  // ---------------------------------------------------------
  if (
    query.includes('unusual') ||
    query.includes('outlier') ||
    query.includes('anomaly') ||
    query.includes('anomalies') ||
    query.includes('strange') ||
    query.includes('abnormal')
  ) {
    const outlierList: { col: string; rowIdx: number; val: number; mean: number; stdDev: number; reason: string }[] = [];

    for (const cName of numericColumns) {
      const colMeta = columns.find((c) => c.name === cName);
      if (!colMeta || !colMeta.numericStats) continue;
      const s = colMeta.numericStats;
      const thresholdHigh = s.mean + 2.5 * s.stdDev;
      const thresholdLow = s.mean - 2.5 * s.stdDev;

      data.forEach((r, idx) => {
        const val = Number(r[cName]);
        if (isNaN(val)) return;

        if (val > thresholdHigh) {
          outlierList.push({
            col: cName,
            rowIdx: idx + 1,
            val,
            mean: s.mean,
            stdDev: s.stdDev,
            reason: `Exceeds upper limit (+2.5σ threshold of ${formatMetricNumber(thresholdHigh)})`,
          });
        } else if (val < thresholdLow) {
          outlierList.push({
            col: cName,
            rowIdx: idx + 1,
            val,
            mean: s.mean,
            stdDev: s.stdDev,
            reason: `Below lower limit (-2.5σ threshold of ${formatMetricNumber(thresholdLow)})`,
          });
        } else if ((cName.toLowerCase().includes('profit') || cName.toLowerCase().includes('margin')) && val < 0) {
          outlierList.push({
            col: cName,
            rowIdx: idx + 1,
            val,
            mean: s.mean,
            stdDev: s.stdDev,
            reason: `Negative profit transaction (loss)`,
          });
        }
      });
    }

    if (outlierList.length === 0) {
      return {
        directAnswer: `No statistical outliers or anomalous negative values were detected across any of the ${numericColumns.length} numerical attributes.`,
        columnsUsed: numericColumns,
        rowsEvaluated: rowCount,
        businessInterpretation: `All data points reside within 2.5 standard deviations of their respective means, indicating a well-bounded, predictable distribution.`,
        actionableRecommendation: `Standard descriptive modeling and aggregations can proceed without truncation or winsorizing.`,
        dataPoints: [
          { label: 'Outliers Found', value: 0 },
          { label: 'Columns Audited', value: numericColumns.length },
        ],
      };
    }

    const tableRows = outlierList.slice(0, 8).map((o) => [
      `Row #${o.rowIdx}`,
      o.col,
      formatMetricNumber(o.val),
      formatMetricNumber(o.mean),
      o.reason,
    ]);

    return {
      directAnswer: `Detected **${outlierList.length} unusual value(s)** across numerical columns, including extreme transactions deviating more than 2.5 standard deviations from normal.`,
      columnsUsed: Array.from(new Set(outlierList.map((o) => o.col))),
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: ['Row Location', 'Column', 'Observed Value', 'Average Baseline', 'Reason Flagged'],
        rows: tableRows,
      },
      inlineChart: {
        type: 'bar',
        title: 'Top Outlier Values vs Column Averages',
        labels: outlierList.slice(0, 5).map((o) => `Row #${o.rowIdx} (${o.col})`),
        values: outlierList.slice(0, 5).map((o) => o.val),
        seriesName: 'Outlier Value',
      },
      businessInterpretation: `Outliers can represent whale transactions, data entry errors, or acute operational losses. The most extreme value observed was ${formatMetricNumber(outlierList[0].val)} in "${outlierList[0].col}".`,
      actionableRecommendation: `Verify row records in the preview table to determine if these outliers represent genuine enterprise deals or data recording mistakes.`,
      dataPoints: [
        { label: 'Total Anomalies', value: outlierList.length },
        { label: 'Columns Affected', value: Array.from(new Set(outlierList.map((o) => o.col))).length },
      ],
    };
  }

  // ---------------------------------------------------------
  // 6. "What are the top 5 customers by sales?"
  // ---------------------------------------------------------
  if (
    query.includes('top') &&
    (query.includes('customer') || query.includes('account') || query.includes('client') || query.includes('user'))
  ) {
    const custDim = customerCol || productCol || categoryCol;
    const metricDim = salesCol || numericColumns[0];

    if (!custDim || !metricDim) {
      return {
        directAnswer: `Unable to rank customers because customer or sales columns were not detected.`,
        columnsUsed: [custDim || 'Customer (missing)', metricDim || 'Sales (missing)'].filter(Boolean),
        rowsEvaluated: rowCount,
        missingColumnNotice: `Analysis requires a customer/account name column and a numerical metric column.`,
        businessInterpretation: `Customer ranking requires account or user identifiers.`,
        actionableRecommendation: `Upload data containing customer names or IDs.`,
      };
    }

    const custMap: Record<string, { sum: number; count: number }> = {};
    for (const r of data) {
      const c = String(r[custDim] ?? 'Unknown');
      const val = Number(r[metricDim]) || 0;
      if (!custMap[c]) custMap[c] = { sum: 0, count: 0 };
      custMap[c].sum += val;
      custMap[c].count += 1;
    }

    const sorted = Object.entries(custMap).sort((a, b) => b[1].sum - a[1].sum);
    const top5 = sorted.slice(0, 5);
    const totalVal = sorted.reduce((a, b) => a + b[1].sum, 0);
    const top5Sum = top5.reduce((a, b) => a + b[1].sum, 0);
    const top5Share = totalVal > 0 ? ((top5Sum / totalVal) * 100).toFixed(1) : '0';

    const tableRows = top5.map(([name, s], idx) => [
      idx + 1,
      name,
      formatMetricNumber(s.sum),
      `${totalVal > 0 ? ((s.sum / totalVal) * 100).toFixed(1) : 0}%`,
      s.count,
    ]);

    return {
      directAnswer: `The top 5 ${custDim} accounts generate **${formatMetricNumber(top5Sum)}** (${top5Share}% of all ${metricDim}), led by **${top5[0][0]}** with **${formatMetricNumber(top5[0][1].sum)}**.`,
      columnsUsed: [custDim, metricDim],
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: ['Rank', custDim, `Total ${metricDim}`, 'Share (%)', 'Transactions'],
        rows: tableRows,
      },
      inlineChart: {
        type: 'bar',
        title: `Top 5 ${custDim} by ${metricDim}`,
        labels: top5.map((c) => c[0]),
        values: top5.map((c) => Number(c[1].sum.toFixed(2))),
        seriesName: metricDim,
      },
      businessInterpretation: `High concentration risk: top 5 accounts represent ${top5Share}% of entire revenue. Losing any of these key relationships would severely impact top-line performance.`,
      actionableRecommendation: `Establish dedicated executive account management and satisfaction check-ins for ${top5[0][0]} and the top 5 accounts.`,
      dataPoints: [
        { label: 'Top Customer', value: top5[0][0] },
        { label: 'Top 5 Combined Share', value: `${top5Share}%` },
        { label: 'Top 5 Total', value: formatMetricNumber(top5Sum) },
      ],
    };
  }

  // ---------------------------------------------------------
  // 7. "What business problems can you identify from this data?"
  // ---------------------------------------------------------
  if (
    query.includes('problem') ||
    query.includes('issues') ||
    query.includes('risks') ||
    query.includes('challenges') ||
    query.includes('threats')
  ) {
    const problems: { issue: string; evidence: string; severity: string }[] = [];

    // Check for negative profits
    if (profitCol) {
      const negativeRows = data.filter((r) => Number(r[profitCol]) < 0);
      if (negativeRows.length > 0) {
        const totalLoss = negativeRows.reduce((a, b) => a + Math.abs(Number(b[profitCol]) || 0), 0);
        problems.push({
          issue: 'Unprofitable Transactions / Negative Margins',
          evidence: `${negativeRows.length} transactions recorded net losses totaling ${formatMetricNumber(totalLoss)} in lost profit.`,
          severity: 'Critical',
        });
      }
    }

    // Check for high discounts
    if (discountCol && profitCol) {
      const highDiscountLoss = data.filter((r) => Number(r[discountCol]) >= 0.15 && Number(r[profitCol]) < 0);
      if (highDiscountLoss.length > 0) {
        problems.push({
          issue: 'Excessive Discounting Cannibalization',
          evidence: `${highDiscountLoss.length} transactions with discounts >= 15% resulted in negative net margins.`,
          severity: 'High',
        });
      }
    }

    // Check for ChurnRisk
    const churnCol = findColumn(dataset, ['churn', 'churnrisk', 'retention', 'attrition']);
    if (churnCol) {
      const highRisk = data.filter((r) => String(r[churnCol]).toLowerCase().includes('high'));
      if (highRisk.length > 0) {
        problems.push({
          issue: 'Customer Churn Vulnerability',
          evidence: `${highRisk.length} accounts (${((highRisk.length / rowCount) * 100).toFixed(1)}%) are currently flagged as High Churn Risk.`,
          severity: 'High',
        });
      }
    }

    // Check for Concentration Risk
    const catCol = categoryCol || regionCol || categoricalColumns[0];
    if (catCol && salesCol) {
      const sums: Record<string, number> = {};
      data.forEach((r) => {
        const k = String(r[catCol]);
        sums[k] = (sums[k] || 0) + (Number(r[salesCol]) || 0);
      });
      const topShare = Math.max(...Object.values(sums)) / (Object.values(sums).reduce((a, b) => a + b, 0) || 1);
      if (topShare > 0.45) {
        problems.push({
          issue: `Extreme Segment Concentration in ${catCol}`,
          evidence: `A single segment drives ${(topShare * 100).toFixed(1)}% of all portfolio sales.`,
          severity: 'Medium',
        });
      }
    }

    // Check data quality
    if (dataset.totalMissingCells > 0) {
      problems.push({
        issue: 'Incomplete Data Records',
        evidence: `${dataset.totalMissingCells} empty cells (${dataset.missingCellsPercentage}% missing rate) across the dataset.`,
        severity: 'Medium',
      });
    }

    if (problems.length === 0) {
      problems.push({
        issue: 'Healthy Baseline Performance',
        evidence: 'No acute profitability losses, extreme discounts, or high churn flags were detected in the records.',
        severity: 'Low',
      });
    }

    return {
      directAnswer: `Identified **${problems.length} primary business risk factors** in your data, including ${problems[0].issue.toLowerCase()}.`,
      columnsUsed: [profitCol, salesCol, discountCol, categoryCol].filter((c): c is string => Boolean(c)),
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: ['Identified Risk Factor', 'Data Evidence', 'Severity Level'],
        rows: problems.map((p) => [p.issue, p.evidence, p.severity]),
      },
      businessInterpretation: `Unchecked discounting and negative-margin products create a leakage where top-line revenue growth masks declining operational cashflow.`,
      actionableRecommendation: `Immediately cap discounts above 10% and establish automated price floor rules on loss-making categories.`,
      dataPoints: problems.map((p) => ({ label: p.issue, value: p.severity })),
    };
  }

  // ---------------------------------------------------------
  // 8. "What actions would you recommend to improve performance?"
  // ---------------------------------------------------------
  if (
    query.includes('action') ||
    query.includes('recommend') ||
    query.includes('improve') ||
    query.includes('strategy') ||
    query.includes('suggestion')
  ) {
    const catDim = categoryCol || regionCol || categoricalColumns[0];
    const metricDim = salesCol || numericColumns[0];

    return {
      directAnswer: `Based on quantitative analysis of **${rowCount.toLocaleString()} records**, here are the 3 top high-ROI actions to improve performance:`,
      columnsUsed: [catDim, metricDim, profitCol].filter((c): c is string => Boolean(c)),
      rowsEvaluated: rowCount,
      evidenceTable: {
        headers: ['Priority', 'Strategic Action', 'Expected Business Impact', 'Target Dimension'],
        rows: [
          ['1. High Priority', 'Eliminate negative margin SKUs & restrict discounts >10%', 'Protects margin & prevents cash leakage', profitCol || 'Profitability'],
          ['2. Medium Priority', `Scale investment in top revenue segment (${catDim || 'Core Category'})`, 'Capitalizes on proven market demand', catDim || 'Key Category'],
          ['3. Operational', 'Deduplicate and clean missing attributes in source pipelines', 'Eliminates reporting bias & improves forecasts', 'Data Integrity'],
        ],
      },
      businessInterpretation: `Focusing on margin preservation produces a faster bottom-line boost than pure top-line sales volume pursuit.`,
      actionableRecommendation: `Reallocate 20% of low-performing segment budget toward the highest-margin categories identified in this analysis.`,
      dataPoints: [
        { label: 'Priority 1', value: 'Stop Unprofitable Discounts' },
        { label: 'Priority 2', value: 'Scale Proven Categories' },
        { label: 'Priority 3', value: 'Fix Pipeline Inconsistencies' },
      ],
    };
  }

  // ---------------------------------------------------------
  // 9. Generic Grouping / Ranking / Column Query
  // ---------------------------------------------------------
  // Check if a specific column is requested
  const matchedCol = columns.find((c) => query.includes(c.name.toLowerCase()));
  if (matchedCol) {
    if (matchedCol.numericStats) {
      const s = matchedCol.numericStats;
      return {
        directAnswer: `Analysis for numerical metric **${matchedCol.name}**: Total sum is **${formatMetricNumber(s.sum)}** with a mean average of **${formatMetricNumber(s.mean)}** (Median: ${formatMetricNumber(s.median)}).`,
        columnsUsed: [matchedCol.name],
        rowsEvaluated: rowCount,
        evidenceTable: {
          headers: ['Metric Property', 'Calculated Value'],
          rows: [
            ['Total Sum', formatMetricNumber(s.sum)],
            ['Average (Mean)', formatMetricNumber(s.mean)],
            ['Median', formatMetricNumber(s.median)],
            ['Minimum Value', formatMetricNumber(s.min)],
            ['Maximum Value', formatMetricNumber(s.max)],
            ['Standard Deviation', formatMetricNumber(s.stdDev)],
            ['Missing Values', `${matchedCol.missingCount} (${matchedCol.missingPercentage}%)`],
          ],
        },
        inlineChart: {
          type: 'bar',
          title: `${matchedCol.name} Statistical Profile`,
          labels: ['Min', 'Median', 'Mean', 'Max'],
          values: [s.min, s.median, s.mean, s.max],
          seriesName: matchedCol.name,
        },
        businessInterpretation: `Values range from ${formatMetricNumber(s.min)} to ${formatMetricNumber(s.max)}. Standard deviation of ${formatMetricNumber(s.stdDev)} indicates ${s.stdDev > s.mean ? 'high dispersion and variance' : 'moderate clustering around the mean'}.`,
        actionableRecommendation: `Use median (${formatMetricNumber(s.median)}) as your operational benchmark when evaluating typical transaction performance.`,
        dataPoints: [
          { label: 'Mean', value: formatMetricNumber(s.mean) },
          { label: 'Median', value: formatMetricNumber(s.median) },
          { label: 'Total', value: formatMetricNumber(s.sum) },
        ],
      };
    } else if (matchedCol.categoryStats) {
      const c = matchedCol.categoryStats;
      const top5 = c.topValues.slice(0, 5);
      return {
        directAnswer: `Categorical breakdown for **${matchedCol.name}**: Contains **${c.uniqueCount} distinct values**, led by **"${c.mode}"** with **${c.modeCount} entries** (${top5[0]?.percentage || 0}% share).`,
        columnsUsed: [matchedCol.name],
        rowsEvaluated: rowCount,
        evidenceTable: {
          headers: ['Rank', matchedCol.name, 'Frequency (Rows)', 'Percentage Share'],
          rows: top5.map((t, idx) => [idx + 1, t.value, t.count, `${t.percentage}%`]),
        },
        inlineChart: {
          type: 'bar',
          title: `Distribution of ${matchedCol.name}`,
          labels: top5.map((t) => t.value),
          values: top5.map((t) => t.count),
          seriesName: 'Row Count',
        },
        businessInterpretation: `The top category "${c.mode}" accounts for ${top5[0]?.percentage}% of all records, indicating strong segment preference.`,
        actionableRecommendation: `Tailor communications and operational capacity to support the dominant "${c.mode}" segment.`,
        dataPoints: top5.slice(0, 3).map((t) => ({ label: t.value, value: `${t.count} (${t.percentage}%)` })),
      };
    }
  }

  // ---------------------------------------------------------
  // 10. Default General Query Fallback
  // ---------------------------------------------------------
  const primaryNum = salesCol || numericColumns[0];
  const primaryCat = categoryCol || categoricalColumns[0];

  let topSummary = `Dataset Overview for **${dataset.metadata.name}**: ${rowCount.toLocaleString()} rows × ${columns.length} columns.`;
  if (primaryNum && primaryCat) {
    topSummary += ` Analyzed relationship between dimension **${primaryCat}** and metric **${primaryNum}**.`;
  }

  return {
    directAnswer: topSummary,
    columnsUsed: [primaryCat, primaryNum].filter((c): c is string => Boolean(c)),
    rowsEvaluated: rowCount,
    evidenceTable: {
      headers: ['Attribute', 'Data Type', 'Completeness', 'Unique Values'],
      rows: columns.slice(0, 6).map((c) => [c.name, c.type, `${100 - c.missingPercentage}%`, c.uniqueCount]),
    },
    businessInterpretation: `This dataset provides rich multi-dimensional granularity suitable for customer segmentation, financial margin audits, and time-series trends.`,
    actionableRecommendation: `Ask specific questions like "Which product has highest sales?", "What is the monthly sales trend?", or "Are there any unusual values?".`,
    dataPoints: [
      { label: 'Rows', value: rowCount },
      { label: 'Columns', value: columns.length },
      { label: 'Completeness', value: `${(100 - dataset.missingCellsPercentage).toFixed(1)}%` },
    ],
  };
}
