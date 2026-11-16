import React, { useState } from 'react';
import {
  Boxes,
  Maximize2,
  Minimize2,
  AlertOctagon,
  Sparkles,
  Info,
  CheckCircle,
} from 'lucide-react';
import { DatasetState, NumericalStats } from '../types/dataset';
import { parsePossibleNumber } from '../utils/statistics';

interface BoxplotSectionProps {
  dataset: DatasetState;
}

export const BoxplotSection: React.FC<BoxplotSectionProps> = ({ dataset }) => {
  const { numericalStats, rawData } = dataset;
  const numColumns = Object.keys(numericalStats);

  const [scaleMode, setScaleMode] = useState<'standardized' | 'minmax' | 'raw'>('standardized');
  const [selectedSingleCol, setSelectedSingleCol] = useState<string>('all');
  const [hoveredBox, setHoveredBox] = useState<string | null>(null);

  if (numColumns.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        No hay variables numéricas disponibles para generar Boxplots.
      </div>
    );
  }

  // Determine active columns
  const activeColumns =
    selectedSingleCol === 'all' ? numColumns : [selectedSingleCol];

  // SVG dimensions
  const svgWidth = Math.max(720, activeColumns.length * 90 + 120);
  const svgHeight = 360;
  const padding = { top: 40, right: 30, bottom: 70, left: 60 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Scale domain
  let domainMin = 0;
  let domainMax = 100;

  if (scaleMode === 'standardized') {
    // Z-Score typically between -3.5 and +3.5
    domainMin = -3.5;
    domainMax = 3.5;
  } else if (scaleMode === 'minmax') {
    domainMin = 0;
    domainMax = 100;
  } else {
    // Raw scale (best used for 1 selected variable or variables with same unit)
    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (const col of activeColumns) {
      const s = numericalStats[col];
      if (s) {
        if (s.min < globalMin) globalMin = s.min;
        if (s.max > globalMax) globalMax = s.max;
      }
    }
    const pad = (globalMax - globalMin) * 0.05 || 1;
    domainMin = globalMin - pad;
    domainMax = globalMax + pad;
  }

  const getYCoord = (val: number) => {
    const clamped = Math.max(domainMin, Math.min(domainMax, val));
    return padding.top + chartHeight - ((clamped - domainMin) / (domainMax - domainMin)) * chartHeight;
  };

  // Convert raw value to scaled value based on active mode
  const scaleValue = (val: number, s: NumericalStats): number => {
    if (scaleMode === 'standardized') {
      return s.stdDev > 0 ? (val - s.mean) / s.stdDev : 0;
    }
    if (scaleMode === 'minmax') {
      const rng = s.max - s.min;
      return rng > 0 ? ((val - s.min) / rng) * 100 : 50;
    }
    return val;
  };

  // Compute box metrics for a column
  const getBoxMetrics = (col: string) => {
    const s = numericalStats[col];
    if (!s) return null;

    return {
      scaledMin: scaleValue(s.min, s),
      scaledLowerWhisker: scaleValue(s.lowerWhisker, s),
      scaledQ1: scaleValue(s.q1, s),
      scaledMedian: scaleValue(s.median, s),
      scaledQ3: scaleValue(s.q3, s),
      scaledUpperWhisker: scaleValue(s.upperWhisker, s),
      scaledMax: scaleValue(s.max, s),
      scaledOutliers: s.outliers.map((o) => ({
        raw: o,
        scaled: scaleValue(o, s),
      })),
      stats: s,
    };
  };

  const colWidth = chartWidth / activeColumns.length;
  const boxWidth = Math.min(48, Math.max(24, colWidth * 0.5));

  // Count total outliers
  const totalOutliersAll = numColumns.reduce(
    (acc, c) => acc + (numericalStats[c]?.outlierCount || 0),
    0
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Punto 10 • Diagrama de Cajas & Bigotes
          </span>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-cyan-400" />
            Boxplot para Todas las Variables y Detección de Outliers
          </h3>
        </div>

        {/* View Mode & Column Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scale mode */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setScaleMode('standardized')}
              title="Escala Z-Score (-3σ a +3σ) para comparar variables con diferentes magnitudes"
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                scaleMode === 'standardized'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Estandarizado (Z-Score)
            </button>
            <button
              onClick={() => setScaleMode('minmax')}
              title="Escala 0% a 100% normalizada"
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                scaleMode === 'minmax'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Min-Max (0-100%)
            </button>
            <button
              onClick={() => setScaleMode('raw')}
              title="Valores reales sin escalar"
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                scaleMode === 'raw'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Valores Reales
            </button>
          </div>

          {/* Filter single variable */}
          <select
            value={selectedSingleCol}
            onChange={(e) => setSelectedSingleCol(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas las variables ({numColumns.length})</option>
            {numColumns.map((c) => (
              <option key={c} value={c}>
                Solo {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Explanatory banner for standardized comparison */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {scaleMode === 'standardized'
              ? 'Vista Estandarizada Z-Score: Permite visualizar todas las variables en un plano común centrada en su media (0) con desviación (-3 a +3), permitiendo detectar asimetrías y outliers directamente sin distorsión de escalas.'
              : scaleMode === 'minmax'
              ? 'Vista Min-Max Normalizada: Muestra el rango relativo de dispersión de cada variable en un rango de 0% a 100%.'
              : 'Vista de Valores Reales: Muestra los valores numéricos directos sin transformación matemática.'}
          </span>
        </span>
        <span className="font-mono text-rose-400 font-semibold shrink-0 ml-3">
          {totalOutliersAll} Outliers Totales
        </span>
      </div>

      {/* Boxplot SVG Graphic */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="min-w-full h-auto select-none overflow-visible"
          style={{ width: `${svgWidth}px` }}
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + chartHeight * (1 - pct);
            const tickVal = domainMin + (domainMax - domainMin) * pct;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {scaleMode === 'standardized'
                    ? `${tickVal > 0 ? '+' : ''}${tickVal.toFixed(1)}σ`
                    : scaleMode === 'minmax'
                    ? `${tickVal.toFixed(0)}%`
                    : tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Zero baseline for standardized mode */}
          {scaleMode === 'standardized' && (
            <line
              x1={padding.left}
              y1={getYCoord(0)}
              x2={padding.left + chartWidth}
              y2={getYCoord(0)}
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="opacity-60"
            />
          )}

          {/* Render Each Boxplot */}
          {activeColumns.map((col, idx) => {
            const m = getBoxMetrics(col);
            if (!m) return null;

            const cx = padding.left + idx * colWidth + colWidth / 2;
            const isHovered = hoveredBox === col;

            const yUpperWhisker = getYCoord(m.scaledUpperWhisker);
            const yQ3 = getYCoord(m.scaledQ3);
            const yMedian = getYCoord(m.scaledMedian);
            const yQ1 = getYCoord(m.scaledQ1);
            const yLowerWhisker = getYCoord(m.scaledLowerWhisker);

            const boxH = Math.max(3, yQ1 - yQ3);

            return (
              <g
                key={col}
                onMouseEnter={() => setHoveredBox(col)}
                onMouseLeave={() => setHoveredBox(null)}
                className="cursor-pointer transition-all"
              >
                {/* Column background hover highlight */}
                {isHovered && (
                  <rect
                    x={cx - colWidth / 2 + 4}
                    y={padding.top}
                    width={colWidth - 8}
                    height={chartHeight}
                    fill="#312e81"
                    fillOpacity="0.15"
                    rx={6}
                  />
                )}

                {/* Vertical whisker line (Tukey range) */}
                <line
                  x1={cx}
                  y1={yUpperWhisker}
                  x2={cx}
                  y2={yLowerWhisker}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />

                {/* Upper Whisker horizontal cap */}
                <line
                  x1={cx - boxWidth * 0.3}
                  y1={yUpperWhisker}
                  x2={cx + boxWidth * 0.3}
                  y2={yUpperWhisker}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />

                {/* Lower Whisker horizontal cap */}
                <line
                  x1={cx - boxWidth * 0.3}
                  y1={yLowerWhisker}
                  x2={cx + boxWidth * 0.3}
                  y2={yLowerWhisker}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />

                {/* Interquartile Box (Q1 to Q3) */}
                <rect
                  x={cx - boxWidth / 2}
                  y={yQ3}
                  width={boxWidth}
                  height={boxH}
                  rx={4}
                  fill={isHovered ? '#6366f1' : '#3b82f6'}
                  fillOpacity={isHovered ? 0.9 : 0.75}
                  stroke={isHovered ? '#a5b4fc' : '#60a5fa'}
                  strokeWidth="1.5"
                  className="transition-all duration-150 drop-shadow-sm"
                />

                {/* Median Line (Q2) */}
                <line
                  x1={cx - boxWidth / 2}
                  y1={yMedian}
                  x2={cx + boxWidth / 2}
                  y2={yMedian}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Outliers dots */}
                {m.scaledOutliers.map((outlier, oIdx) => {
                  const oy = getYCoord(outlier.scaled);
                  return (
                    <circle
                      key={oIdx}
                      cx={cx}
                      cy={oy}
                      r={3.5}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="1"
                      className="transition-transform hover:scale-150"
                    >
                      <title>{`Outlier en ${col}: ${outlier.raw}`}</title>
                    </circle>
                  );
                })}

                {/* Column Name on X-axis */}
                <text
                  x={cx}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : '#cbd5e1'}
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  className="truncate"
                >
                  {col.length > 12 ? `${col.slice(0, 10)}...` : col}
                </text>

                {/* Outlier count badge below name */}
                {m.stats.outlierCount > 0 && (
                  <text
                    x={cx}
                    y={padding.top + chartHeight + 36}
                    textAnchor="middle"
                    fill="#f43f5e"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ⚠ {m.stats.outlierCount} outliers
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Outlier Detail Table & Column Inspection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Outlier Detection Summary */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            Resumen de Valores Atípicos (Método Rango Intercuartil 1.5×IQR):
          </span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {numColumns.map((col) => {
              const s = numericalStats[col];
              if (!s || s.outlierCount === 0) return null;

              return (
                <div
                  key={col}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800"
                >
                  <div>
                    <span className="font-medium text-white">{col}</span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      Umbrales: [{s.lowerWhisker.toFixed(1)} a {s.upperWhisker.toFixed(1)}]
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold font-mono">
                      {s.outlierCount} anomalías
                    </span>
                    <span
                      className="text-[10px] text-slate-500 block truncate max-w-[140px]"
                      title={s.outliers.slice(0, 5).join(', ')}
                    >
                      Ej: {s.outliers.slice(0, 3).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })}
            {totalOutliersAll === 0 && (
              <div className="p-3 text-center text-slate-400 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                No se detectaron valores extremos fuera de los límites de Tukey.
              </div>
            )}
          </div>
        </div>

        {/* Selected or Hovered Details */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-2">
              <Info className="w-4 h-4 text-indigo-400" />
              Lectura del Diagrama ({hoveredBox || activeColumns[0]}):
            </span>
            {(() => {
              const inspectingCol = hoveredBox || activeColumns[0];
              const s = numericalStats[inspectingCol];
              if (!s) return null;

              return (
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Mínimo:</span>
                    <span className="text-white">{s.min}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Bigote Inferior:</span>
                    <span className="text-white">{s.lowerWhisker.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Primer Cuartil (Q1 25%):</span>
                    <span className="text-indigo-300">{s.q1.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="text-white font-bold">Mediana (Q2 50%):</span>
                    <span className="text-cyan-400 font-bold">{s.median.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tercer Cuartil (Q3 75%):</span>
                    <span className="text-indigo-300">{s.q3.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Bigote Superior:</span>
                    <span className="text-white">{s.upperWhisker.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Rango Intercuartílico (IQR):</span>
                    <span className="text-emerald-400">{s.iqr.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
          <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800">
            * Pasa el ratón sobre cada caja para ver sus estadísticos cuartílicos exactos.
          </p>
        </div>
      </div>
    </div>
  );
};
