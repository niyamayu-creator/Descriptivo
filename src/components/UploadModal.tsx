import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  FileText,
  FileCode,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Table,
} from 'lucide-react';
import { parseUploadedFile, parseDelimitedText, processRawDataset, DEMO_DATASETS } from '../utils/fileParser';
import { DatasetState } from '../types/dataset';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: DatasetState) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'demos'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const dataset = await parseUploadedFile(file);
      onDatasetLoaded(dataset);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Error al procesar el archivo. Verifique el formato y codificación.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handlePasteProcess = () => {
    if (!rawText.trim()) {
      setErrorMessage('Por favor ingrese o pegue datos con encabezados.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const parsed = parseDelimitedText(rawText);
      const dataset = processRawDataset(parsed, 'datos_pegados.txt', rawText.length);
      onDatasetLoaded(dataset);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudieron interpretar los datos pegados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = (demoId: string) => {
    const demo = DEMO_DATASETS.find((d) => d.id === demoId);
    if (!demo) return;
    setIsLoading(true);
    try {
      const dataset = processRawDataset(demo.data, `${demo.id}_dataset.csv`, 1024);
      onDatasetLoaded(dataset);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error cargando dataset de muestra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Cargar Datos para Análisis</h2>
              <p className="text-xs text-slate-400">
                Soporte para Excel (.xlsx, .xls), delimitados (.csv, .txt, .tsv) y .json
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Subir Archivo
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pegar Texto / CSV
          </button>
          <button
            onClick={() => setActiveTab('demos')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'demos'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Datasets de Muestra
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv,.xlsx,.xls,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Arrastra tu archivo aquí o haz clic para explorar
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Archivos admitidos: <span className="text-indigo-300">.xlsx, .xls, .csv, .txt, .tsv, .json</span>
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <span className="inline-flex items-center text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-400 mr-1" /> Excel (.xlsx)
                  </span>
                  <span className="inline-flex items-center text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                    <Table className="w-3 h-3 text-cyan-400 mr-1" /> CSV separado por comas o punto y coma
                  </span>
                  <span className="inline-flex items-center text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                    <FileText className="w-3 h-3 text-amber-400 mr-1" /> TXT / Tabulaciones
                  </span>
                  <span className="inline-flex items-center text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                    <FileCode className="w-3 h-3 text-purple-400 mr-1" /> JSON tabular
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-lg border border-slate-800 space-y-1">
                <p className="font-medium text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Detección inteligente y automática:
                </p>
                <p>
                  • Reconoce automáticamente encabezados, comas, punto y comas o tabuladores.
                </p>
                <p>
                  • Clasifica tipos de variables (numéricas, categorías, fechas, booleanos, IDs).
                </p>
                <p>
                  • Detecta el sector industrial o ámbito de negocio al que pertenecen los datos.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Pega el contenido de tu tabla o archivo delimitado:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={9}
                placeholder="ID,Producto,Precio,Cantidad,Categoria&#10;1,Laptop,1200,5,Tecnología&#10;2,Teclado,45,20,Accesorios&#10;3,Monitor,300,8,Tecnología"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handlePasteProcess}
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2"
              >
                <span>Procesar Datos Pegados</span>
              </button>
            </div>
          )}

          {activeTab === 'demos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_DATASETS.map((demo) => (
                <div
                  key={demo.id}
                  onClick={() => handleLoadDemo(demo.id)}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition">
                      {demo.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {demo.rows} filas
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-400 font-medium mb-1">{demo.sector}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{demo.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-center space-x-3 text-indigo-400 text-xs">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Analizando y calculando estadísticas descriptivas...</span>
          </div>
        )}
      </div>
    </div>
  );
};
