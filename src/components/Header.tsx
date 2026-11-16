import React from 'react';
import {
  FileSpreadsheet,
  Upload,
  Sparkles,
  Printer,
  RotateCcw,
  Layers,
  Database,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { DatasetState } from '../types/dataset';
import { DEMO_DATASETS } from '../utils/fileParser';

interface HeaderProps {
  dataset: DatasetState | null;
  onOpenUpload: () => void;
  onLoadDemo: (demoId: string) => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataset,
  onOpenUpload,
  onLoadDemo,
  onReset,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand logo & title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  DataScope
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  EDA Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Plataforma de Análisis Descriptivo & Inteligencia Estadística
              </p>
            </div>
          </div>

          {/* Center info when dataset loaded */}
          {dataset && (
            <div className="hidden lg:flex items-center space-x-4 bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-300">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span className="font-medium truncate max-w-[150px]" title={dataset.fileName}>
                  {dataset.fileName}
                </span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1 text-slate-300">
                <span className="font-semibold text-white">{dataset.totalRows.toLocaleString()}</span>
                <span className="text-slate-400">filas</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1 text-slate-300">
                <span className="font-semibold text-white">{dataset.totalColumns}</span>
                <span className="text-slate-400">variables</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300 font-medium truncate max-w-[140px]">
                  {dataset.sectorContext.sector}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Demo Selector */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Ejemplos</span>
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-1.5 hidden group-hover:block hover:block z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                  Datasets de Prueba
                </div>
                {DEMO_DATASETS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => onLoadDemo(demo.id)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white transition flex flex-col"
                  >
                    <span className="font-medium">{demo.name}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-indigo-200">
                      {demo.sector} • {demo.rows} filas
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-md shadow-indigo-600/25 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cargar Archivo</span>
            </button>

            {dataset && (
              <>
                {/* Print/Export */}
                <button
                  onClick={handlePrint}
                  title="Imprimir / Exportar Reporte"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                >
                  <Printer className="w-4 h-4" />
                </button>

                {/* Reset */}
                <button
                  onClick={onReset}
                  title="Limpiar datos"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/50 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
