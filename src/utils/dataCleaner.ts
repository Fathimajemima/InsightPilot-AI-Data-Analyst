/**
 * Data Cleaning Assistant Engine for InsightPilot AI
 * Audits datasets for missing values, duplicates, inconsistencies, IQR outliers, and type mismatches.
 * Executes non-destructive, user-confirmed cleaning actions.
 */

import * as XLSX from 'xlsx';
import type { 
  Dataset, 
  CleaningAudit, 
  MissingValuePlan, 
  InconsistencyItem, 
  OutlierItem, 
  TypeValidationItem,
  ColumnType
} from '../types/data';

/**
 * Audit dataset to identify all cleanable issues
 */
export function auditDatasetForCleaning(dataset: Dataset): CleaningAudit {
  const { data, columns, rowCount } = dataset;

  // 1. Missing Values Audit
  const missingPlans: MissingValuePlan[] = columns
    .filter((c) => c.missingCount > 0)
    .map((c) => {
      let suggestedAction: MissingValuePlan['suggestedAction'] = 'mode';
      let suggestedValue: any = 'Unknown';

      if (c.missingPercentage > 50) {
        suggestedAction = 'drop_rows';
        suggestedValue = null;
      } else if (c.type === 'number' && c.numericStats) {
        suggestedAction = 'median';
        suggestedValue = c.numericStats.median;
      } else if (c.categoryStats && c.categoryStats.mode) {
        suggestedAction = 'mode';
        suggestedValue = c.categoryStats.mode;
      }

      return {
        column: c.name,
        missingCount: c.missingCount,
        missingPercentage: c.missingPercentage,
        type: c.type,
        suggestedAction,
        suggestedValue,
        chosenAction: suggestedAction,
      };
    });

  // 2. Duplicate Records Audit
  const seenMap = new Map<string, number>();
  const duplicateIndices: number[] = [];

  data.forEach((row, idx) => {
    const key = JSON.stringify(row);
    if (seenMap.has(key)) {
      duplicateIndices.push(idx);
    } else {
      seenMap.set(key, idx);
    }
  });

  const duplicateRows = duplicateIndices.map((idx) => data[idx]);

  // 3. Inconsistent Data Audit (Whitespace, Casing, Dates)
  const inconsistencies: InconsistencyItem[] = [];

  for (const col of columns) {
    if (col.type === 'string') {
      // A. Extra Whitespace (Leading, trailing, or double internal spaces)
      let whitespaceCount = 0;
      const whitespaceExamples: { before: string; after: string }[] = [];

      for (const row of data) {
        const val = row[col.name];
        if (typeof val === 'string' && (val !== val.trim() || val.includes('  '))) {
          whitespaceCount++;
          if (whitespaceExamples.length < 3) {
            whitespaceExamples.push({
              before: `"${val}"`,
              after: `"${val.trim().replace(/\s+/g, ' ')}"`,
            });
          }
        }
      }

      if (whitespaceCount > 0) {
        inconsistencies.push({
          column: col.name,
          type: 'whitespace',
          affectedCount: whitespaceCount,
          description: `Contains leading/trailing spaces or redundant internal spacing across ${whitespaceCount} row(s).`,
          examples: whitespaceExamples,
          apply: true,
        });
      }

      // B. Inconsistent Casing (e.g. "consumer", "Consumer", "CONSUMER")
      const lowerToRaw = new Map<string, Set<string>>();
      for (const row of data) {
        const val = row[col.name];
        if (typeof val === 'string' && val.trim()) {
          const clean = val.trim();
          const lower = clean.toLowerCase();
          if (!lowerToRaw.has(lower)) lowerToRaw.set(lower, new Set());
          lowerToRaw.get(lower)!.add(clean);
        }
      }

      const casingExamples: { before: string; after: string }[] = [];
      let casingIssueCount = 0;

      for (const [lower, rawSet] of lowerToRaw.entries()) {
        if (rawSet.size > 1) {
          casingIssueCount += rawSet.size;
          // Preferred capitalization: Title Case
          const preferred = lower.charAt(0).toUpperCase() + lower.slice(1);
          if (casingExamples.length < 3) {
            casingExamples.push({
              before: Array.from(rawSet).join(' / '),
              after: preferred,
            });
          }
        }
      }

      if (casingIssueCount > 0) {
        inconsistencies.push({
          column: col.name,
          type: 'casing',
          affectedCount: casingIssueCount,
          description: `Discovered mixed casing variations for the same categorical terms.`,
          examples: casingExamples,
          apply: true,
        });
      }
    }

    // C. Inconsistent Date Formats
    if (col.type === 'date' || col.name.toLowerCase().includes('date')) {
      const dateFormatsFound = new Set<string>();
      const dateExamples: { before: string; after: string }[] = [];
      let dateMismatchCount = 0;

      for (const row of data) {
        const val = String(row[col.name] ?? '').trim();
        if (!val) continue;

        if (val.includes('/')) dateFormatsFound.add('slash (MM/DD/YYYY)');
        if (val.includes('-')) dateFormatsFound.add('hyphen (YYYY-MM-DD)');

        const parsed = Date.parse(val);
        if (!isNaN(parsed) && !val.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateMismatchCount++;
          if (dateExamples.length < 3) {
            const d = new Date(parsed);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dateExamples.push({
              before: val,
              after: iso,
            });
          }
        }
      }

      if (dateMismatchCount > 0) {
        inconsistencies.push({
          column: col.name,
          type: 'date_format',
          affectedCount: dateMismatchCount,
          description: `Standardizes ${dateMismatchCount} date stamps to ISO format (YYYY-MM-DD).`,
          examples: dateExamples,
          apply: true,
        });
      }
    }
  }

  // 4. Outlier Detection (Statistical IQR Method)
  const outliers: OutlierItem[] = [];

  for (const col of columns) {
    if (col.type === 'number' && col.numericStats) {
      const values = data
        .map((r) => Number(r[col.name]))
        .filter((v) => !isNaN(v))
        .sort((a, b) => a - b);

      if (values.length >= 8) {
        const q1 = values[Math.floor(values.length * 0.25)];
        const q3 = values[Math.floor(values.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = Number((q1 - 1.5 * iqr).toFixed(2));
        const upperBound = Number((q3 + 1.5 * iqr).toFixed(2));

        const sampleRows: { rowIdx: number; value: number; isHigh: boolean }[] = [];
        let outlierCount = 0;

        data.forEach((r, idx) => {
          const v = Number(r[col.name]);
          if (!isNaN(v) && (v < lowerBound || v > upperBound)) {
            outlierCount++;
            if (sampleRows.length < 5) {
              sampleRows.push({
                rowIdx: idx + 1,
                value: v,
                isHigh: v > upperBound,
              });
            }
          }
        });

        if (outlierCount > 0) {
          outliers.push({
            column: col.name,
            q1,
            q3,
            iqr,
            lowerBound,
            upperBound,
            outlierCount,
            sampleRows,
            strategy: 'keep', // Default to keep (outliers are not automatically errors)
          });
        }
      }
    }
  }

  // 5. Data Type Validation & Conversion Suggestions
  const typeMismatches: TypeValidationItem[] = [];

  for (const col of columns) {
    if (col.type === 'string') {
      const nonNulls = data.map((r) => r[col.name]).filter((v) => v !== null && v !== undefined && v !== '');
      if (nonNulls.length === 0) continue;

      // Check if strings are formatted numbers (e.g. "$1,450", "45.5%", "1200")
      let parseableAsNumber = 0;
      const unparseableSamples: any[] = [];

      for (const val of nonNulls) {
        const stripped = String(val).replace(/[$,€£%]/g, '').trim();
        const num = Number(stripped);
        if (!isNaN(num) && stripped !== '') {
          parseableAsNumber++;
        } else {
          if (unparseableSamples.length < 3) unparseableSamples.push(val);
        }
      }

      if (parseableAsNumber >= nonNulls.length * 0.8 && parseableAsNumber < nonNulls.length) {
        typeMismatches.push({
          column: col.name,
          currentType: 'string',
          suggestedType: 'number',
          parseableCount: parseableAsNumber,
          unparseableCount: nonNulls.length - parseableAsNumber,
          sampleUnparseable: unparseableSamples,
          apply: false,
        });
      }
    }
  }

  return {
    missingPlans,
    duplicateCount: duplicateIndices.length,
    duplicateRows,
    inconsistencies,
    outliers,
    typeMismatches,
  };
}

/**
 * Execute user-configured data cleaning operations on dataset
 */
export function executeCleaningPipeline(
  sourceData: Record<string, any>[],
  options: {
    missingPlans: MissingValuePlan[];
    removeDuplicates: boolean;
    inconsistencies: InconsistencyItem[];
    outliers: OutlierItem[];
    typeMismatches: TypeValidationItem[];
  }
): {
  cleanedData: Record<string, any>[];
  appliedChangesLog: string[];
} {
  let data = sourceData.map((row) => ({ ...row }));
  const log: string[] = [];

  // 1. Remove Duplicates
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    const initialCount = data.length;
    data = data.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removedCount = initialCount - data.length;
    if (removedCount > 0) {
      log.push(`Removed ${removedCount} exact duplicate row(s).`);
    }
  }

  // 2. Handle Inconsistencies (Whitespace, Casing, Dates)
  for (const inc of options.inconsistencies) {
    if (!inc.apply) continue;

    if (inc.type === 'whitespace') {
      let count = 0;
      data.forEach((r) => {
        const v = r[inc.column];
        if (typeof v === 'string') {
          const clean = v.trim().replace(/\s+/g, ' ');
          if (clean !== v) {
            r[inc.column] = clean;
            count++;
          }
        }
      });
      log.push(`Trimmed extra whitespace in column "${inc.column}" across ${count} row(s).`);
    } else if (inc.type === 'casing') {
      let count = 0;
      data.forEach((r) => {
        const v = r[inc.column];
        if (typeof v === 'string' && v.trim()) {
          const clean = v.trim();
          const titleCase = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
          if (titleCase !== v) {
            r[inc.column] = titleCase;
            count++;
          }
        }
      });
      log.push(`Unified categorical capitalization in "${inc.column}" across ${count} row(s).`);
    } else if (inc.type === 'date_format') {
      let count = 0;
      data.forEach((r) => {
        const v = String(r[inc.column] || '').trim();
        const parsed = Date.parse(v);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (iso !== v) {
            r[inc.column] = iso;
            count++;
          }
        }
      });
      log.push(`Standardized date formats to YYYY-MM-DD in "${inc.column}" across ${count} row(s).`);
    }
  }

  // 3. Handle Missing Values
  for (const plan of options.missingPlans) {
    if (plan.chosenAction === 'keep') continue;

    if (plan.chosenAction === 'drop_rows') {
      const initial = data.length;
      data = data.filter((r) => r[plan.column] !== null && r[plan.column] !== undefined && r[plan.column] !== '');
      const dropped = initial - data.length;
      log.push(`Dropped ${dropped} row(s) containing missing values in "${plan.column}".`);
    } else if (plan.chosenAction === 'median' || plan.chosenAction === 'mode') {
      const fillValue = plan.suggestedValue;
      let filled = 0;
      data.forEach((r) => {
        if (r[plan.column] === null || r[plan.column] === undefined || r[plan.column] === '') {
          r[plan.column] = fillValue;
          filled++;
        }
      });
      log.push(`Imputed ${filled} missing value(s) in "${plan.column}" with ${plan.chosenAction} (${fillValue}).`);
    } else if (plan.chosenAction === 'constant' && plan.customConstant !== undefined) {
      let filled = 0;
      data.forEach((r) => {
        if (r[plan.column] === null || r[plan.column] === undefined || r[plan.column] === '') {
          r[plan.column] = plan.customConstant;
          filled++;
        }
      });
      log.push(`Filled ${filled} missing value(s) in "${plan.column}" with constant ("${plan.customConstant}").`);
    }
  }

  // 4. Handle Outliers (Winsorize or Drop)
  for (const out of options.outliers) {
    if (out.strategy === 'keep') continue;

    if (out.strategy === 'winsorize') {
      let capped = 0;
      data.forEach((r) => {
        const v = Number(r[out.column]);
        if (!isNaN(v)) {
          if (v > out.upperBound) {
            r[out.column] = out.upperBound;
            capped++;
          } else if (v < out.lowerBound) {
            r[out.column] = out.lowerBound;
            capped++;
          }
        }
      });
      log.push(`Winsorized ${capped} outlier(s) in "${out.column}" to IQR bounds [${out.lowerBound}, ${out.upperBound}].`);
    } else if (out.strategy === 'drop') {
      const initial = data.length;
      data = data.filter((r) => {
        const v = Number(r[out.column]);
        if (isNaN(v)) return true;
        return v >= out.lowerBound && v <= out.upperBound;
      });
      log.push(`Removed ${initial - data.length} row(s) containing extreme outliers in "${out.column}".`);
    }
  }

  // 5. Handle Type Conversions
  for (const conv of options.typeMismatches) {
    if (!conv.apply) continue;

    if (conv.suggestedType === 'number') {
      let converted = 0;
      data.forEach((r) => {
        const raw = r[conv.column];
        if (raw !== null && raw !== undefined) {
          const stripped = String(raw).replace(/[$,€£%]/g, '').trim();
          const n = Number(stripped);
          if (!isNaN(n) && stripped !== '') {
            r[conv.column] = n;
            converted++;
          }
        }
      });
      log.push(`Converted ${converted} value(s) in "${conv.column}" to numerical type.`);
    }
  }

  return {
    cleanedData: data,
    appliedChangesLog: log,
  };
}

/**
 * Export cleaned dataset to CSV file
 */
export function exportCleanedDatasetToCsv(data: Record<string, any>[], baseName: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(','),
    ...data.map((row) =>
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
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${baseName.replace(/\.[^/.]+$/, '')}_cleaned.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export cleaned dataset to Excel (.xlsx) file using SheetJS
 */
export function exportCleanedDatasetToExcel(data: Record<string, any>[], baseName: string) {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cleaned_Data');
  XLSX.writeFile(workbook, `${baseName.replace(/\.[^/.]+$/, '')}_cleaned.xlsx`);
}
