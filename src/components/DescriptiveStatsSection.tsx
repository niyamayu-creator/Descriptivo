import React, { useState } from 'react';
import {
  Calculator,
  Download,
  Search,
  Hash,
  Type,
  TrendingUp,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { DatasetState, NumericalStats, CategoricalStats } from '../types/dataset';

interface DescriptiveStatsSectionProps {
  dataset: DatasetState;
}

export const DescriptiveStatsSection: React.FC<DescriptiveStatsSectionProps> = ({ dataset }) => {
  const [tab, setTab] = useState<'numerical' | 'categorical'>('numerical');
  const [search, setSearch] = useState('');

  const { numericalStats, categoricalStats, columnMeta } = dataset;

  const numericalColumns = Object.keys(numericalStats).filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const categoricalColumns = Object.keys(categoricalStats).filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const formatNum = (num: number, decimals = 2) => {
    if (isNaN(num) || num === null) return 'N/A';
    return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(decimals);
  };

  const exportStatsCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (tab === 'numerical') {
      csvContent += 'Variable,N_Valido,Media,Desv_Estandar,Minimo,Q1_25,Mediana_50,Q3_75,Maximo,IQR,CV_Pct,Asimetria,Curtosis,Outliers\n';
      numericalColumns.forEach((col) => {
        const s = numericalStats[col];
        if (s) {
          csvContent += `"${col}",${s.validCount},${s.mean.toFixed(3)},${s.stdDev.toFixed(3)},${s.min},${s.q1.toFixed(3)},${s.median.toFixed(3)},${s.q3.toFixed(3)},${s.max},${s.iqr.toFixed(3)},${s.cv.toFixed(2)}%,${s.skewness.toFixed(3)},${s.kurtosis.toFixed(3)},${s.outlierCount}\n`;
        }
      });
    } else {
      csvContent += 'Variable,N_Valido,Valores_Unicos,Moda,Frecuencia_Moda,Porcentaje_Moda\n';
      categoricalColumns.forEach((col) => {
        const s = categoricalStats[col];
        if (s) {
          csvContent += `"${col}",${s.validCount},${s.uniqueCount},"${s.mode}",${s.modeFreq},${s.modePercent.toFixed(2)}%\n`;
        }
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resumen_estadistico_${tab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Punto 7 • Estadísticas Descriptivas
          </span>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            Resumen Estadístico Multivariado Completo
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tab Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTab('numerical')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                tab === 'numerical'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Variables Numéricas ({Object.keys(numericalStats).length})</span>
            </button>
            <button
              onClick={() => setTab('categorical')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                tab === 'categorical'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Variables Categóricas ({Object.keys(categoricalStats).length})</span>
            </button>
          </div>

          {/* Export CSV button */}
          <button
            onClick={exportStatsCSV}
            className="flex items-center space-x-1.5 text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full sm:w-72">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filtrar por variable..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Numerical Table View */}
      {tab === 'numerical' && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700/80 sticky top-0 z-20">
                  <th className="py-2.5 px-3 font-semibold text-white">Variable</th>
                  <th className="py-2.5 px-3 font-semibold text-center">N Válido</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Media (μ)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Desv. Est (σ)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Mín</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Q1 (25%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-cyan-300">Mediana (50%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Q3 (75%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Máx</th>
                  <th className="py-2.5 px-3 font-semibold text-right">IQR</th>
                  <th className="py-2.5 px-3 font-semibold text-right">CV (%)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Asimetría</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Curtosis</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Outliers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {numericalColumns.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-6 text-center text-slate-500 font-sans">
                      No se encontraron variables numéricas con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  numericalColumns.map((col) => {
                    const s = numericalStats[col];
                    if (!s) return null;

                    return (
                      <tr key={col} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-sans font-semibold text-white whitespace-nowrap">
                          {col}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400">
                          {s.validCount}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                          {formatNum(s.mean)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatNum(s.stdDev)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {formatNum(s.min)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatNum(s.q1)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-cyan-300 font-bold bg-cyan-950/20">
                          {formatNum(s.median)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatNum(s.q3)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {formatNum(s.max)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-indigo-300">
                          {formatNum(s.iqr)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-300">
                          {formatNum(s.cv, 1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300" title={s.distributionShape}>
                          {s.skewness.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {s.kurtosis.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.outlierCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans font-semibold">
                              {s.outlierCount}
                            </span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categorical Table View */}
      {tab === 'categorical' && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700/80 sticky top-0 z-20">
                  <th className="py-2.5 px-4 font-semibold text-white">Variable Categórica</th>
                  <th className="py-2.5 px-4 font-semibold text-center">N Válido</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Cardinalidad (Únicos)</th>
                  <th className="py-2.5 px-4 font-semibold">Moda (Valor más frecuente)</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Frecuencia Moda</th>
                  <th className="py-2.5 px-4 font-semibold text-center">% de Moda</th>
                  <th className="py-2.5 px-4 font-semibold w-72">Top Categorías</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {categoricalColumns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                      No se encontraron variables categóricas con el filtro actual.
                    </td>
                  </tr>
                ) : (
                  categoricalColumns.map((col) => {
                    const s = categoricalStats[col];
                    if (!s) return null;

                    return (
                      <tr key={col} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 font-medium text-white">{col}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                          {s.validCount}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-cyan-300 font-semibold">
                          {s.uniqueCount}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-emerald-400">
                          {s.mode}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                          {s.modeFreq}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                          {s.modePercent.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="space-y-1">
                            {s.topCategories.slice(0, 3).map((cat, i) => (
                              <div key={i} className="flex items-center space-x-2 text-[11px]">
                                <span className="truncate max-w-[100px] text-slate-300" title={cat.label}>
                                  {cat.label}:
                                </span>
                                <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-indigo-500 h-full rounded-full"
                                    style={{ width: `${cat.percent}%` }}
                                  />
                                </div>
                                <span className="font-mono text-slate-400 text-[10px]">
                                  {cat.percent.toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
