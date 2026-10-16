import React from 'react';
import { FileArchive, X, FileSpreadsheet, FileCode, FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import type { ZipEntryItem } from '../types/data';
import { formatFileSize } from '../utils/fileParsers';

interface ZipFileSelectorModalProps {
  isOpen: boolean;
  zipName: string;
  entries: ZipEntryItem[];
  onSelectEntry: (relativePath: string) => void;
  onClose: () => void;
}

export const ZipFileSelectorModal: React.FC<ZipFileSelectorModalProps> = ({
  isOpen,
  zipName,
  entries,
  onSelectEntry,
  onClose,
}) => {
  if (!isOpen) return null;

  const supportedEntries = entries.filter((e) => e.isSupported);
  const unsupportedEntries = entries.filter((e) => !e.isSupported);

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'json':
      case 'xml':
        return <FileCode className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zip-inspector-title"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 id="zip-inspector-title" className="font-bold text-slate-900 text-base">ZIP Archive Inspector</h3>
              <p className="text-xs text-slate-500 truncate max-w-sm">{zipName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Found <strong>{supportedEntries.length} supported data file(s)</strong> inside this ZIP archive. Choose which one to extract and analyze:
            </p>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {supportedEntries.map((item) => (
              <div
                key={item.name}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                    {getFormatIcon(item.detectedFormat)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="uppercase font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                        {item.detectedFormat}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(item.size)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectEntry(item.name);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <span>Analyze</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {supportedEntries.length === 0 && (
              <div className="p-6 text-center border-2 border-dashed border-amber-200 bg-amber-50 rounded-xl space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-amber-900">No supported data files found in this archive</p>
                <p className="text-xs text-amber-700">Supported formats: CSV, Excel (.xlsx/.xls), JSON, TSV, TXT, Parquet, XML, DOCX, PDF.</p>
              </div>
            )}
          </div>

          {unsupportedEntries.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer hover:text-slate-700 font-medium">
                  Show {unsupportedEntries.length} non-data files in archive
                </summary>
                <div className="mt-2 space-y-1 pl-2 text-[11px] text-slate-400 max-h-24 overflow-y-auto">
                  {unsupportedEntries.map((e) => (
                    <div key={e.name} className="truncate">
                      {e.name} ({formatFileSize(e.size)})
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
