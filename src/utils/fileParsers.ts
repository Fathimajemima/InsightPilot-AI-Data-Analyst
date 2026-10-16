/**
 * Multi-format file parsing engine for InsightPilot AI
 * Supports: CSV, Excel (.xlsx, .xls), JSON, TSV, TXT, Parquet, XML, DOCX, PDF, and ZIP
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import * as mammoth from 'mammoth';
import { parquetRead } from 'hyparquet';
import type { FileMetadata, SupportedFormat, ZipEntryItem } from '../types/data';

export interface ParseResult {
  data: Record<string, any>[];
  metadata: FileMetadata;
}

/**
 * Detect file format from File object, file name, or MIME type
 */
export function detectFileFormat(fileOrName: File | string, mimeType?: string): SupportedFormat | 'unsupported' {
  const fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
  const mime = typeof fileOrName === 'string' ? (mimeType || '').toLowerCase() : fileOrName.type.toLowerCase();
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return 'csv';
    case 'xlsx':
      return 'xlsx';
    case 'xls':
      return 'xls';
    case 'json':
      return 'json';
    case 'tsv':
      return 'tsv';
    case 'txt':
      return 'txt';
    case 'parquet':
      return 'parquet';
    case 'xml':
      return 'xml';
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'zip':
      return 'zip';
    default:
      // Fallback to MIME check
      if (mime.includes('csv')) return 'csv';
      if (mime.includes('sheet') || mime.includes('excel')) return 'xlsx';
      if (mime.includes('json')) return 'json';
      if (mime.includes('xml')) return 'xml';
      if (mime.includes('pdf')) return 'pdf';
      if (mime.includes('word') || mime.includes('docx')) return 'docx';
      if (mime.includes('zip')) return 'zip';
      return 'unsupported';
  }
}

/**
 * Format bytes into human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Clean and normalize record keys & values
 */
export function cleanRecords(records: Record<string, any>[]): Record<string, any>[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  // Filter out completely empty rows
  return records
    .map((row) => {
      const cleanRow: Record<string, any> = {};
      let hasData = false;

      for (const [key, rawVal] of Object.entries(row)) {
        const cleanKey = String(key || '').trim();
        if (!cleanKey) continue;

        let val = rawVal;
        if (typeof val === 'string') {
          val = val.trim();
          if (val === '' || val === 'null' || val === 'NULL' || val === 'N/A' || val === 'undefined') {
            val = null;
          } else {
            // Check if string can be cleanly converted to number without losing precision
            const numVal = Number(val);
            if (!isNaN(numVal) && !val.startsWith('0') && val !== '') {
              val = numVal;
            }
          }
        } else if (val === undefined) {
          val = null;
        }

        if (val !== null && val !== '') {
          hasData = true;
        }

        cleanRow[cleanKey] = val;
      }

      return hasData ? cleanRow : null;
    })
    .filter((r): r is Record<string, any> => r !== null);
}

/**
 * Parse CSV / TSV text or file using PapaParse
 */
export function parseDelimitedText(
  content: string, 
  fileName: string, 
  fileSize: number, 
  format: 'csv' | 'tsv' | 'txt'
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(content, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && (!results.data || results.data.length === 0)) {
          reject(new Error(`Delimited text parsing failed: ${results.errors[0].message}`));
          return;
        }

        const cleaned = cleanRecords(results.data);
        if (cleaned.length === 0) {
          reject(new Error('The file contains no readable data rows or header columns.'));
          return;
        }

        resolve({
          data: cleaned,
          metadata: {
            name: fileName,
            size: fileSize,
            format,
            mimeType: format === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
          },
        });
      },
      error: (error: any) => {
        reject(new Error(`Failed to parse ${format.toUpperCase()}: ${error.message}`));
      },
    });
  });
}

/**
 * Inspect an Excel file to get list of sheet names
 */
export async function readExcelWorkbookInfo(file: File | ArrayBuffer, fileName: string) {
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const workbook = XLSX.read(buffer, { type: 'array' });
  
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets.');
  }

  return {
    workbook,
    sheetNames: workbook.SheetNames,
  };
}

/**
 * Extract data from a specific Excel sheet
 */
export function extractDataFromExcelSheet(
  workbook: XLSX.WorkBook, 
  sheetName: string, 
  fileName: string, 
  fileSize: number
): ParseResult {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" was not found in workbook.`);
  }

  const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: null,
    raw: false, // Formats numbers/dates cleanly
  });

  const cleaned = cleanRecords(rawData);
  if (cleaned.length === 0) {
    throw new Error(`Sheet "${sheetName}" is empty or has no readable tabular rows.`);
  }

  const extension = fileName.endsWith('.xls') ? 'xls' : 'xlsx';

  return {
    data: cleaned,
    metadata: {
      name: fileName,
      size: fileSize,
      format: extension,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      activeSheetName: sheetName,
      sheetNames: workbook.SheetNames,
    },
  };
}

/**
 * Parse JSON file (handles array of objects, nested data payloads, JSON lines)
 */
export function parseJsonContent(content: string, fileName: string, fileSize: number): ParseResult {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try JSON Lines (NDJSON)
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    const ndjsonRecords: any[] = [];
    for (const line of lines) {
      try {
        ndjsonRecords.push(JSON.parse(line));
      } catch {
        throw new Error('Invalid JSON format. Could not parse as standard JSON or JSON Lines.');
      }
    }
    if (ndjsonRecords.length > 0) {
      parsed = ndjsonRecords;
    } else {
      throw new Error('JSON file is empty or corrupted.');
    }
  }

  let rows: Record<string, any>[] = [];

  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
      rows = parsed;
    } else if (parsed.length > 1 && Array.isArray(parsed[0])) {
      // Array of arrays where first row is header
      const headers = parsed[0].map(String);
      rows = parsed.slice(1).map((rowArr: any[]) => {
        const obj: Record<string, any> = {};
        headers.forEach((h: string, idx: number) => {
          obj[h] = rowArr[idx] ?? null;
        });
        return obj;
      });
    } else {
      // Array of primitives
      rows = parsed.map((item, idx) => ({ Index: idx + 1, Value: item }));
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Look for common array wrappers like data, records, results, items, rows
    const candidateKeys = ['data', 'records', 'results', 'items', 'rows', 'users', 'orders', 'products', 'values'];
    let foundArrayKey: string | null = null;

    for (const key of candidateKeys) {
      if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
        foundArrayKey = key;
        break;
      }
    }

    if (!foundArrayKey) {
      // Find any property that is an array of objects
      for (const [key, val] of Object.entries(parsed)) {
        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
          foundArrayKey = key;
          break;
        }
      }
    }

    if (foundArrayKey && Array.isArray(parsed[foundArrayKey])) {
      rows = parsed[foundArrayKey];
    } else {
      // Single object key-value pairs
      rows = Object.entries(parsed).map(([key, value]) => ({
        Attribute: key,
        Value: typeof value === 'object' ? JSON.stringify(value) : value,
      }));
    }
  }

  const cleaned = cleanRecords(rows);
  if (cleaned.length === 0) {
    throw new Error('JSON structure did not contain tabular records or attributes.');
  }

  return {
    data: cleaned,
    metadata: {
      name: fileName,
      size: fileSize,
      format: 'json',
      mimeType: 'application/json',
    },
  };
}

/**
 * Parse structured TXT file (supports Markdown tables, pipe-separated, tab/comma separated)
 */
export function parseStructuredTxt(content: string, fileName: string, fileSize: number): ParseResult {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    throw new Error('The TXT file has fewer than 2 lines. Tabular data requires at least a header and one data row.');
  }

  // Check if markdown table (contains | and divider |---|)
  const isMarkdownTable = lines.some((l) => l.includes('|') && l.includes('---'));
  if (isMarkdownTable) {
    const tableLines = lines.filter((l) => l.includes('|') && !l.includes('---'));
    if (tableLines.length >= 2) {
      const headers = tableLines[0]
        .split('|')
        .map((h) => h.trim())
        .filter(Boolean);

      const rows: Record<string, any>[] = [];
      for (let i = 1; i < tableLines.length; i++) {
        const cells = tableLines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => (tableLines[i].startsWith('|') ? idx > 0 && idx <= headers.length : true));

        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = cells[idx] ?? null;
        });
        rows.push(row);
      }

      const cleaned = cleanRecords(rows);
      if (cleaned.length > 0) {
        return {
          data: cleaned,
          metadata: {
            name: fileName,
            size: fileSize,
            format: 'txt',
            mimeType: 'text/plain',
            extractionNotice: 'Parsed as Markdown-formatted table structure.',
          },
        };
      }
    }
  }

  // Check for delimiter like pipe, tab, or comma
  const sample = lines.slice(0, 5).join('\n');
  const pipeCount = (sample.match(/\|/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;

  if (pipeCount > 4 || tabCount > 4 || commaCount > 4) {
    // Delimited TXT
    const delimiter = pipeCount > tabCount && pipeCount > commaCount ? '|' : tabCount > commaCount ? '\t' : ',';
    const parsed = Papa.parse<Record<string, any>>(content, {
      header: true,
      delimiter,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
    });

    const cleaned = cleanRecords(parsed.data);
    if (cleaned.length > 0) {
      return {
        data: cleaned,
        metadata: {
          name: fileName,
          size: fileSize,
          format: 'txt',
          mimeType: 'text/plain',
          extractionNotice: `Parsed using detected "${delimiter}" delimiter.`,
        },
      };
    }
  }

  // Check for Key: Value format
  const isKeyValue = lines.every((l) => l.includes(':'));
  if (isKeyValue && lines.length > 0) {
    const rows = lines.map((l, idx) => {
      const splitIdx = l.indexOf(':');
      return {
        Index: idx + 1,
        Key: l.substring(0, splitIdx).trim(),
        Value: l.substring(splitIdx + 1).trim(),
      };
    });
    return {
      data: cleanRecords(rows),
      metadata: {
        name: fileName,
        size: fileSize,
        format: 'txt',
        mimeType: 'text/plain',
        extractionNotice: 'Parsed as structured Key: Value records.',
      },
    };
  }

  throw new Error(
    'The text file does not have a recognizable tabular layout. Ensure columns are separated by commas, tabs, or pipes (|), or formatted as a Markdown table.'
  );
}

/**
 * Parse XML file by recursively searching for repeating records
 */
export function parseXmlContent(content: string, fileName: string, fileSize: number): ParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true,
  });

  const parsed = parser.parse(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid XML document. Root element not found.');
  }

  let candidates: any[] = [];

  // Helper to find repeating array of records in nested object
  function findArrayInObject(obj: any): any[] | null {
    if (!obj || typeof obj !== 'object') return null;

    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return val;
      }
    }

    for (const val of Object.values(obj)) {
      if (typeof val === 'object' && val !== null) {
        const nested = findArrayInObject(val);
        if (nested) return nested;
      }
    }

    return null;
  }

  const foundArray = findArrayInObject(parsed);
  if (foundArray && foundArray.length > 0) {
    candidates = foundArray;
  } else {
    // If no repeating elements, flatten top-level dictionary
    const flatRows: Record<string, any>[] = [];
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'object' && v !== null) {
        for (const [subK, subV] of Object.entries(v)) {
          flatRows.push({
            Category: k,
            Property: subK,
            Value: typeof subV === 'object' ? JSON.stringify(subV) : subV,
          });
        }
      } else {
        flatRows.push({
          Category: 'Root',
          Property: k,
          Value: v,
        });
      }
    }
    candidates = flatRows;
  }

  const cleaned = cleanRecords(candidates);
  if (cleaned.length === 0) {
    throw new Error('No structured records or table data found in the XML document.');
  }

  return {
    data: cleaned,
    metadata: {
      name: fileName,
      size: fileSize,
      format: 'xml',
      mimeType: 'application/xml',
      extractionNotice: `Successfully extracted ${cleaned.length} records from XML hierarchy.`,
    },
  };
}

/**
 * Parse Apache Parquet file using hyparquet
 */
export async function parseParquetBuffer(buffer: ArrayBuffer, fileName: string, fileSize: number): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    try {
      parquetRead({
        file: buffer,
        onComplete: (rows: any[]) => {
          if (!rows || rows.length === 0) {
            reject(new Error('Parquet file contains no rows or data tables.'));
            return;
          }

          // hyparquet returns rows either as array of objects or array of arrays
          let recordList: Record<string, any>[] = [];
          if (Array.isArray(rows[0])) {
            // Rows are arrays; convert to indexed or named
            recordList = rows.map((r, rIdx) => {
              const obj: Record<string, any> = {};
              r.forEach((val: any, cIdx: number) => {
                obj[`Column_${cIdx + 1}`] = val;
              });
              return obj;
            });
          } else if (typeof rows[0] === 'object') {
            recordList = rows;
          }

          const cleaned = cleanRecords(recordList);
          resolve({
            data: cleaned,
            metadata: {
              name: fileName,
              size: fileSize,
              format: 'parquet',
              mimeType: 'application/vnd.apache.parquet',
              extractionNotice: 'Parsed high-performance columnar Apache Parquet data.',
            },
          });
        },
      });
    } catch (err: any) {
      reject(new Error(`Failed to decode Parquet file: ${err.message || 'Corrupted or unsupported Parquet schema'}`));
    }
  });
}

/**
 * Parse Word Document (.docx) to extract tables using mammoth
 */
export async function parseDocxBuffer(buffer: ArrayBuffer, fileName: string, fileSize: number): Promise<ParseResult> {
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = result.value;

    if (!html || !html.includes('<table')) {
      throw new Error(
        'No data tables found in this Word (.docx) document. To analyze data from Word, make sure your data is formatted inside a Word Table (Insert > Table).'
      );
    }

    // Parse table from HTML using DOMParser in browser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    if (!table) {
      throw new Error('Could not locate table element in Word document.');
    }

    const tableRows = Array.from(table.querySelectorAll('tr'));
    if (tableRows.length < 2) {
      throw new Error('The table in the Word document needs at least a header row and one data row.');
    }

    // Extract headers from first tr (either th or td)
    const headerCells = Array.from(tableRows[0].querySelectorAll('th, td')).map((c) => c.textContent?.trim() || '');
    const headers = headerCells.map((h, i) => h || `Column_${i + 1}`);

    const extractedRows: Record<string, any>[] = [];
    for (let r = 1; r < tableRows.length; r++) {
      const cells = Array.from(tableRows[r].querySelectorAll('td, th'));
      const rowObj: Record<string, any> = {};
      let hasData = false;

      headers.forEach((h, cIdx) => {
        const text = cells[cIdx]?.textContent?.trim() ?? '';
        if (text) hasData = true;
        rowObj[h] = text;
      });

      if (hasData) {
        extractedRows.push(rowObj);
      }
    }

    const cleaned = cleanRecords(extractedRows);
    if (cleaned.length === 0) {
      throw new Error('Table in Word document was empty.');
    }

    return {
      data: cleaned,
      metadata: {
        name: fileName,
        size: fileSize,
        format: 'docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extractionNotice: `Extracted table with ${cleaned.length} rows and ${headers.length} columns from Word document.`,
      },
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to read Word document.');
  }
}

/**
 * Extract table from PDF using client-side pdfjs-dist
 */
export async function parsePdfBuffer(buffer: ArrayBuffer, fileName: string, fileSize: number): Promise<ParseResult> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Configure worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    const allLines: { y: number; x: number; text: string }[] = [];

    // Scan up to first 5 pages to extract tables
    const maxPages = Math.min(pdf.numPages, 5);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      for (const item of textContent.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const transform = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
        const x = transform[4];
        const y = transform[5];
        allLines.push({ x, y, text: item.str.trim() });
      }
    }

    if (allLines.length === 0) {
      throw new Error('The PDF document contains no selectable text (it may be a scanned image or protected).');
    }

    // Group text items by y-coordinate (with a small tolerance for row alignment)
    const rowTolerance = 4;
    const sortedByY = [...allLines].sort((a, b) => b.y - a.y); // top to bottom

    const rowGroups: { y: number; items: { x: number; text: string }[] }[] = [];
    for (const item of sortedByY) {
      const matchGroup = rowGroups.find((g) => Math.abs(g.y - item.y) <= rowTolerance);
      if (matchGroup) {
        matchGroup.items.push({ x: item.x, text: item.text });
      } else {
        rowGroups.push({ y: item.y, items: [{ x: item.x, text: item.text }] });
      }
    }

    // Sort items within each row left to right
    for (const group of rowGroups) {
      group.items.sort((a, b) => a.x - b.x);
    }

    // Filter rows that have multiple columns (table candidate)
    const multiColRows = rowGroups.filter((g) => g.items.length >= 2);

    if (multiColRows.length < 2) {
      throw new Error(
        'Could not detect a structured tabular layout in this PDF. PDF reports work best when data is presented in aligned columns.'
      );
    }

    // Pick header row (first row with maximum or typical column count)
    const headerRow = multiColRows[0];
    const headers = headerRow.items.map((it, idx) => it.text || `Col_${idx + 1}`);

    const extractedRows: Record<string, any>[] = [];
    for (let r = 1; r < multiColRows.length; r++) {
      const rowGroup = multiColRows[r];
      const rowObj: Record<string, any> = {};

      headers.forEach((h, idx) => {
        rowObj[h] = rowGroup.items[idx]?.text ?? null;
      });

      extractedRows.push(rowObj);
    }

    const cleaned = cleanRecords(extractedRows);
    if (cleaned.length === 0) {
      throw new Error('Extracted table rows were empty.');
    }

    return {
      data: cleaned,
      metadata: {
        name: fileName,
        size: fileSize,
        format: 'pdf',
        mimeType: 'application/pdf',
        extractionNotice: `Extracted table grid (${cleaned.length} rows, ${headers.length} columns) from PDF report.`,
      },
    };
  } catch (err: any) {
    throw new Error(
      err.message || 'Unable to extract structured tabular data from PDF. Please ensure the PDF is not encrypted or scanned.'
    );
  }
}

/**
 * Inspect ZIP archive and list files inside
 */
export async function inspectZipArchive(file: File): Promise<ZipEntryItem[]> {
  const zip = new JSZip();
  const buffer = await file.arrayBuffer();
  const contents = await zip.loadAsync(buffer);

  const items: ZipEntryItem[] = [];

  for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
    if (zipEntry.dir) continue;
    // Skip hidden files like __MACOSX
    if (relativePath.includes('__MACOSX') || relativePath.startsWith('.')) continue;

    const detected = detectFileFormat(zipEntry.name);

    // Get uncompressed size from metadata
    const size = (zipEntry as any)._data?.uncompressedSize || 0;

    items.push({
      name: relativePath,
      size,
      detectedFormat: detected,
      isSupported: detected !== 'unsupported' && detected !== 'zip',
    });
  }

  if (items.length === 0) {
    throw new Error('The ZIP archive is empty or contains only folders.');
  }

  return items;
}

/**
 * Extract a specific file from a ZIP archive and parse it
 */
export async function extractAndParseFileFromZip(zipFile: File, relativePath: string): Promise<ParseResult> {
  const zip = new JSZip();
  const buffer = await zipFile.arrayBuffer();
  const contents = await zip.loadAsync(buffer);

  const entry = contents.file(relativePath);
  if (!entry) {
    throw new Error(`File "${relativePath}" not found inside ZIP archive.`);
  }

  const format = detectFileFormat(relativePath);

  if (format === 'unsupported' || format === 'zip') {
    throw new Error(`Format of "${relativePath}" is not directly supported for dataset analysis.`);
  }

  const fileData = await entry.async('arraybuffer');
  const baseName = relativePath.split('/').pop() || relativePath;

  const result = await parseFileBuffer(fileData, baseName, format, fileData.byteLength);
  result.metadata.extractedFromArchive = zipFile.name;
  return result;
}

/**
 * Universal dispatcher to parse any supported format buffer
 */
export async function parseFileBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  format: SupportedFormat,
  fileSize: number
): Promise<ParseResult> {
  const decoder = new TextDecoder('utf-8');

  switch (format) {
    case 'csv': {
      const text = decoder.decode(buffer);
      return parseDelimitedText(text, fileName, fileSize, 'csv');
    }
    case 'tsv': {
      const text = decoder.decode(buffer);
      return parseDelimitedText(text, fileName, fileSize, 'tsv');
    }
    case 'json': {
      const text = decoder.decode(buffer);
      return parseJsonContent(text, fileName, fileSize);
    }
    case 'txt': {
      const text = decoder.decode(buffer);
      return parseStructuredTxt(text, fileName, fileSize);
    }
    case 'xml': {
      const text = decoder.decode(buffer);
      return parseXmlContent(text, fileName, fileSize);
    }
    case 'xlsx':
    case 'xls': {
      const info = await readExcelWorkbookInfo(buffer, fileName);
      // Default to first sheet
      return extractDataFromExcelSheet(info.workbook, info.sheetNames[0], fileName, fileSize);
    }
    case 'parquet': {
      return parseParquetBuffer(buffer, fileName, fileSize);
    }
    case 'docx': {
      return parseDocxBuffer(buffer, fileName, fileSize);
    }
    case 'pdf': {
      return parsePdfBuffer(buffer, fileName, fileSize);
    }
    default:
      throw new Error(`Unsupported file format: ${format}`);
  }
}
