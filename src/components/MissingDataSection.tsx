import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileX,
  Gauge,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ColumnMetadata, DatasetState } from '../types/dataset';
import { isMissing } from '../utils/statistics';

interface MissingDataSectionProps {
  dataset: DatasetState;
}

export const MissingDataSection: React.FC<MissingDataSectionProps> = ({ dataset }) => {
  const [onlyMissingFilter, setOnlyMissingFilter] = useState(false);

  const {
    totalRows,
    totalColumns,
    missingTotal,
    missingCellsPercent,
    completeRowsCount,
    incompleteRowsCount,
    columns,
    columnMeta,
    rawData,
  } = dataset;

  const totalCells = totalRows * totalColumns;
  const completenessPercent = Math.max(0, 100 - missingCellsPercent);

  // Filter columns based on missing toggle
  const displayedColumns = columns.filter((col) => {
    if (!onlyMissingFilter) return true;
    return (columnMeta[col]?.missingCount || 0) > 0;
  });

  const getSeverityBadge = (percent: number) => {
    if (percent === 0) {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Completo (0%)
        </span>
      );
    }
    if (percent < 5) {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Leve ({percent.toFixed(1)}%)
        </span>
      );
    }
    if (percent <= 20) {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Moderado ({percent.toFixed(1)}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
        Crítico ({percent.toFixed(1)}%)
      </span>
    );
  };

  // Sample matrix preview (first 25 rows)
  const matrixSampleRows = rawData.slice(0, 25);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Punto 6 • Diagnóstico de Calidad
          </span>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <FileX className="w-4 h-4 text-cyan-400" />
            Análisis de Datos Faltantes (Missing Values & Imputación)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMissingFilter}
              onChange={(e) => setOnlyMissingFilter(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Mostrar solo columnas con valores faltantes</span>
          </label>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Completitud Global</span>
            <div className="text-xl font-bold text-white">
              {completenessPercent.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500">
              {totalCells.toLocaleString()} celdas evaluadas
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Total Celdas Vacías</span>
            <div className="text-xl font-bold text-rose-400">
              {missingTotal.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">
              {missingCellsPercent.toFixed(2)}% del volumen total
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Registros Completos</span>
            <div className="text-xl font-bold text-emerald-400">
              {completeRowsCount.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">
              {totalRows > 0 ? ((completeRowsCount / totalRows) * 100).toFixed(1) : 0}% de filas intactas
            </span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Registros con Omisiones</span>
            <div className="text-xl font-bold text-amber-400">
              {incompleteRowsCount.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500">
              {totalRows > 0 ? ((incompleteRowsCount / totalRows) * 100).toFixed(1) : 0}% requieren atención
            </span>
          </div>
        </div>
      </div>

      {/* Per Column Missingness Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
        <div className="overflow-x-auto max-h-[340px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700/80 sticky top-0 z-10">
                <th className="py-2.5 px-4 font-semibold">Variable / Columna</th>
                <th className="py-2.5 px-4 font-semibold">Tipo</th>
                <th className="py-2.5 px-4 font-semibold text-center">Faltantes (N)</th>
                <th className="py-2.5 px-4 font-semibold text-center">Válidos (N)</th>
                <th className="py-2.5 px-4 font-semibold text-center">% Faltante</th>
                <th className="py-2.5 px-4 font-semibold w-48">Barra de Completitud</th>
                <th className="py-2.5 px-4 font-semibold text-center">Severidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayedColumns.map((col) => {
                const meta = columnMeta[col];
                if (!meta) return null;
                const colCompleteness = Math.max(0, 100 - meta.missingPercent);

                return (
                  <tr key={col} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-medium text-white">{col}</td>
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {meta.type}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      <span
                        className={meta.missingCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}
                      >
                        {meta.missingCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                      {meta.validCount}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      <span
                        className={meta.missingPercent > 0 ? 'text-amber-400 font-medium' : 'text-slate-400'}
                      >
                        {meta.missingPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all"
                          style={{ width: `${colCompleteness}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full transition-all"
                          style={{ width: `${meta.missingPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>{colCompleteness.toFixed(1)}% Completo</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {getSeverityBadge(meta.missingPercent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Missingness Matrix (Mini Heat-Strip) */}
      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Matriz de Presencia / Ausencia de Datos (Muestra de las primeras {matrixSampleRows.length} filas)
          </span>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Dato Válido
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Faltante (NA)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <div
            className="grid gap-1 min-w-[500px]"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(35px, 1fr))`,
            }}
          >
            {/* Header row labels */}
            {columns.map((col) => (
              <div
                key={col}
                className="text-[9px] font-mono text-slate-400 truncate text-center pb-1"
                title={col}
              >
                {col.slice(0, 5)}
              </div>
            ))}

            {/* Matrix cells */}
            {matrixSampleRows.map((row, rIdx) =>
              columns.map((col) => {
                const missing = isMissing(row[col]);
                return (
                  <div
                    key={`${rIdx}-${col}`}
                    title={`Fila ${rIdx + 1}, ${col}: ${missing ? 'Faltante (Nulo)' : row[col]}`}
                    className={`h-3 rounded-sm transition-opacity hover:opacity-80 ${
                      missing ? 'bg-rose-500/80 shadow-xs shadow-rose-500/50' : 'bg-slate-700/60'
                    }`}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
