import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Send,
  RefreshCw,
  Award,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Building2,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { DatasetState } from '../types/dataset';
import { computeCorrelation } from '../utils/statistics';

interface ExpertAnalysisSectionProps {
  dataset: DatasetState;
}

export const ExpertAnalysisSection: React.FC<ExpertAnalysisSectionProps> = ({ dataset }) => {
  const [analysisText, setAnalysisText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userQuery, setUserQuery] = useState<string>('');
  const [isAiPowered, setIsAiPowered] = useState<boolean>(true);
  const [conversation, setConversation] = useState<{ role: 'user' | 'expert'; text: string }[]>([]);

  // Local Statistical Heuristic Engine (Resilient fallback & foundation)
  const generateHeuristicReport = () => {
    const {
      totalRows,
      totalColumns,
      missingCellsPercent,
      completeRowsCount,
      sectorContext,
      numericalStats,
      categoricalStats,
      rawData,
    } = dataset;

    const numCols = Object.keys(numericalStats);
    const catCols = Object.keys(categoricalStats);

    // Find highest correlation among numeric pairs
    let bestPair: { x: string; y: string; r: number; r2: number; dir: string } | null = null;
    let maxAbsR = -1;

    for (let i = 0; i < numCols.length; i++) {
      for (let j = i + 1; j < numCols.length; j++) {
        const res = computeCorrelation(rawData, numCols[i], numCols[j]);
        if (Math.abs(res.r) > maxAbsR && res.validPointsCount > 3) {
          maxAbsR = Math.abs(res.r);
          bestPair = {
            x: numCols[i],
            y: numCols[j],
            r: res.r,
            r2: res.r2,
            dir: res.direction,
          };
        }
      }
    }

    // Find variables with highest skewness & outliers
    const mostSkewed = [...numCols].sort(
      (a, b) => Math.abs(numericalStats[b].skewness) - Math.abs(numericalStats[a].skewness)
    )[0];

    const mostOutliers = [...numCols].sort(
      (a, b) => numericalStats[b].outlierCount - numericalStats[a].outlierCount
    )[0];

    return `
### 1. Resumen Ejecutivo y Diagnóstico del Sector
- **Sector Identificado:** ${sectorContext.sector} (${sectorContext.confidence}% de certeza semántica).
- **Alcance de los Datos:** Dataset compuesto por **${totalRows.toLocaleString()} observaciones** y **${totalColumns} variables**, evaluando un total de ${(totalRows * totalColumns).toLocaleString()} puntos de datos.
- **Salud del Registro:** La completitud global es del **${(100 - missingCellsPercent).toFixed(1)}%**, con **${completeRowsCount} registros 100% íntegros**. ${
      missingCellsPercent < 5
        ? 'El nivel de calidad es óptimo para modelado estadístico sin sesgos graves de atrición.'
        : 'Se identificaron celdas faltantes que aconsejan estrategias de imputación robusta (KNN o mediana) previo a modelos paramétricos.'
    }

### 2. Análisis Profundo de Tendencias y Patrones Clave
${
  bestPair
    ? `- **Relación Dominante Detectada:** Se observa una asociación ${
        Math.abs(bestPair.r) >= 0.7 ? 'altamente significativa' : 'moderada'
      } entre **${bestPair.x}** y **${bestPair.y}** con un coeficiente de correlación de Pearson **r = ${bestPair.r.toFixed(3)}** (R² de ${(bestPair.r2 * 100).toFixed(1)}%).
- **Comportamiento:** Tendencia ${bestPair.dir}, lo cual sugiere que cambios en ${bestPair.x} explican de forma consistente la variabilidad de ${bestPair.y}.`
    : '- Se recomienda analizar las variables numéricas de forma individual para identificar patrones no lineales o estacionales.'
}
${
  mostSkewed
    ? `- **Asimetría Marcada:** La variable **${mostSkewed}** presenta un coeficiente de asimetría de **${numericalStats[mostSkewed].skewness.toFixed(2)}** (${numericalStats[mostSkewed].distributionShape}). Esto indica una concentración desigual donde la mediana (${numericalStats[mostSkewed].median.toFixed(1)}) resulta más representativa que la media (${numericalStats[mostSkewed].mean.toFixed(1)}).`
    : ''
}

### 3. Detección de Anomalías y Valores Atípicos (Outliers)
${
  mostOutliers && numericalStats[mostOutliers].outlierCount > 0
    ? `- **Variable con mayor concentración de atípicos:** **${mostOutliers}** cuenta con **${numericalStats[mostOutliers].outlierCount} valores atípicos** según la regla de Tukey (1.5 × IQR).
- **Implicación:** Estos valores extremos (mínimo ${numericalStats[mostOutliers].min}, máximo ${numericalStats[mostOutliers].max}) representan oportunidades de negocio atípicas o casos de excepción que deben segmentarse antes de entrenar modelos de optimización.`
    : '- **Estabilidad:** No se evidencian outliers críticos severos que distorsionen los estimadores centrales del dataset.'
}

### 4. Hallazgos de Alto Impacto para el Sector (${sectorContext.sector})
- **Contexto Operativo:** ${sectorContext.description}
- **KPIs Críticos Sugeridos:** ${sectorContext.domainMetrics.join(', ')}.
- **Diagnóstico:** Los patrones observados reflejan la dinámica típica del sector, requiriendo un balance continuo entre la media operacional y la dispersión observada.

### 5. Recomendaciones Estratégicas y Próximos Pasos
1. **Segmentación / Clustering:** Implementar segmentación K-Means o jerárquica para agrupar registros de comportamiento homogéneo.
2. **Transformación de Variables:** Aplicar transformación logarítmica o Box-Cox en variables con asimetría positiva fuerte para normalizar residuos.
3. **Monitoreo de Extremos:** Establecer reglas de alerta operativa cuando ${mostOutliers || 'las variables clave'} superen los percentiles 95%.
    `.trim();
  };

  // Fetch AI expert analysis from backend proxy or fallback
  const fetchExpertAnalysis = async (customPrompt?: string) => {
    setIsLoading(true);
    try {
      const summaryPayload = {
        totalRows: dataset.totalRows,
        totalColumns: dataset.totalColumns,
        sector: dataset.sectorContext.sector,
        missingPercent: dataset.missingCellsPercent,
        numericalColumns: Object.keys(dataset.numericalStats).map((col) => ({
          col,
          mean: dataset.numericalStats[col].mean,
          median: dataset.numericalStats[col].median,
          stdDev: dataset.numericalStats[col].stdDev,
          min: dataset.numericalStats[col].min,
          max: dataset.numericalStats[col].max,
          skewness: dataset.numericalStats[col].skewness,
          outliers: dataset.numericalStats[col].outlierCount,
        })),
        categoricalColumns: Object.keys(dataset.categoricalStats).map((col) => ({
          col,
          unique: dataset.categoricalStats[col].uniqueCount,
          mode: dataset.categoricalStats[col].mode,
          modePercent: dataset.categoricalStats[col].modePercent,
        })),
      };

      const res = await fetch('/api/ai-expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetSummary: summaryPayload,
          sectorContext: dataset.sectorContext.sector,
          specificQuery: customPrompt || userQuery,
        }),
      });

      const data = await res.json();

      if (data.analysis && !data.fallback) {
        setAnalysisText(data.analysis);
        setIsAiPowered(true);
        if (customPrompt) {
          setConversation((prev) => [
            ...prev,
            { role: 'user', text: customPrompt },
            { role: 'expert', text: data.analysis },
          ]);
        }
      } else {
        // Fallback to local high-precision statistical engine
        const fallback = generateHeuristicReport();
        setAnalysisText(fallback);
        setIsAiPowered(false);
      }
    } catch (err) {
      console.warn('Utilizando motor estadístico experto local:', err);
      const fallback = generateHeuristicReport();
      setAnalysisText(fallback);
      setIsAiPowered(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpertAnalysis();
  }, [dataset.fileName]);

  const handleAskExpert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim()) return;
    const q = userQuery;
    setUserQuery('');
    fetchExpertAnalysis(q);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
              Punto 11 • Dictamen de Alto Nivel
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isAiPowered
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isAiPowered ? 'Gemini 3.8 Flash • IA Estadística' : 'Motor Estadístico Experto'}
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-cyan-400" />
            Análisis de Experto a Nivel de Tendencias & Recomendaciones
          </h3>
        </div>

        <button
          onClick={() => fetchExpertAnalysis()}
          disabled={isLoading}
          className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Regenerar Informe</span>
        </button>
      </div>

      {/* Main Analysis Display */}
      <div className="bg-slate-950/70 p-6 rounded-xl border border-slate-800 relative">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-indigo-300 font-medium">
              Sintetizando tendencias cuantitativas, asimetrías y contexto del sector...
            </p>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none space-y-4 text-slate-300 text-xs leading-relaxed">
            {analysisText.split('### ').map((section, idx) => {
              if (!section.trim()) return null;
              const lines = section.split('\n');
              const title = lines[0];
              const body = lines.slice(1).join('\n');

              return (
                <div key={idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    {title}
                  </h4>
                  <div className="text-slate-300 whitespace-pre-line text-xs space-y-1">
                    {body}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive "Consultar al Experto" Bar */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            ¿Deseas profundizar sobre alguna variable o hipótesis de negocio?
          </span>
          <span className="text-[11px] text-slate-400">
            Consulta interactiva sobre el dataset actual
          </span>
        </div>

        <form onSubmit={handleAskExpert} className="flex gap-2">
          <input
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Ej: ¿Qué variable presenta mayor volatilidad y qué impacto tiene en la toma de decisiones?"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !userQuery.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Consultar</span>
          </button>
        </form>

        {/* Suggested Quick Prompts */}
        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
          <span className="text-slate-500">Sugerencias rápidas:</span>
          {[
            '¿Existe riesgo de sobreajuste o sesgo en la muestra?',
            '¿Cuáles son las variables clave para un modelo predictivo?',
            '¿Cómo tratar los valores atípicos detectados?',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setUserQuery(prompt);
                fetchExpertAnalysis(prompt);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition text-[10px]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
