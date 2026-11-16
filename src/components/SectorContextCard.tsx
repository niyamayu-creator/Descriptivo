import React, { useState } from 'react';
import {
  Building2,
  HeartPulse,
  ShoppingBag,
  Landmark,
  Users,
  Factory,
  Truck,
  Cpu,
  BarChart3,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Sparkles,
  Info,
} from 'lucide-react';
import { SectorContext } from '../types/dataset';

interface SectorContextCardProps {
  sectorContext: SectorContext;
  onUpdateSector: (updated: SectorContext) => void;
}

const AVAILABLE_SECTORS = [
  {
    name: 'Comercio, Ventas & Retail',
    icon: ShoppingBag,
    color: 'emerald',
    description: 'Transacciones comerciales, ventas minoristas, carritos y rendimiento de productos.',
    domainMetrics: ['Ticket promedio', 'Volumen de ventas por categoría', 'Margen bruto unitario'],
  },
  {
    name: 'Salud & Medicina Clínica',
    icon: HeartPulse,
    color: 'rose',
    description: 'Datos biomédicos, epidemiológicos o de gestión hospitalaria y pacientes.',
    domainMetrics: ['Distribución por grupos de riesgo', 'Presión/Glucosa media', 'Tasa de morbilidad'],
  },
  {
    name: 'Finanzas & Servicios Bancarios',
    icon: Landmark,
    color: 'blue',
    description: 'Portafolio financiero, evaluación crediticia, riesgo y transacciones bancarias.',
    domainMetrics: ['Ratio de endeudamiento', 'Tasa media de morosidad', 'Score de crédito promedio'],
  },
  {
    name: 'Recursos Humanos & Gestión de Talento',
    icon: Users,
    color: 'indigo',
    description: 'Métricas de personal, compensaciones, clima organizacional y retención.',
    domainMetrics: ['Salario medio y mediana', 'Tasa de retención', 'Distribución de desempeño'],
  },
  {
    name: 'Manufactura, Calidad & Producción',
    icon: Factory,
    color: 'amber',
    description: 'Control de procesos industriales, aseguramiento de la calidad y telemetría operativa.',
    domainMetrics: ['Tasa de defectos (PPM)', 'Tiempo de ciclo medio', 'OEE y dispersión de tolerancias'],
  },
  {
    name: 'Logística, Transporte & Cadena de Suministro',
    icon: Truck,
    color: 'cyan',
    description: 'Operaciones de despacho, tiempos de entrega, transporte y almacenamiento.',
    domainMetrics: ['Tiempo promedio de entrega', 'Costo por km/tonelada', 'Tasa de entregas a tiempo (OTIF)'],
  },
  {
    name: 'Tecnología, SaaS & Producto Digital',
    icon: Cpu,
    color: 'purple',
    description: 'Métricas de producto de software, suscripciones recurrentes y uso digital.',
    domainMetrics: ['Tasa de Churn', 'Ingreso recurrente promedio (ARPU)', 'Conversión de funnel'],
  },
  {
    name: 'General / Análisis Empresarial Transversal',
    icon: BarChart3,
    color: 'slate',
    description: 'Dataset multipropósito con variables cuantitativas y operativas.',
    domainMetrics: ['Tendencia central multivariada', 'Índice de completitud', 'Valores atípicos detectados'],
  },
];

export const SectorContextCard: React.FC<SectorContextCardProps> = ({
  sectorContext,
  onUpdateSector,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const getIcon = (name: string) => {
    switch (name) {
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5 text-rose-400" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-5 h-5 text-emerald-400" />;
      case 'Landmark':
        return <Landmark className="w-5 h-5 text-blue-400" />;
      case 'Users':
        return <Users className="w-5 h-5 text-indigo-400" />;
      case 'Factory':
        return <Factory className="w-5 h-5 text-amber-400" />;
      case 'Truck':
        return <Truck className="w-5 h-5 text-cyan-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-purple-400" />;
      default:
        return <Building2 className="w-5 h-5 text-indigo-400" />;
    }
  };

  const handleSelectSector = (sec: typeof AVAILABLE_SECTORS[0]) => {
    onUpdateSector({
      ...sectorContext,
      sector: sec.name,
      description: sec.description,
      domainMetrics: sec.domainMetrics,
      confidence: 100, // Manual selection
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
      {/* Background glow subtle */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl shrink-0 mt-0.5">
            {getIcon(sectorContext.icon)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Punto 3 • Clasificación de Sector & Contexto
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {sectorContext.confidence}% Certeza
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Sector: {sectorContext.sector}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {sectorContext.description}
            </p>
          </div>
        </div>

        {/* Action to change sector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center space-x-2 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <span>Cambiar Sector / Contexto</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
          </button>

          {isEditing && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-30">
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                Seleccionar Dominio de Negocio
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {AVAILABLE_SECTORS.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => handleSelectSector(s)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-600 hover:text-white text-slate-200 transition flex items-center justify-between"
                  >
                    <span>{s.name}</span>
                    {sectorContext.sector === s.name && (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Domain Details & Inferred KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <p className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Variables Clave Asociadas al Sector:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sectorContext.keyVariablesInferred.length > 0 ? (
              sectorContext.keyVariablesInferred.map((varName) => (
                <span
                  key={varName}
                  className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700"
                >
                  {varName}
                </span>
              ))
            ) : (
              <span className="text-slate-500 italic">Detección global del dataset</span>
            )}
          </div>
        </div>

        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
          <p className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            KPIs & Enfoque Analítico Recomendado:
          </p>
          <ul className="space-y-1 text-slate-400">
            {sectorContext.domainMetrics.map((metric, i) => (
              <li key={i} className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
