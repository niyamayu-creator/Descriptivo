import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  Sliders,
  TrendingDown,
  TrendingUp,
  Activity,
  Info,
} from 'lucide-react';
import { DatasetState, NumericalStats } from '../types/dataset';
import { parsePossibleNumber } from '../utils/statistics';

interface HistogramSectionProps {
  dataset: DatasetState;
}

export const HistogramSection: React.FC<HistogramSectionProps> = ({ dataset }) => {
  const { numericalStats, rawData } = dataset;
  const numColumns = Object.keys(numericalStats);

  const [selectedColumn, setSelectedColumn] = useState<string>(
    numColumns[0] || ''
  );
  const [binCount, setBinCount] = useState<number>(14);
  const [showNormalCurve, setShowNormalCurve] = useState<boolean>(true);
  const [hoveredBin, setHoveredBin] = useState<any | null>(null);

  // Extract clean numbers for selected column
  const stats: NumericalStats | undefined = numericalStats[selectedColumn];

  const binsData = useMemo(() => {
    if (!selectedColumn || !stats || stats.validCount === 0) return null;

    const values: number[] = [];
    for (const row of rawData) {
      const num = parsePossibleNumber(row[selectedColumn]);
      if (num !== null) values.push(num);
    }

    if (values.length === 0) return null;

    const min = stats.min;
    const max = stats.max;
    const range = max - min;

    // Handle zero range edgecase
    if (range === 0) {
      return {
        bins: [{ x0: min, x1: max, count: values.length, percent: 100 }],
        maxCount: values.length,
        binWidth: 1,
      };
    }

    const effectiveBins = Math.max(3, binCount);
    const binWidth = range / effectiveBins;
    const bins: { x0: number; x1: number; count: number; percent: number }[] = [];

    for (let i = 0; i < effectiveBins; i++) {
      const x0 = min + i * binWidth;
      const x1 = i === effectiveBins - 1 ? max : min + (i + 1) * binWidth;
      bins.push({ x0, x1, count: 0, percent: 0 });
    }

    for (const v of values) {
      let placed = false;
      for (let i = 0; i < effectiveBins; i++) {
        const isLast = i === effectiveBins - 1;
        if ((v >= bins[i].x0 && v < bins[i].x1) || (isLast && v === bins[i].x1)) {
          bins[i].count++;
          placed = true;
          break;
        }
      }
      if (!placed && bins.length > 0) {
        bins[bins.length - 1].count++;
      }
    }

    let maxCount = 0;
    for (const b of bins) {
      b.percent = (b.count / values.length) * 100;
      if (b.count > maxCount) maxCount = b.count;
    }

    return { bins, maxCount, binWidth };
  }, [selectedColumn, binCount, rawData, stats]);

  if (numColumns.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        No se detectaron variables numéricas para generar histogramas.
      </div>
    );
  }

  // Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 320;
  const padding = { top: 30, right: 30, bottom: 50, left: 55 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Scale calculations
  const minVal = stats?.min ?? 0;
  const maxVal = stats?.max ?? 1;
  const maxFreq = binsData ? Math.max(1, binsData.maxCount) : 1;

  const getX = (val: number) => {
    if (maxVal === minVal) return padding.left + chartWidth / 2;
    return padding.left + ((val - minVal) / (maxVal - minVal)) * chartWidth;
  };

  const getY = (count: number) => {
    return padding.top + chartHeight - (count / maxFreq) * chartHeight;
  };

  // Normal curve path generation
  const normalCurvePoints = useMemo(() => {
    if (!stats || !showNormalCurve || stats.stdDev === 0 || !binsData) return '';

    const mean = stats.mean;
    const std = stats.stdDev;
    const binWidth = binsData.binWidth;
    const totalN = stats.validCount;

    // Normal probability density function scaled to bin frequency count
    // count approx = totalN * binWidth * (1 / (std * sqrt(2*pi))) * exp(-0.5 * ((x-mean)/std)^2)
    const points: string[] = [];
    const steps = 60;

    for (let i = 0; i <= steps; i++) {
      const xVal = minVal + (i / steps) * (maxVal - minVal);
      const exponent = -0.5 * Math.pow((xVal - mean) / std, 2);
      const pdf = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      const expectedCount = totalN * binWidth * pdf;
      const xPos = getX(xVal);
      const yPos = getY(Math.min(maxFreq * 1.5, expectedCount));
      points.push(`${i === 0 ? 'M' : 'L'} ${xPos.toFixed(1)} ${yPos.toFixed(1)}`);
    }

    return points.join(' ');
  }, [stats, showNormalCurve, binsData, minVal, maxVal, maxFreq]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Punto 8 • Distribución & Frecuencias
          </span>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            Histograma Interactivo de Distribución
          </h3>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Column Selector */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400">Variable:</span>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              {numColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Bins Slider */}
          <div className="flex items-center space-x-2 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Intervalos (Bins):</span>
            <input
              type="range"
              min={5}
              max={30}
              value={binCount}
              onChange={(e) => setBinCount(Number(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer"
            />
            <span className="font-mono text-indigo-300 w-5 text-right">{binCount}</span>
          </div>

          {/* Toggle Normal Curve */}
          <button
            onClick={() => setShowNormalCurve(!showNormalCurve)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition flex items-center space-x-1.5 ${
              showNormalCurve
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Curva Normal</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* SVG Chart */}
        <div className="lg:col-span-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Grid lines horizontal */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const yVal = padding.top + chartHeight * (1 - pct);
              const countVal = Math.round(maxFreq * pct);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={yVal}
                    x2={padding.left + chartWidth}
                    y2={yVal}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={yVal + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {countVal}
                  </text>
                </g>
              );
            })}

            {/* X-axis line */}
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight}
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Histogram Bars */}
            {binsData &&
              binsData.bins.map((bin, idx) => {
                const x0 = getX(bin.x0);
                const x1 = getX(bin.x1);
                const barW = Math.max(2, x1 - x0 - 2);
                const barH = (bin.count / maxFreq) * chartHeight;
                const barY = padding.top + chartHeight - barH;
                const isHovered = hoveredBin === bin;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredBin(bin)}
                    onMouseLeave={() => setHoveredBin(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x0 + 1}
                      y={barY}
                      width={barW}
                      height={barH}
                      rx={3}
                      fill={isHovered ? '#6366f1' : '#3b82f6'}
                      fillOpacity={isHovered ? 0.95 : 0.75}
                      stroke={isHovered ? '#818cf8' : '#2563eb'}
                      strokeWidth={1}
                      className="transition-all duration-150"
                    />
                    {/* Bin tick label */}
                    <text
                      x={x0 + barW / 2}
                      y={padding.top + chartHeight + 16}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {bin.x0.toFixed(1)}
                    </text>
                  </g>
                );
              })}

            {/* Max boundary label on X-axis */}
            {binsData && binsData.bins.length > 0 && (
              <text
                x={padding.left + chartWidth}
                y={padding.top + chartHeight + 16}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                {maxVal.toFixed(1)}
              </text>
            )}

            {/* Normal Distribution Curve */}
            {showNormalCurve && normalCurvePoints && (
              <path
                d={normalCurvePoints}
                fill="none"
                stroke="#ec4899"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="opacity-80"
              />
            )}

            {/* Mean Vertical Line */}
            {stats && (
              <g>
                <line
                  x1={getX(stats.mean)}
                  y1={padding.top}
                  x2={getX(stats.mean)}
                  y2={padding.top + chartHeight}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <text
                  x={getX(stats.mean) + 4}
                  y={padding.top + 12}
                  fill="#10b981"
                  fontSize="10"
                  fontWeight="bold"
                >
                  μ: {stats.mean.toFixed(1)}
                </text>
              </g>
            )}

            {/* Median Vertical Line */}
            {stats && (
              <g>
                <line
                  x1={getX(stats.median)}
                  y1={padding.top + 20}
                  x2={getX(stats.median)}
                  y2={padding.top + chartHeight}
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="2 3"
                />
                <text
                  x={getX(stats.median) - 4}
                  y={padding.top + 26}
                  textAnchor="end"
                  fill="#06b6d4"
                  fontSize="10"
                  fontWeight="bold"
                >
                  Me: {stats.median.toFixed(1)}
                </text>
              </g>
            )}
          </svg>

          {/* Hover tooltip card */}
          {hoveredBin && (
            <div className="absolute top-4 right-4 bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1 z-10 pointer-events-none animate-in fade-in">
              <p className="font-semibold text-white">
                Rango: [{hoveredBin.x0.toFixed(2)} - {hoveredBin.x1.toFixed(2)}]
              </p>
              <p className="text-indigo-400 font-mono">
                Frecuencia: {hoveredBin.count} registros
              </p>
              <p className="text-slate-400">
                Proporción: {hoveredBin.percent.toFixed(1)}%
              </p>
            </div>
          )}

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-[11px] text-slate-400 border-t border-slate-800/80 w-full mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" /> Frecuencia de Datos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block border-t border-dashed" /> Media (μ = {stats?.mean.toFixed(1)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block border-t border-dotted" /> Mediana (Me = {stats?.median.toFixed(1)})
            </span>
            {showNormalCurve && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-pink-500 inline-block" /> Campana de Gauss (Aprox. Normal)
              </span>
            )}
          </div>
        </div>

        {/* Distribution Interpretation Panel */}
        {stats && (
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Diagnóstico de Forma
              </span>
              <div className="mt-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <div className="font-bold text-white mb-0.5 flex items-center gap-1.5">
                  {stats.skewness > 0.4 ? (
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                  ) : stats.skewness < -0.4 ? (
                    <TrendingDown className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-emerald-400" />
                  )}
                  {stats.distributionShape}
                </div>
                <p className="text-[11px] text-indigo-200/80">
                  {stats.skewness > 0.4
                    ? 'Los datos se concentran en valores menores con una cola extendida hacia valores altos.'
                    : stats.skewness < -0.4
                    ? 'Los datos se concentran en valores altos con una cola extendida hacia valores bajos.'
                    : 'La distribución presenta un equilibrio armónico cercano a una curva normal simétrica.'}
                </p>
              </div>

              <div className="space-y-2 mt-4 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Asimetría (Skewness):</span>
                  <span className="text-white font-semibold">{stats.skewness.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Curtosis (Apuntamiento):</span>
                  <span className="text-white font-semibold">{stats.kurtosis.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Desviación Estándar (σ):</span>
                  <span className="text-cyan-400 font-semibold">{stats.stdDev.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Coef. Variación (CV):</span>
                  <span className="text-amber-400 font-semibold">{stats.cv.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-cyan-400" /> Rango Efectivo:
              </span>
              <p>Mínimo: {stats.min} | Máximo: {stats.max}</p>
              <p>Amplitud total (Rango): {(stats.max - stats.min).toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
