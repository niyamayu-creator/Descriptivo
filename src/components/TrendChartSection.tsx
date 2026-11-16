import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ScatterChart,
  LineChart,
  SlidersHorizontal,
  Compass,
  Layers,
  Info,
} from 'lucide-react';
import { DatasetState } from '../types/dataset';
import { computeCorrelation, parsePossibleNumber } from '../utils/statistics';

interface TrendChartSectionProps {
  dataset: DatasetState;
}

export const TrendChartSection: React.FC<TrendChartSectionProps> = ({ dataset }) => {
  const { numericalStats, categoricalStats, columns, rawData } = dataset;
  const numColumns = Object.keys(numericalStats);
  const catColumns = Object.keys(categoricalStats);

  const [xCol, setXCol] = useState<string>(numColumns[0] || columns[0] || '');
  const [yCol, setYCol] = useState<string>(numColumns[1] || numColumns[0] || '');
  const [colorCol, setColorCol] = useState<string>('none');
  const [chartType, setChartType] = useState<'scatter_trend' | 'line' | 'scatter'>('scatter_trend');
  const [showMovingAvg, setShowMovingAvg] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Compute correlation & regression model
  const correlationResult = useMemo(() => {
    if (!xCol || !yCol) return null;
    return computeCorrelation(rawData, xCol, yCol);
  }, [rawData, xCol, yCol]);

  // Color palette for categorical grouping
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e'];

  // Category unique values if grouping selected
  const categoryMap = useMemo(() => {
    if (colorCol === 'none' || !colorCol) return null;
    const distinct = Array.from(new Set(rawData.map((r) => String(r[colorCol] || 'Sin dato'))));
    const map: Record<string, string> = {};
    distinct.forEach((cat, idx) => {
      map[cat] = palette[idx % palette.length];
    });
    return { map, categories: distinct };
  }, [colorCol, rawData]);

  if (numColumns.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        Se requieren variables numéricas para calcular tendencias bivariadas.
      </div>
    );
  }

  // Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 340;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  const points = correlationResult?.points || [];

  // Find min/max for scaling
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  if (minX === Infinity) {
    minX = 0;
    maxX = 1;
    minY = 0;
    maxY = 1;
  }

  // Add 5% padding to scale
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleMinX = minX - rangeX * 0.05;
  const scaleMaxX = maxX + rangeX * 0.05;
  const scaleMinY = minY - rangeY * 0.05;
  const scaleMaxY = maxY + rangeY * 0.05;

  const getXCoord = (val: number) => {
    return padding.left + ((val - scaleMinX) / (scaleMaxX - scaleMinX)) * chartWidth;
  };

  const getYCoord = (val: number) => {
    return padding.top + chartHeight - ((val - scaleMinY) / (scaleMaxY - scaleMinY)) * chartHeight;
  };

  // Trendline Coordinates
  const trendLineP1 = {
    x: getXCoord(minX),
    y: getYCoord((correlationResult?.slope || 0) * minX + (correlationResult?.intercept || 0)),
  };
  const trendLineP2 = {
    x: getXCoord(maxX),
    y: getYCoord((correlationResult?.slope || 0) * maxX + (correlationResult?.intercept || 0)),
  };

  // Connected Line Path (Sorted by X)
  const connectedLinePath = useMemo(() => {
    if (points.length < 2) return '';
    const sorted = [...points].sort((a, b) => a.x - b.x);
    return sorted
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getXCoord(p.x).toFixed(1)} ${getYCoord(p.y).toFixed(1)}`)
      .join(' ');
  }, [points, scaleMinX, scaleMaxX, scaleMinY, scaleMaxY]);

  // Moving Average Path (Window = 5)
  const movingAvgPath = useMemo(() => {
    if (!showMovingAvg || points.length < 5) return '';
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const windowSize = Math.max(3, Math.min(5, Math.floor(sorted.length / 3)));
    const maPoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= sorted.length - windowSize; i++) {
      let sumY = 0;
      let sumX = 0;
      for (let j = 0; j < windowSize; j++) {
        sumY += sorted[i + j].y;
        sumX += sorted[i + j].x;
      }
      maPoints.push({ x: sumX / windowSize, y: sumY / windowSize });
    }

    return maPoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getXCoord(p.x).toFixed(1)} ${getYCoord(p.y).toFixed(1)}`)
      .join(' ');
  }, [showMovingAvg, points, scaleMinX, scaleMaxX, scaleMinY, scaleMaxY]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Punto 9 • Análisis de Tendencias & Dispersión
          </span>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Tendencias Bivariadas y Modelado de Regresión
          </h3>
        </div>

        {/* View Mode */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setChartType('scatter_trend')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              chartType === 'scatter_trend'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dispersión + Recta OLS
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              chartType === 'line'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Línea Conectada
          </button>
          <button
            onClick={() => setChartType('scatter')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              chartType === 'scatter'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Solo Puntos
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
        {/* Variable X */}
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Variable Eje X (Predictor):</label>
          <select
            value={xCol}
            onChange={(e) => setXCol(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none focus:border-indigo-500"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Variable Y */}
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Variable Eje Y (Respuesta):</label>
          <select
            value={yCol}
            onChange={(e) => setYCol(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-semibold focus:outline-none focus:border-indigo-500"
          >
            {numColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Color Grouping */}
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Agrupar Color por:</label>
          <select
            value={colorCol}
            onChange={(e) => setColorCol(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="none">Sin agrupación de color</option>
            {catColumns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Moving Average Toggle */}
        <div className="flex flex-col justify-end">
          <button
            onClick={() => setShowMovingAvg(!showMovingAvg)}
            className={`w-full py-1.5 px-3 rounded-lg border font-medium transition flex items-center justify-center space-x-2 ${
              showMovingAvg
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Suavizado (Media Móvil)</span>
          </button>
        </div>
      </div>

      {/* Chart and Equation Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* SVG Chart */}
        <div className="lg:col-span-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col items-center relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Grid horizontal */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const yVal = padding.top + chartHeight * (1 - pct);
              const tickVal = scaleMinY + (scaleMaxY - scaleMinY) * pct;
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
                    {tickVal > 1000 ? tickVal.toFixed(0) : tickVal.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Grid vertical */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const xVal = padding.left + chartWidth * pct;
              const tickVal = scaleMinX + (scaleMaxX - scaleMinX) * pct;
              return (
                <g key={i}>
                  <line
                    x1={xVal}
                    y1={padding.top}
                    x2={xVal}
                    y2={padding.top + chartHeight}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={xVal}
                    y={padding.top + chartHeight + 16}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {tickVal > 1000 ? tickVal.toFixed(0) : tickVal.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Axes lines */}
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={padding.left + chartWidth}
              y2={padding.top + chartHeight}
              stroke="#334155"
              strokeWidth="1.5"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + chartHeight}
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Connected line if mode is 'line' */}
            {chartType === 'line' && connectedLinePath && (
              <path
                d={connectedLinePath}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-75"
              />
            )}

            {/* Moving Average Line */}
            {showMovingAvg && movingAvgPath && (
              <path
                d={movingAvgPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeLinecap="round"
                className="opacity-90"
              />
            )}

            {/* Linear Regression Line */}
            {chartType === 'scatter_trend' && correlationResult && (
              <line
                x1={trendLineP1.x}
                y1={trendLineP1.y}
                x2={trendLineP2.x}
                y2={trendLineP2.y}
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                className="drop-shadow-md"
              />
            )}

            {/* Scatter Data Points */}
            {points.map((p, idx) => {
              const cx = getXCoord(p.x);
              const cy = getYCoord(p.y);
              const isHovered = hoveredPoint?.idx === idx;

              let dotColor = '#3b82f6';
              if (categoryMap && colorCol !== 'none') {
                const catVal = String(p.originalRow[colorCol] || 'Sin dato');
                dotColor = categoryMap.map[catVal] || '#3b82f6';
              }

              return (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 4.5}
                  fill={dotColor}
                  fillOpacity={isHovered ? 1 : 0.8}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1}
                  onMouseEnter={() => setHoveredPoint({ ...p, idx })}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer transition-all duration-100"
                />
              );
            })}

            {/* Axis titles */}
            <text
              x={padding.left + chartWidth / 2}
              y={padding.top + chartHeight + 36}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="bold"
            >
              {xCol} →
            </text>
            <text
              x={-(padding.top + chartHeight / 2)}
              y={padding.left - 42}
              textAnchor="middle"
              transform="rotate(-90)"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="bold"
            >
              ↑ {yCol}
            </text>
          </svg>

          {/* Hover card */}
          {hoveredPoint && (
            <div className="absolute top-4 right-4 bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 z-20 pointer-events-none animate-in fade-in">
              <p className="font-bold text-white">Registro #{hoveredPoint.idx + 1}</p>
              <p className="text-slate-300">
                <span className="text-slate-400">{xCol}:</span>{' '}
                <strong className="text-white font-mono">{hoveredPoint.x}</strong>
              </p>
              <p className="text-slate-300">
                <span className="text-slate-400">{yCol}:</span>{' '}
                <strong className="text-cyan-400 font-mono">{hoveredPoint.y}</strong>
              </p>
              {colorCol !== 'none' && (
                <p className="text-indigo-400">
                  {colorCol}: {hoveredPoint.originalRow[colorCol]}
                </p>
              )}
            </div>
          )}

          {/* Category legend if grouped */}
          {categoryMap && categoryMap.categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-[11px] border-t border-slate-800/80 w-full mt-2">
              <span className="text-slate-400 font-medium">{colorCol}:</span>
              {categoryMap.categories.slice(0, 6).map((cat) => (
                <span key={cat} className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: categoryMap.map[cat] }}
                  />
                  <span>{cat}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Regression Insights Panel */}
        {correlationResult && (
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Ecuación de Regresión
              </span>

              {/* Formula Badge */}
              <div className="mt-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs">
                <span className="text-[10px] text-cyan-400 font-mono block mb-1">
                  Modelo Lineal Estimado (MCO):
                </span>
                <p className="font-mono font-bold text-white text-sm">
                  Y = {correlationResult.slope >= 0 ? '+' : ''}
                  {correlationResult.slope.toFixed(3)} · X + {correlationResult.intercept.toFixed(2)}
                </p>
              </div>

              {/* Statistics list */}
              <div className="space-y-2.5 mt-4 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Coef. Pearson (r):</span>
                  <span
                    className={`font-bold ${
                      Math.abs(correlationResult.r) >= 0.5
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {correlationResult.r >= 0 ? '+' : ''}
                    {correlationResult.r.toFixed(3)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Bondad de Ajuste (R²):</span>
                  <span className="text-white font-bold">
                    {(correlationResult.r2 * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Pendiente (m):</span>
                  <span className="text-cyan-300">{correlationResult.slope.toFixed(4)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Intersección (b):</span>
                  <span className="text-slate-300">{correlationResult.intercept.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Casos evaluados:</span>
                  <span className="text-slate-300">{correlationResult.validPointsCount}</span>
                </div>
              </div>
            </div>

            {/* Natural language interpretation */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" /> Veredicto de Tendencia:
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {correlationResult.interpretation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
