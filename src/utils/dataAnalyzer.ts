/**
 * Statistical analysis and query execution engine for InsightPilot AI
 */

import type {
  ColumnMeta,
  ColumnType,
  Dataset,
  FileMetadata,
  NumericStats,
  CategoryStats,
  CategoryValueCount,
} from '../types/data';

/**
 * Detect column data type based on values
 */
export function detectColumnType(values: any[]): ColumnType {
  const nonNulls = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNulls.length === 0) return 'string';

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;

  for (const v of nonNulls) {
    if (typeof v === 'boolean' || v === 'true' || v === 'false' || v === 'TRUE' || v === 'FALSE') {
      boolCount++;
    } else if (typeof v === 'number' && !isNaN(v)) {
      numCount++;
    } else if (typeof v === 'string') {
      const num = Number(v.replace(/[$,€£%]/g, '').trim());
      if (!isNaN(num) && v.trim() !== '') {
        numCount++;
      } else {
        // Test date
        const dateParsed = Date.parse(v);
        if (!isNaN(dateParsed) && (v.includes('-') || v.includes('/') || v.includes('.')) && v.length >= 8) {
          dateCount++;
        }
      }
    }
  }

  const threshold = nonNulls.length * 0.75;
  if (numCount >= threshold) return 'number';
  if (dateCount >= threshold) return 'date';
  if (boolCount >= threshold) return 'boolean';
  return 'string';
}

/**
 * Calculate numerical statistics for a number array
 */
export function calculateNumericStats(values: number[]): NumericStats | undefined {
  if (values.length === 0) return undefined;

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;

  // Median
  const mid = Math.floor(count / 2);
  const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Q1 and Q3
  const q1 = sorted[Math.floor(count * 0.25)];
  const q3 = sorted[Math.floor(count * 0.75)];

  // Min and Max
  const min = sorted[0];
  const max = sorted[count - 1];

  // Standard Deviation
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count > 1 ? count - 1 : 1);
  const stdDev = Math.sqrt(variance);

  return {
    sum: Number(sum.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
    q1: Number(q1.toFixed(4)),
    q3: Number(q3.toFixed(4)),
  };
}

/**
 * Calculate categorical statistics
 */
export function calculateCategoryStats(values: any[]): CategoryStats | undefined {
  const counts: Record<string, number> = {};
  let totalValid = 0;

  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const strVal = String(v);
    counts[strVal] = (counts[strVal] || 0) + 1;
    totalValid++;
  }

  if (totalValid === 0) return undefined;

  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const uniqueCount = sortedEntries.length;

  const topValues: CategoryValueCount[] = sortedEntries.slice(0, 10).map(([value, count]) => ({
    value,
    count,
    percentage: Number(((count / totalValid) * 100).toFixed(1)),
  }));

  const mode = sortedEntries[0][0];
  const modeCount = sortedEntries[0][1];

  return {
    uniqueCount,
    topValues,
    mode,
    modeCount,
  };
}

/**
 * Identify duplicate rows in dataset
 */
export function countDuplicateRows(rows: Record<string, any>[]): number {
  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of rows) {
    // Generate signature
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}

/**
 * Full dataset analyzer
 */
export function analyzeDataset(data: Record<string, any>[], metadata: FileMetadata): Dataset {
  const rowCount = data.length;
  if (rowCount === 0) {
    return {
      metadata,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      data: [],
      totalMissingCells: 0,
      missingCellsPercentage: 0,
      duplicateRowCount: 0,
      numericColumns: [],
      categoricalColumns: [],
      dateColumns: [],
    };
  }

  // Get all unique column headers across all rows
  const columnSet = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach((k) => columnSet.add(k));
  }
  const columnNames = Array.from(columnSet);
  const columnCount = columnNames.length;

  let totalMissingCells = 0;
  const columns: ColumnMeta[] = [];
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const dateColumns: string[] = [];

  for (const colName of columnNames) {
    const rawValues = data.map((row) => row[colName]);
    const detectedType = detectColumnType(rawValues);

    let missingCount = 0;
    const cleanNumericValues: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const val = data[i][colName];
      if (val === null || val === undefined || val === '') {
        missingCount++;
        totalMissingCells++;
      } else if (detectedType === 'number') {
        const num = typeof val === 'number' ? val : Number(String(val).replace(/[$,€£%]/g, '').trim());
        if (!isNaN(num)) {
          cleanNumericValues.push(num);
          data[i][colName] = num; // coerce in place
        } else {
          missingCount++;
          totalMissingCells++;
        }
      }
    }

    const missingPercentage = Number(((missingCount / rowCount) * 100).toFixed(1));
    const uniqueValues = new Set(rawValues.filter((v) => v !== null && v !== undefined && v !== ''));
    const uniqueCount = uniqueValues.size;

    let numericStats: NumericStats | undefined;
    let categoryStats: CategoryStats | undefined;

    if (detectedType === 'number') {
      numericStats = calculateNumericStats(cleanNumericValues);
      numericColumns.push(colName);
    } else if (detectedType === 'date') {
      dateColumns.push(colName);
      categoryStats = calculateCategoryStats(rawValues);
    } else {
      categoricalColumns.push(colName);
      categoryStats = calculateCategoryStats(rawValues);
    }

    // Collect non-empty sample values
    const sampleValues = rawValues
      .filter((v) => v !== null && v !== undefined && v !== '')
      .slice(0, 5);

    columns.push({
      name: colName,
      type: detectedType,
      missingCount,
      missingPercentage,
      uniqueCount,
      numericStats,
      categoryStats,
      sampleValues,
    });
  }

  const totalCells = rowCount * columnCount;
  const missingCellsPercentage = totalCells > 0 ? Number(((totalMissingCells / totalCells) * 100).toFixed(1)) : 0;
  const duplicateRowCount = countDuplicateRows(data);

  return {
    metadata,
    rowCount,
    columnCount,
    columns,
    data,
    totalMissingCells,
    missingCellsPercentage,
    duplicateRowCount,
    numericColumns,
    categoricalColumns,
    dateColumns,
  };
}

/**
 * Format large numbers for human readability
 */
export function formatMetricNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) {
    return `${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `${(val / 1_000).toFixed(2)}K`;
  }
  if (Number.isInteger(val)) {
    return val.toLocaleString();
  }
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Deterministic Natural Language Query Processor
 * Evaluates questions mathematically against the actual dataset.
 */
export function answerDatasetQuery(
  rawQuery: string,
  dataset: Dataset
): {
  answer: string;
  dataPoints?: { label: string; value: string | number }[];
} {
  const query = rawQuery.toLowerCase().trim();

  // 1. Row & column count questions
  if (
    query.includes('how many rows') ||
    query.includes('number of rows') ||
    query.includes('how many records') ||
    query.includes('total rows')
  ) {
    return {
      answer: `The dataset contains **${dataset.rowCount.toLocaleString()}** rows and **${dataset.columnCount}** columns.`,
      dataPoints: [
        { label: 'Total Rows', value: dataset.rowCount.toLocaleString() },
        { label: 'Total Columns', value: dataset.columnCount },
        { label: 'Total Data Cells', value: (dataset.rowCount * dataset.columnCount).toLocaleString() },
      ],
    };
  }

  if (query.includes('how many columns') || query.includes('number of columns') || query.includes('what are the columns')) {
    return {
      answer: `There are **${dataset.columnCount} columns** in this dataset:\n` +
        dataset.columns.map((c) => `• **${c.name}** (${c.type})`).join('\n'),
      dataPoints: [
        { label: 'Numeric Columns', value: dataset.numericColumns.length },
        { label: 'Categorical Columns', value: dataset.categoricalColumns.length },
        { label: 'Date Columns', value: dataset.dateColumns.length },
      ],
    };
  }

  // 2. Missing values questions
  if (query.includes('missing') || query.includes('null') || query.includes('empty')) {
    const missingColumns = dataset.columns.filter((c) => c.missingCount > 0);
    if (dataset.totalMissingCells === 0) {
      return {
        answer: `Great news! There are **zero missing values** across all ${dataset.rowCount} rows and ${dataset.columnCount} columns (100% data completeness).`,
        dataPoints: [
          { label: 'Missing Values', value: 0 },
          { label: 'Completeness', value: '100%' },
        ],
      };
    }

    const colBreakdown = missingColumns
      .map((c) => `• **${c.name}**: ${c.missingCount} missing (${c.missingPercentage}%)`)
      .join('\n');

    return {
      answer: `There are **${dataset.totalMissingCells} missing cells** (${dataset.missingCellsPercentage}% of all cells) in the dataset.\n\nColumns with missing data:\n${colBreakdown}`,
      dataPoints: missingColumns.map((c) => ({
        label: c.name,
        value: `${c.missingCount} (${c.missingPercentage}%)`,
      })),
    };
  }

  // 3. Duplicate rows questions
  if (query.includes('duplicate') || query.includes('repeats')) {
    return {
      answer: dataset.duplicateRowCount === 0
        ? `No duplicate rows were detected in the dataset. All ${dataset.rowCount} rows are unique.`
        : `Detected **${dataset.duplicateRowCount} duplicate rows** (${((dataset.duplicateRowCount / dataset.rowCount) * 100).toFixed(1)}% of rows). Consider deduplicating before downstream modeling.`,
      dataPoints: [
        { label: 'Duplicate Rows', value: dataset.duplicateRowCount },
        { label: 'Unique Rows', value: dataset.rowCount - dataset.duplicateRowCount },
      ],
    };
  }

  // Find targeted column from query
  const matchedCol = dataset.columns.find((c) => query.includes(c.name.toLowerCase()));

  // 4. Average / Mean query
  if (query.includes('average') || query.includes('mean') || query.includes('avg')) {
    if (matchedCol && matchedCol.numericStats) {
      const stats = matchedCol.numericStats;
      return {
        answer: `The average **${matchedCol.name}** is **${formatMetricNumber(stats.mean)}**.\n• Median: ${formatMetricNumber(stats.median)}\n• Range: [${formatMetricNumber(stats.min)} to ${formatMetricNumber(stats.max)}]\n• Standard Deviation: ${formatMetricNumber(stats.stdDev)}`,
        dataPoints: [
          { label: 'Average (Mean)', value: formatMetricNumber(stats.mean) },
          { label: 'Median', value: formatMetricNumber(stats.median) },
          { label: 'Sum', value: formatMetricNumber(stats.sum) },
        ],
      };
    } else if (dataset.numericColumns.length > 0) {
      // Show averages for all numeric columns
      const lines = dataset.columns
        .filter((c) => c.numericStats)
        .map((c) => `• **${c.name}**: Average = ${formatMetricNumber(c.numericStats!.mean)} (Median = ${formatMetricNumber(c.numericStats!.median)})`);

      return {
        answer: `Here are the averages across all numerical columns:\n\n${lines.join('\n')}`,
        dataPoints: dataset.columns
          .filter((c) => c.numericStats)
          .map((c) => ({ label: c.name, value: formatMetricNumber(c.numericStats!.mean) })),
      };
    }
  }

  // 5. Total / Sum query
  if (query.includes('total') || query.includes('sum')) {
    if (matchedCol && matchedCol.numericStats) {
      const stats = matchedCol.numericStats;
      return {
        answer: `The total sum of **${matchedCol.name}** is **${formatMetricNumber(stats.sum)}** across ${dataset.rowCount} rows.`,
        dataPoints: [
          { label: 'Total Sum', value: formatMetricNumber(stats.sum) },
          { label: 'Average', value: formatMetricNumber(stats.mean) },
          { label: 'Maximum', value: formatMetricNumber(stats.max) },
        ],
      };
    } else if (dataset.numericColumns.length > 0) {
      const lines = dataset.columns
        .filter((c) => c.numericStats)
        .map((c) => `• **${c.name}**: Total = ${formatMetricNumber(c.numericStats!.sum)}`);

      return {
        answer: `Total sum for each numerical column:\n\n${lines.join('\n')}`,
        dataPoints: dataset.columns
          .filter((c) => c.numericStats)
          .map((c) => ({ label: c.name, value: formatMetricNumber(c.numericStats!.sum) })),
      };
    }
  }

  // 6. Max / Highest query
  if (query.includes('max') || query.includes('highest') || query.includes('greatest') || query.includes('top')) {
    if (matchedCol && matchedCol.numericStats) {
      const maxVal = matchedCol.numericStats.max;
      // Find rows with this max
      const topRows = dataset.data.filter((r) => r[matchedCol.name] === maxVal);
      const rowDesc = topRows.length > 0 ? ` (Found in row #${dataset.data.indexOf(topRows[0]) + 1})` : '';

      return {
        answer: `The highest value for **${matchedCol.name}** is **${formatMetricNumber(maxVal)}**${rowDesc}.`,
        dataPoints: [
          { label: 'Highest Value', value: formatMetricNumber(maxVal) },
          { label: 'Average', value: formatMetricNumber(matchedCol.numericStats.mean) },
          { label: 'Difference from Avg', value: `+${formatMetricNumber(maxVal - matchedCol.numericStats.mean)}` },
        ],
      };
    }
  }

  // 7. Min / Lowest query
  if (query.includes('min') || query.includes('lowest') || query.includes('smallest')) {
    if (matchedCol && matchedCol.numericStats) {
      const minVal = matchedCol.numericStats.min;
      return {
        answer: `The lowest value for **${matchedCol.name}** is **${formatMetricNumber(minVal)}**.`,
        dataPoints: [
          { label: 'Lowest Value', value: formatMetricNumber(minVal) },
          { label: 'Average', value: formatMetricNumber(matchedCol.numericStats.mean) },
          { label: 'Difference from Avg', value: `${formatMetricNumber(minVal - matchedCol.numericStats.mean)}` },
        ],
      };
    }
  }

  // 8. Breakdown / Group by / Top categories
  if (query.includes('breakdown') || query.includes('distribution') || query.includes('most common') || query.includes('top')) {
    const catCol = matchedCol && matchedCol.categoryStats ? matchedCol : dataset.columns.find((c) => c.categoryStats);
    if (catCol && catCol.categoryStats) {
      const topVals = catCol.categoryStats.topValues.slice(0, 5);
      const lines = topVals.map((t) => `• **${t.value}**: ${t.count} occurrences (${t.percentage}%)`);

      return {
        answer: `Here is the distribution for **${catCol.name}** (${catCol.categoryStats.uniqueCount} distinct values):\n\n${lines.join('\n')}`,
        dataPoints: topVals.map((t) => ({ label: t.value, value: `${t.count} (${t.percentage}%)` })),
      };
    }
  }

  // 9. Specific Column Summary
  if (matchedCol) {
    if (matchedCol.numericStats) {
      const s = matchedCol.numericStats;
      return {
        answer: `Summary of numerical column **${matchedCol.name}**:\n` +
          `• Total Sum: ${formatMetricNumber(s.sum)}\n` +
          `• Mean (Average): ${formatMetricNumber(s.mean)}\n` +
          `• Median: ${formatMetricNumber(s.median)}\n` +
          `• Min / Max: [${formatMetricNumber(s.min)} — ${formatMetricNumber(s.max)}]\n` +
          `• Std Dev: ${formatMetricNumber(s.stdDev)}\n` +
          `• Missing Values: ${matchedCol.missingCount} (${matchedCol.missingPercentage}%)`,
        dataPoints: [
          { label: 'Sum', value: formatMetricNumber(s.sum) },
          { label: 'Mean', value: formatMetricNumber(s.mean) },
          { label: 'Median', value: formatMetricNumber(s.median) },
          { label: 'Std Dev', value: formatMetricNumber(s.stdDev) },
        ],
      };
    } else if (matchedCol.categoryStats) {
      const c = matchedCol.categoryStats;
      return {
        answer: `Summary of categorical column **${matchedCol.name}**:\n` +
          `• Unique Values: ${c.uniqueCount}\n` +
          `• Most Frequent (Mode): "${c.mode}" (${c.modeCount} times)\n` +
          `• Missing Values: ${matchedCol.missingCount} (${matchedCol.missingPercentage}%)`,
        dataPoints: c.topValues.slice(0, 4).map((t) => ({ label: t.value, value: t.count })),
      };
    }
  }

  // 10. Default General Dataset Overview
  const topNumeric = dataset.columns.find((c) => c.numericStats);
  const topCategory = dataset.columns.find((c) => c.categoryStats);

  let overviewText = `Here is an overview of **${dataset.metadata.name}**:\n` +
    `• Records: **${dataset.rowCount.toLocaleString()}** rows × **${dataset.columnCount}** columns\n` +
    `• Missing Values: ${dataset.totalMissingCells} (${dataset.missingCellsPercentage}% completeness score)\n`;

  if (topNumeric && topNumeric.numericStats) {
    overviewText += `• Primary metric (**${topNumeric.name}**): Sum = ${formatMetricNumber(topNumeric.numericStats.sum)}, Mean = ${formatMetricNumber(topNumeric.numericStats.mean)}\n`;
  }
  if (topCategory && topCategory.categoryStats) {
    overviewText += `• Leading category (**${topCategory.name}**): "${topCategory.categoryStats.mode}" (${topCategory.categoryStats.modeCount} entries)\n`;
  }

  overviewText += `\nYou can ask specific questions like: "What is the average [column]?", "Show missing values", "Highest [column]", or "Breakdown of [column]".`;

  return {
    answer: overviewText,
    dataPoints: [
      { label: 'Rows', value: dataset.rowCount },
      { label: 'Columns', value: dataset.columnCount },
      { label: 'Missing Cells', value: dataset.totalMissingCells },
    ],
  };
}
