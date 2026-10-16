import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileCode, 
  FileText, 
  FileArchive, 
  File, 
  Layers, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { detectFileFormat } from '../utils/fileParsers';
import type { SupportedFormat } from '../types/data';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  onSelectSamplePreset: (presetId: string) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelected,
  isLoading,
  errorMessage,
  onClearError,
  onSelectSamplePreset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFormat, setDraggedFormat] = useState<SupportedFormat | 'unsupported' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file') {
        const mime = item.type.toLowerCase();
        if (mime.includes('csv')) setDraggedFormat('csv');
        else if (mime.includes('sheet') || mime.includes('excel')) setDraggedFormat('xlsx');
        else if (mime.includes('json')) setDraggedFormat('json');
        else if (mime.includes('xml')) setDraggedFormat('xml');
        else if (mime.includes('pdf')) setDraggedFormat('pdf');
        else if (mime.includes('word') || mime.includes('docx')) setDraggedFormat('docx');
        else if (mime.includes('zip')) setDraggedFormat('zip');
        else setDraggedFormat(null);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDraggedFormat(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDraggedFormat(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelected(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelected(file);
      // Reset input value so same file can be re-uploaded if needed
      e.target.value = '';
    }
  };

  const supportedPills = [
    { ext: '.csv', label: 'CSV', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { ext: '.xlsx, .xls', label: 'Excel Workbooks', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { ext: '.json', label: 'JSON / NDJSON', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { ext: '.tsv', label: 'TSV', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { ext: '.txt', label: 'TXT Tables', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { ext: '.parquet', label: 'Parquet', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { ext: '.xml', label: 'XML Records', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { ext: '.docx', label: 'Word Tables', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { ext: '.pdf', label: 'PDF Reports', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { ext: '.zip', label: 'ZIP Archives', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  ];

  return (
    <div className="space-y-4">
      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">Parsing or File Error</h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={onClearError}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 px-2 py-1 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01] shadow-lg ring-4 ring-blue-500/10'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50 shadow-xs'
        } ${isLoading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.json,.tsv,.txt,.parquet,.xml,.pdf,.docx,.zip,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,application/zip,application/pdf"
          onChange={handleFileInputChange}
        />

        <div className="max-w-xl mx-auto space-y-4">
          {/* Main Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          {/* Heading */}
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {isLoading
                ? 'Processing & Analyzing Dataset...'
                : isDragging
                ? 'Drop file here to analyze immediately'
                : 'Upload Business Dataset to Analyze'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Drag & drop your file here, or{' '}
              <span className="text-blue-600 font-semibold underline underline-offset-2">browse computer</span>
            </p>
          </div>

          {/* Format Badges Grid */}
          <div className="pt-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              10 Supported Business File Formats
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-lg mx-auto">
              {supportedPills.map((p) => (
                <span
                  key={p.ext}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border ${p.color}`}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-4 pt-1">
            <span>• Up to 50 MB</span>
            <span>• 100% Private Browser Parsing</span>
            <span>• Multi-sheet Excel & ZIP Supported</span>
          </div>
        </div>
      </div>

      {/* Quick 1-Click Samples Section */}
      <div className="p-4 bg-slate-50/90 border border-slate-200/80 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">No file ready? Test with 1-click sample datasets:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onSelectSamplePreset('ecommerce-sales')}
              className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>E-Commerce Sales (CSV)</span>
            </button>
            <button
              onClick={() => onSelectSamplePreset('saas-metrics')}
              className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-800 hover:text-blue-900 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>SaaS ARR Metrics (JSON)</span>
            </button>
            <button
              onClick={() => onSelectSamplePreset('hr-workforce')}
              className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>Workforce HR (TSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
