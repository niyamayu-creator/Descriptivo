import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Database,
  Building2,
  Rows,
  Filter,
  FileX,
  Calculator,
  BarChart2,
  TrendingUp,
  Boxes,
  BrainCircuit,
  Sparkles,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { Header } from './components/Header';
import { UploadModal } from './components/UploadModal';
import { SectorContextCard } from './components/SectorContextCard';
import { FirstTwoRowsPreview } from './components/FirstTwoRowsPreview';
import { VariableTypesSection } from './components/VariableTypesSection';
import { MissingDataSection } from './components/MissingDataSection';
import { DescriptiveStatsSection } from './components/DescriptiveStatsSection';
import { HistogramSection } from './components/HistogramSection';
import { TrendChartSection } from './components/TrendChartSection';
import { BoxplotSection } from './components/BoxplotSection';
import { ExpertAnalysisSection } from './components/ExpertAnalysisSection';
import { DatasetState, SectorContext, VariableType } from './types/dataset';
import { processRawDataset, DEMO_DATASETS } from './utils/fileParser';
import { computeNumericalStats, computeCategoricalStats } from './utils/statistics';

export default function App() {
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<string>('all');

  // Load initial demo dataset on startup so user sees full interactive platform immediately
  useEffect(() => {
    const defaultDemo = DEMO_DATASETS[0];
    const initialDataset = processRawDataset(
      defaultDemo.data,
      'ventas_ecommerce_2026.csv',
      2450
    );
    setDataset(initialDataset);
  }, []);

  const handleLoadDemo = (demoId: string) => {
    const demo = DEMO_DATASETS.find((d) => d.id === demoId);
    if (demo) {
      const d = processRawDataset(demo.data, `${demo.id}_dataset.csv`, 2048);
      setDataset(d);
    }
  };

  const handleUpdateSector = (updatedSector: SectorContext) => {
    if (dataset) {
      setDataset({
        ...dataset,
        sectorContext: updatedSector,
      });
    }
  };

  const handleUpdateVariableType = (colName: string, newType: VariableType) => {
    if (!dataset) return;

    const currentMeta = dataset.columnMeta[colName];
    if (!currentMeta) return;

    const values = dataset.rawData.map((r) => r[colName]);

    const updatedColumnMeta = {
      ...dataset.columnMeta,
      [colName]: {
        ...currentMeta,
        type: newType,
      },
    };

    const updatedNumericalStats = { ...dataset.numericalStats };
    const updatedCategoricalStats = { ...dataset.categoricalStats };

    if (newType === 'numeric') {
      updatedNumericalStats[colName] = computeNumericalStats(values);
      delete updatedCategoricalStats[colName];
    } else {
      updatedCategoricalStats[colName] = computeCategoricalStats(values);
      delete updatedNumericalStats[colName];
    }

    setDataset({
      ...dataset,
      columnMeta: updatedColumnMeta,
      numericalStats: updatedNumericalStats,
      categoricalStats: updatedCategoricalStats,
    });
  };

  const navItems = [
    { id: 'all', label: 'Tablero Integral', icon: Layers },
    { id: 'sector', label: 'Sector & Contexto', icon: Building2 },
    { id: 'first2rows', label: 'Primeras 2 Filas', icon: Rows },
    { id: 'types', label: 'Tipos de Variables', icon: Filter },
    { id: 'missing', label: 'Datos Faltantes', icon: FileX },
    { id: 'stats', label: 'Estadísticas Descriptivas', icon: Calculator },
    { id: 'histograms', label: 'Histogramas', icon: BarChart2 },
    { id: 'trends', label: 'Tendencias X, Y', icon: TrendingUp },
    { id: 'boxplots', label: 'Boxplot (Todas)', icon: Boxes },
    { id: 'expert', label: 'Análisis de Experto', icon: BrainCircuit },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header component */}
      <Header
        dataset={dataset}
        onOpenUpload={() => setIsUploadOpen(true)}
        onLoadDemo={handleLoadDemo}
        onReset={() => setDataset(null)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {dataset ? (
          <>
            {/* Quick Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Content Sections */}
            <div className="space-y-6">
              {/* Requirement 3: Sector & Context */}
              {(activeNav === 'all' || activeNav === 'sector') && (
                <section id="sector">
                  <SectorContextCard
                    sectorContext={dataset.sectorContext}
                    onUpdateSector={handleUpdateSector}
                  />
                </section>
              )}

              {/* Requirement 4: First Two Rows Preview */}
              {(activeNav === 'all' || activeNav === 'first2rows') && (
                <section id="first2rows">
                  <FirstTwoRowsPreview
                    rawData={dataset.rawData}
                    columns={dataset.columns}
                    columnMeta={dataset.columnMeta}
                  />
                </section>
              )}

              {/* Requirement 5: Variable Types Breakdown */}
              {(activeNav === 'all' || activeNav === 'types') && (
                <section id="types">
                  <VariableTypesSection
                    columns={dataset.columns}
                    columnMeta={dataset.columnMeta}
                    onUpdateVariableType={handleUpdateVariableType}
                  />
                </section>
              )}

              {/* Requirement 6: Missing Data Analysis */}
              {(activeNav === 'all' || activeNav === 'missing') && (
                <section id="missing">
                  <MissingDataSection dataset={dataset} />
                </section>
              )}

              {/* Requirement 7: Descriptive Summary Statistics */}
              {(activeNav === 'all' || activeNav === 'stats') && (
                <section id="stats">
                  <DescriptiveStatsSection dataset={dataset} />
                </section>
              )}

              {/* Requirement 8: Histograms */}
              {(activeNav === 'all' || activeNav === 'histograms') && (
                <section id="histograms">
                  <HistogramSection dataset={dataset} />
                </section>
              )}

              {/* Requirement 9: Trend Charts with selectable X and Y */}
              {(activeNav === 'all' || activeNav === 'trends') && (
                <section id="trends">
                  <TrendChartSection dataset={dataset} />
                </section>
              )}

              {/* Requirement 10: Boxplot for all variables */}
              {(activeNav === 'all' || activeNav === 'boxplots') && (
                <section id="boxplots">
                  <BoxplotSection dataset={dataset} />
                </section>
              )}

              {/* Requirement 11: Expert Analysis of Trends & Insights */}
              {(activeNav === 'all' || activeNav === 'expert') && (
                <section id="expert">
                  <ExpertAnalysisSection dataset={dataset} />
                </section>
              )}
            </div>
          </>
        ) : (
          /* Empty state when dataset cleared */
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1">
              <h2 className="text-xl font-bold text-white">Comienza tu Análisis Descriptivo</h2>
              <p className="text-xs text-slate-400">
                Sube un archivo .xlsx, .csv, .txt o selecciona uno de nuestros datasets sectoriales para explorar estadísticas, tendencias y análisis experto.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Cargar Archivo Local</span>
              </button>
              <button
                onClick={() => handleLoadDemo('retail')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Cargar Datos de Muestra</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDatasetLoaded={(newDataset) => {
          setDataset(newDataset);
          setActiveNav('all');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[11px] text-slate-500">
        DataScope EDA Suite • Plataforma Estadística Integral para Análisis Descriptivo & Visualización de Datos
      </footer>
    </div>
  );
}
