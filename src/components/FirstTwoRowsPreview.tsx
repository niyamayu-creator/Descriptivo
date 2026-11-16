import React, { useState } from 'react';
import {
  Table,
  Eye,
  Rows,
  ChevronLeft,
  ChevronRight,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import { ColumnMetadata } from '../types/dataset';
import { isMissing } from '../utils/statistics';

interface FirstTwoRowsPreviewProps {
  rawData: Record<string, any>[];
  columns: string[];
  columnMeta: Record<string, ColumnMetadata>;
}

export const FirstTwoRowsPreview: React.FC<FirstTwoRowsPreviewProps> = ({
  rawData,
  columns,
  columnMeta,
}) => {
  const [viewMode, setViewMode] = useState<'2rows' | '5rows' | 'all'>('2rows');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalRows = rawData.length;
  const totalPages = Math.ceil(totalRows / pageSize);

  const displayedRows =
    viewMode === '2rows'
      ? rawData.slice(0, 2)
      : viewMode === '5rows'
      ? rawData.slice(0, 5)
      : rawData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const startIndex = viewMode === 'all' ? (currentPage - 1) * pageSize : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
              Punto 4 • Visualización de Muestra
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {viewMode === '2rows' ? '2 Primeras Filas (Destacado)' : `${displayedRows.length} Filas`}
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <Rows className="w-4 h-4 text-cyan-400" />
            Inspección de las Primeras Filas del Dataset
          </h3>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('2rows')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === '2rows'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Primeras 2 Filas
          </button>
          <button
            onClick={() => setViewMode('5rows')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === '5rows'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Primeras 5 Filas
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Explorador Completo
          </button>
        </div>
      </div>

      {/* Highlights note if 2 rows */}
      {viewMode === '2rows' && (
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
            Mostrando exactamente los <strong>2 primeros registros</strong> para verificación inicial de encabezados y consistencia de atributos.
          </span>
          <span className="text-[11px] text-indigo-300 font-mono">
            Total en archivo: {totalRows.toLocaleString()} registros
          </span>
        </div>
      )}

      {/* Table container */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
        <div className="overflow-x-auto max-h-[380px] scrollbar-thin scrollbar-thumb-slate-700">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700/80 sticky top-0 z-20">
                <th className="py-2.5 px-3 font-semibold text-slate-400 text-center w-16 border-r border-slate-700/50">
                  # Fila
                </th>
                {columns.map((col) => {
                  const meta = columnMeta[col];
                  return (
                    <th key={col} className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{col}</span>
                        {meta && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {meta.type}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayedRows.map((row, rowIdx) => {
                const actualIndex = startIndex + rowIdx + 1;
                const isFirstOrSecond = actualIndex <= 2;

                return (
                  <tr
                    key={rowIdx}
                    className={`transition hover:bg-slate-800/40 ${
                      isFirstOrSecond && viewMode === '2rows'
                        ? 'bg-indigo-950/20'
                        : rowIdx % 2 === 0
                        ? 'bg-slate-900/30'
                        : 'bg-slate-950/30'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-semibold text-center border-r border-slate-800/80">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          isFirstOrSecond
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                            : 'text-slate-400'
                        }`}
                      >
                        {actualIndex}
                      </span>
                    </td>
                    {columns.map((col) => {
                      const val = row[col];
                      const missing = isMissing(val);

                      return (
                        <td key={col} className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                          {missing ? (
                            <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                              Nulo
                            </span>
                          ) : typeof val === 'boolean' ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                val
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {val ? 'TRUE' : 'FALSE'}
                            </span>
                          ) : typeof val === 'number' ? (
                            <span className="font-mono text-cyan-300">
                              {Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)}
                            </span>
                          ) : (
                            <span className="truncate max-w-[200px] inline-block" title={String(val)}>
                              {String(val)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls when in 'all' view */}
      {viewMode === 'all' && (
        <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
          <span>
            Mostrando registros {startIndex + 1} a {Math.min(startIndex + pageSize, totalRows)} de{' '}
            {totalRows}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-200">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
