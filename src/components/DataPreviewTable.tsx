import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Hash,
  Type,
  Calendar,
  ToggleLeft
} from 'lucide-react';
import type { ColumnType, Dataset } from '../types/data';

interface DataPreviewTableProps {
  dataset: Dataset;
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({ dataset }) => {
  const { columns, data } = dataset;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter rows based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm]);

  // Sort rows based on active sort column
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination slice
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Handle column sort toggle
  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Export processed data to clean CSV
  const handleExportCsv = () => {
    if (sortedData.length === 0) return;

    const headers = columns.map((c) => c.name);
    const csvRows = [
      headers.join(','),
      ...sortedData.map((row) =>
        headers
          .map((h) => {
            const cell = row[h];
            if (cell === null || cell === undefined) return '';
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.metadata.name.replace(/\.[^/.]+$/, '')}_clean_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (type: ColumnType) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3 h-3 text-blue-600" />;
      case 'date':
        return <Calendar className="w-3 h-3 text-purple-600" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3 text-teal-600" />;
      default:
        return <Type className="w-3 h-3 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Data Preview & Records</h3>
            <p className="text-xs text-slate-500">
              Showing {sortedData.length.toLocaleString()} of {dataset.rowCount.toLocaleString()} rows • {columns.length} columns
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across all cells..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Page Size Select */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Download preview data as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[520px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header */}
          <thead className="bg-slate-100/80 sticky top-0 z-10 backdrop-blur-xs text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 w-12 text-slate-400 text-center font-mono">#</th>
              {columns.map((col) => {
                const isSorted = sortColumn === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="py-3 px-3 hover:bg-slate-200/60 transition-colors cursor-pointer select-none border-r border-slate-200/60 last:border-r-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="p-1 rounded bg-white shadow-2xs border border-slate-200">
                          {getTypeIcon(col.type)}
                        </span>
                        <span className="truncate font-bold text-slate-900" title={col.name}>
                          {col.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-slate-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1 font-normal">
                      <span>{col.type}</span>
                      {col.missingCount > 0 && (
                        <span className="text-amber-600 font-medium bg-amber-50 px-1 rounded">
                          {col.missingCount} null
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedData.map((row, rowIdx) => {
              const actualRowIdx = (currentPage - 1) * pageSize + rowIdx + 1;
              return (
                <tr key={rowIdx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px] bg-slate-50/30 border-r border-slate-100">
                    {actualRowIdx}
                  </td>
                  {columns.map((col) => {
                    const cellVal = row[col.name];
                    const isMissing = cellVal === null || cellVal === undefined || cellVal === '';

                    return (
                      <td
                        key={col.name}
                        className={`py-2.5 px-3 border-r border-slate-100/70 last:border-r-0 truncate max-w-[240px] font-mono text-[11px] ${
                          isMissing ? 'bg-amber-50/40 text-amber-500 italic' : ''
                        }`}
                        title={String(cellVal ?? '')}
                      >
                        {isMissing ? (
                          <span className="text-amber-500/80 text-[10px]">null</span>
                        ) : typeof cellVal === 'number' ? (
                          cellVal.toLocaleString()
                        ) : typeof cellVal === 'boolean' ? (
                          cellVal ? 'TRUE' : 'FALSE'
                        ) : (
                          String(cellVal)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400">
                  No rows matching your search criteria "{searchTerm}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <strong>
            {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong>
            {Math.min(currentPage * pageSize, sortedData.length)}
          </strong>{' '}
          of <strong>{sortedData.length.toLocaleString()}</strong> rows
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold text-slate-700 px-2">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
