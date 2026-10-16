/**
 * Safe In-Memory SQL Execution & Learning Engine for InsightPilot AI
 * Uses AlaSQL for client-side, read-only SQL querying on user datasets.
 * Enforces strict read-only execution with zero arbitrary system commands.
 */

import alasql from 'alasql';
import type { Dataset } from '../types/data';
import { formatMetricNumber } from './dataAnalyzer';

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  plainEnglishExplanation: string;
  suggestedChart: 'bar' | 'line' | 'donut' | 'scatter' | 'table';
  chartData?: {
    labels: string[];
    values: number[];
    categoryCol?: string;
    metricCol?: string;
  };
}

export interface SqlClauseExplanation {
  clause: string;
  codeSnippet: string;
  concept: string;
  explanation: string;
}

export interface SqlLearningBreakdown {
  summary: string;
  clauses: SqlClauseExplanation[];
  conceptsUsed: string[];
}

export interface StarterQuery {
  id: string;
  title: string;
  question: string;
  sql: string;
  category: 'aggregation' | 'filtering' | 'ranking' | 'conditional' | 'trend';
  description: string;
}

/**
 * 1. Strict Security Validation: Ensure query is strictly read-only
 */
export function validateSqlQuery(rawSql: string): { isValid: boolean; error?: string } {
  if (!rawSql || !rawSql.trim()) {
    return { isValid: false, error: 'Query is empty. Please enter a valid SQL query.' };
  }

  const clean = rawSql.trim();
  const upper = clean.toUpperCase();

  // Disallowed statements that modify data or schema
  const forbiddenPatterns = [
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bTRUNCATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bREPLACE\b/i,
    /\bRENAME\b/i,
    /\bEXEC\b/i,
    /\bEXECUTE\b/i,
    /\bPRAGMA\b/i,
    /\bATTACH\b/i,
    /\bDETACH\b/i,
    /\bINTO\b/i, // prevents SELECT INTO
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(upper)) {
      return {
        isValid: false,
        error: `Security Violation: Mutating statements like ${pattern.source.replace(/\\b/g, '')} are strictly forbidden. Only read-only SELECT queries are allowed.`,
      };
    }
  }

  // Must begin with SELECT or WITH
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
    return {
      isValid: false,
      error: 'Security Notice: Query must begin with SELECT or WITH (Common Table Expression).',
    };
  }

  return { isValid: true };
}

/**
 * 2. Execute validated read-only SQL query against in-memory dataset
 */
export function executeSafeSqlQuery(sql: string, dataset: Dataset): {
  success: boolean;
  result?: SqlQueryResult;
  error?: string;
} {
  const validation = validateSqlQuery(sql);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const startTime = performance.now();

  try {
    // 1. Prepare in-memory table in AlaSQL
    // Register the table name as 'dataset'
    alasql('CREATE TABLE IF NOT EXISTS dataset');
    (alasql as any).tables.dataset = { data: dataset.data };

    // Also support any table name the user might write (e.g. "records", "data")
    (alasql as any).tables.records = { data: dataset.data };
    (alasql as any).tables.data = { data: dataset.data };

    // 2. Execute query
    const rawResult = alasql(sql);
    const executionTimeMs = Number((performance.now() - startTime).toFixed(1));

    // Result must be an array of objects
    const rows: Record<string, any>[] = Array.isArray(rawResult)
      ? (rawResult as any[]).map((r) => (typeof r === 'object' && r !== null ? r : { value: r }))
      : [];

    const columns: string[] = rows.length > 0 ? Object.keys(rows[0]) : [];

    // 3. Determine chart type & chart data
    let suggestedChart: SqlQueryResult['suggestedChart'] = 'table';
    let chartData: SqlQueryResult['chartData'] = undefined;

    if (rows.length >= 2 && rows.length <= 30 && columns.length >= 2) {
      // Find first string/category col and first numeric col
      const stringCol = columns.find((c) => typeof rows[0][c] === 'string' || c.toLowerCase().includes('name') || c.toLowerCase().includes('category') || c.toLowerCase().includes('region') || c.toLowerCase().includes('dept'));
      const numCol = columns.find((c) => typeof rows[0][c] === 'number' || (!isNaN(Number(rows[0][c])) && c !== stringCol));

      if (stringCol && numCol) {
        const isDate = stringCol.toLowerCase().includes('date') || stringCol.toLowerCase().includes('month') || stringCol.toLowerCase().includes('year');
        suggestedChart = isDate ? 'line' : rows.length <= 6 ? 'donut' : 'bar';

        chartData = {
          labels: rows.map((r) => String(r[stringCol] ?? '')),
          values: rows.map((r) => Number(r[numCol]) || 0),
          categoryCol: stringCol,
          metricCol: numCol,
        };
      }
    }

    // 4. Generate plain English explanation of the returned data
    let explanation = `Returned ${rows.length.toLocaleString()} record(s) in ${executionTimeMs}ms.`;
    if (rows.length === 0) {
      explanation = `Query executed successfully in ${executionTimeMs}ms, but returned 0 rows matching your filter criteria.`;
    } else if (chartData && chartData.values.length > 0) {
      const maxVal = Math.max(...chartData.values);
      const maxIdx = chartData.values.indexOf(maxVal);
      const leaderName = chartData.labels[maxIdx];
      explanation = `Query returned ${rows.length} rows across "${chartData.categoryCol}". The top leading entry is "${leaderName}" with a ${chartData.metricCol} of ${formatMetricNumber(maxVal)}.`;
    } else if (columns.length === 1 && typeof rows[0][columns[0]] === 'number') {
      const val = rows[0][columns[0]];
      explanation = `Calculated scalar metric: ${columns[0]} = ${formatMetricNumber(val)}.`;
    }

    return {
      success: true,
      result: {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
        plainEnglishExplanation: explanation,
        suggestedChart,
        chartData,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `SQL Execution Error: ${err.message || 'Failed to parse or run SQL query.'}. Please check column names and syntax.`,
    };
  }
}

/**
 * 3. Explain SQL: Beginner-friendly Learning Breakdown
 */
export function explainSqlQuery(sql: string, dataset: Dataset): SqlLearningBreakdown {
  const clauses: SqlClauseExplanation[] = [];
  const conceptsUsed: string[] = [];

  const clean = sql.trim();
  const upper = clean.toUpperCase();

  // 1. SELECT clause
  const selectMatch = clean.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (selectMatch) {
    const projection = selectMatch[1].trim();
    const hasAgg = /SUM|AVG|COUNT|MIN|MAX/i.test(projection);
    if (hasAgg) conceptsUsed.push('Aggregation Functions (SUM/AVG/COUNT)');
    if (/CASE\s+WHEN/i.test(projection)) conceptsUsed.push('Conditional Branching (CASE WHEN)');
    if (/OVER\s*\(/i.test(projection)) conceptsUsed.push('Window Functions (OVER)');

    clauses.push({
      clause: 'SELECT',
      codeSnippet: `SELECT ${projection}`,
      concept: hasAgg ? 'Data Projection & Mathematical Aggregation' : 'Column Projection',
      explanation: `Specifies which fields and calculations to return: ${projection.replace(/\s+/g, ' ')}. It computes any requested metrics and assigns readable column headers using aliases (AS).`,
    });
  }

  // 2. FROM clause
  const fromMatch = clean.match(/FROM\s+([a-zA-Z0-9_"]+)/i);
  if (fromMatch) {
    clauses.push({
      clause: 'FROM',
      codeSnippet: `FROM ${fromMatch[1]}`,
      concept: 'Data Source Specification',
      explanation: `Identifies the in-memory source table ("${fromMatch[1]}", which represents your ${dataset.rowCount}-row uploaded dataset).`,
    });
  }

  // 3. WHERE clause
  const whereMatch = clean.match(/WHERE\s+([\s\S]+?)(?=\s+GROUP|\s+ORDER|\s+LIMIT|$)/i);
  if (whereMatch) {
    conceptsUsed.push('Row Filtering (WHERE)');
    clauses.push({
      clause: 'WHERE',
      codeSnippet: `WHERE ${whereMatch[1].trim()}`,
      concept: 'Row-Level Filtering & Boolean Logic',
      explanation: `Filters individual records before aggregation. Only rows satisfying condition "${whereMatch[1].trim()}" will be processed.`,
    });
  }

  // 4. GROUP BY clause
  const groupMatch = clean.match(/GROUP\s+BY\s+([\s\S]+?)(?=\s+HAVING|\s+ORDER|\s+LIMIT|$)/i);
  if (groupMatch) {
    conceptsUsed.push('Categorical Grouping (GROUP BY)');
    clauses.push({
      clause: 'GROUP BY',
      codeSnippet: `GROUP BY ${groupMatch[1].trim()}`,
      concept: 'Dimensional Bucketing',
      explanation: `Collapses multiple rows sharing the same value in "${groupMatch[1].trim()}" into single summarized summary rows.`,
    });
  }

  // 5. HAVING clause
  const havingMatch = clean.match(/HAVING\s+([\s\S]+?)(?=\s+ORDER|\s+LIMIT|$)/i);
  if (havingMatch) {
    conceptsUsed.push('Post-Aggregation Filtering (HAVING)');
    clauses.push({
      clause: 'HAVING',
      codeSnippet: `HAVING ${havingMatch[1].trim()}`,
      concept: 'Group-Level Filtering',
      explanation: `Filters aggregated groups after mathematical calculation has already occurred (e.g. only showing groups where SUM > threshold).`,
    });
  }

  // 6. ORDER BY clause
  const orderMatch = clean.match(/ORDER\s+BY\s+([\s\S]+?)(?=\s+LIMIT|$)/i);
  if (orderMatch) {
    conceptsUsed.push('Sorting & Ranking (ORDER BY)');
    const isDesc = /DESC/i.test(orderMatch[1]);
    clauses.push({
      clause: 'ORDER BY',
      codeSnippet: `ORDER BY ${orderMatch[1].trim()}`,
      concept: 'Result Ordering',
      explanation: `Sorts the resulting rows ${isDesc ? 'in descending order (highest to lowest)' : 'in ascending order (lowest to highest)'} by ${orderMatch[1].replace(/DESC|ASC/gi, '').trim()}.`,
    });
  }

  // 7. LIMIT clause
  const limitMatch = clean.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    conceptsUsed.push('Result Pagination (LIMIT)');
    clauses.push({
      clause: 'LIMIT',
      codeSnippet: `LIMIT ${limitMatch[1]}`,
      concept: 'Top-N Row Cap',
      explanation: `Caps the query response to the top ${limitMatch[1]} row(s), preventing overwhelming result sets.`,
    });
  }

  const summary = `This SQL query ${conceptsUsed.length > 0 ? `leverages ${conceptsUsed.join(', ')}` : 'retrieves data'} to answer your inquiry against the "${dataset.metadata.name}" dataset.`;

  return {
    summary,
    clauses,
    conceptsUsed,
  };
}

/**
 * 4. Generate curated starter SQL queries tailored to the active dataset
 */
export function generateStarterSqlQueries(dataset: Dataset): StarterQuery[] {
  const { numericColumns, categoricalColumns, dateColumns } = dataset;
  const num1 = numericColumns[0] || 'Sales';
  const num2 = numericColumns[1] || numericColumns[0] || 'Profit';
  const cat1 = categoricalColumns[0] || 'Category';
  const cat2 = categoricalColumns[1] || categoricalColumns[0] || 'Region';
  const dateCol = dateColumns[0];

  const queries: StarterQuery[] = [
    {
      id: 'sq-1-preview',
      title: 'Inspect Sample Records',
      question: 'Show the first 10 rows of the dataset',
      sql: `SELECT * \nFROM dataset \nLIMIT 10;`,
      category: 'filtering',
      description: 'Quickly inspect raw row structures and columns with a safe 10-row limit.',
    },
    {
      id: 'sq-2-aggregate-group',
      title: `Total & Average ${num1} by ${cat1}`,
      question: `What is the total and average ${num1} for each ${cat1}?`,
      sql: `SELECT \n  ${cat1},\n  COUNT(*) AS Record_Count,\n  ROUND(SUM(${num1}), 2) AS Total_${num1},\n  ROUND(AVG(${num1}), 2) AS Avg_${num1}\nFROM dataset\nGROUP BY ${cat1}\nORDER BY Total_${num1} DESC;`,
      category: 'aggregation',
      description: 'Aggregates volume and average yield across categorical classifications.',
    },
    {
      id: 'sq-3-top-5',
      title: `Top 5 Records by ${num1}`,
      question: `Show the top 5 highest records by ${num1}`,
      sql: `SELECT \n  ${cat1},\n  ${num1}${num2 !== num1 ? `,\n  ${num2}` : ''}\nFROM dataset\nORDER BY ${num1} DESC\nLIMIT 5;`,
      category: 'ranking',
      description: 'Isolates the single largest transactions or accounts by volume.',
    },
  ];

  // If 2 numeric columns exist, add ratio / margin query
  if (numericColumns.length >= 2) {
    queries.push({
      id: 'sq-4-margin',
      title: `Yield Ratio: ${num2} vs. ${num1} by ${cat1}`,
      question: `What is the ratio of ${num2} to ${num1} across ${cat1}?`,
      sql: `SELECT \n  ${cat1},\n  ROUND(SUM(${num1}), 2) AS Total_${num1},\n  ROUND(SUM(${num2}), 2) AS Total_${num2},\n  ROUND((SUM(${num2}) / NULLIF(SUM(${num1}), 0)) * 100, 1) AS Yield_Pct\nFROM dataset\nGROUP BY ${cat1}\nORDER BY Yield_Pct DESC;`,
      category: 'aggregation',
      description: 'Calculates the performance margin or ratio between two key metrics.',
    });
  }

  // Add CASE WHEN conditional classification
  queries.push({
    id: 'sq-5-case-when',
    title: `Tier Segmentation (CASE WHEN)`,
    question: `Segment ${num1} into High, Medium, and Low tiers`,
    sql: `SELECT \n  ${cat1},\n  ${num1},\n  CASE \n    WHEN ${num1} >= 1000 THEN 'High Tier'\n    WHEN ${num1} >= 300 THEN 'Mid Tier'\n    ELSE 'Low Tier'\n  END AS Performance_Tier\nFROM dataset\nLIMIT 15;`,
    category: 'conditional',
    description: 'Demonstrates SQL conditional branching logic to segment records dynamically.',
  });

  // If date column exists, add timeline aggregation
  if (dateCol) {
    queries.push({
      id: 'sq-6-temporal',
      title: `Chronological Trend over ${dateCol}`,
      question: `What is the timeline trend of ${num1}?`,
      sql: `SELECT \n  ${dateCol},\n  ROUND(SUM(${num1}), 2) AS Daily_${num1}\nFROM dataset\nGROUP BY ${dateCol}\nORDER BY ${dateCol} ASC\nLIMIT 20;`,
      category: 'trend',
      description: 'Aggregates metrics chronologically across sequential time periods.',
    });
  }

  return queries;
}

/**
 * 5. Rule-based Natural Language to SQL generator (client-side fallback)
 */
export function generateClientSideSql(question: string, dataset: Dataset): {
  sql: string;
  explanation: string;
  suggestedChart: 'bar' | 'line' | 'donut' | 'scatter' | 'table';
} {
  const q = question.toLowerCase().trim();
  const { numericColumns, categoricalColumns, dateColumns } = dataset;

  const num1 = numericColumns.find((c) => q.includes(c.toLowerCase())) || numericColumns[0] || 'Sales';
  const num2 = numericColumns.find((c) => c !== num1 && q.includes(c.toLowerCase())) || numericColumns[1] || num1;
  const cat1 = categoricalColumns.find((c) => q.includes(c.toLowerCase())) || categoricalColumns[0] || 'Category';
  const dateCol = dateColumns.find((c) => q.includes(c.toLowerCase())) || dateColumns[0];

  // 1. Top N query
  const topMatch = q.match(/top\s*(\d+)/i) || q.match(/best\s*(\d+)/i) || q.match(/highest\s*(\d+)/i);
  if (topMatch || q.includes('top') || q.includes('highest') || q.includes('most')) {
    const limit = topMatch ? parseInt(topMatch[1], 10) : 5;
    return {
      sql: `SELECT \n  ${cat1},\n  ROUND(SUM(${num1}), 2) AS Total_${num1}\nFROM dataset\nGROUP BY ${cat1}\nORDER BY Total_${num1} DESC\nLIMIT ${limit};`,
      explanation: `Calculates total ${num1} grouped by ${cat1}, sorts descending, and returns the top ${limit} performing categories.`,
      suggestedChart: 'bar',
    };
  }

  // 2. Bottom N / Lowest
  if (q.includes('bottom') || q.includes('lowest') || q.includes('least') || q.includes('worst')) {
    return {
      sql: `SELECT \n  ${cat1},\n  ROUND(SUM(${num1}), 2) AS Total_${num1}\nFROM dataset\nGROUP BY ${cat1}\nORDER BY Total_${num1} ASC\nLIMIT 5;`,
      explanation: `Groups by ${cat1} and sorts in ascending order to isolate the bottom 5 underperforming segments by ${num1}.`,
      suggestedChart: 'bar',
    };
  }

  // 3. Average / Mean query
  if (q.includes('average') || q.includes('avg') || q.includes('mean')) {
    return {
      sql: `SELECT \n  ${cat1},\n  ROUND(AVG(${num1}), 2) AS Avg_${num1},\n  COUNT(*) AS Records\nFROM dataset\nGROUP BY ${cat1}\nORDER BY Avg_${num1} DESC;`,
      explanation: `Computes arithmetic average of ${num1} and record counts grouped across each ${cat1}.`,
      suggestedChart: 'bar',
    };
  }

  // 4. Trend / Date / Timeline
  if ((q.includes('trend') || q.includes('monthly') || q.includes('time') || q.includes('over time')) && dateCol) {
    return {
      sql: `SELECT \n  ${dateCol},\n  ROUND(SUM(${num1}), 2) AS Total_${num1}\nFROM dataset\nGROUP BY ${dateCol}\nORDER BY ${dateCol} ASC;`,
      explanation: `Aggregates total ${num1} chronologically across ${dateCol} to reveal timeline trends.`,
      suggestedChart: 'line',
    };
  }

  // 5. Total / Count / Overall
  if (q.includes('total') || q.includes('sum') || q.includes('overall') || q.includes('how many')) {
    return {
      sql: `SELECT \n  COUNT(*) AS Total_Records,\n  ROUND(SUM(${num1}), 2) AS Total_${num1},\n  ROUND(AVG(${num1}), 2) AS Avg_${num1}\nFROM dataset;`,
      explanation: `Computes cumulative volume, overall record count, and average for "${num1}".`,
      suggestedChart: 'table',
    };
  }

  // 6. Default grouped query
  return {
    sql: `SELECT \n  ${cat1},\n  ROUND(SUM(${num1}), 2) AS Total_${num1},\n  COUNT(*) AS Count\nFROM dataset\nGROUP BY ${cat1}\nORDER BY Total_${num1} DESC\nLIMIT 10;`,
    explanation: `Summarizes ${num1} and row counts grouped by ${cat1} to provide an analytical breakdown.`,
    suggestedChart: 'bar',
  };
}
