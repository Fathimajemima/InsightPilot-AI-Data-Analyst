import React from 'react';
import { FileSpreadsheet, X, Check, Table2 } from 'lucide-react';

interface SheetSelectorModalProps {
  isOpen: boolean;
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  onSelectSheet: (sheetName: string) => void;
  onClose: () => void;
}

export const SheetSelectorModal: React.FC<SheetSelectorModalProps> = ({
  isOpen,
  fileName,
  sheetNames,
  activeSheet,
  onSelectSheet,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-selector-title"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="sheet-selector-title" className="font-bold text-slate-900 text-base">Select Worksheet to Analyze</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{fileName}</p>
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

        <div className="p-6">
          <p className="text-xs text-slate-600 mb-4">
            This Excel workbook contains <strong>{sheetNames.length} worksheets</strong>. Choose which sheet you want to load into InsightPilot AI:
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sheetNames.map((sheet, index) => {
              const isSelected = sheet === activeSheet;
              return (
                <button
                  key={sheet}
                  onClick={() => {
                    onSelectSheet(sheet);
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-mono">
                      {index + 1}
                    </span>
                    <Table2 className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">{sheet}</span>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>You can switch worksheets anytime</span>
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
