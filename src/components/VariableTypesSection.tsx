import React, { useState } from 'react';
import {
  Binary,
  Calendar,
  Hash,
  Type,
  KeyRound,
  Filter,
  Search,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { ColumnMetadata, VariableType } from '../types/dataset';

interface VariableTypesSectionProps {
  columns: string[];
  columnMeta: Record<string, ColumnMetadata>;
  onUpdateVariableType: (colName: string, newType: VariableType) => void;
}

export const VariableTypesSection: React.FC<VariableTypesSectionProps> = ({
  columns,
  columnMeta,
  onUpdateVariableType,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts by type
  const counts = {
    numeric: 0,
    categorical: 0,
    datetime: 0,
    boolean: 0,
    id: 0,
  };

  columns.forEach((col) => {
    const type = columnMeta[col]?.type || 'categorical';
    counts[type] = (counts[type] || 0) + 1;
  });

  const totalCols = columns.length;

  const filteredColumns = columns.filter((col) => {
    const meta = columnMeta[col];
    const matchesFilter = filterType === 'all' || meta?.type === filterType;
    const matchesSearch = col.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeBadge = (type: VariableType) => {
    switch (type) {
      case 'numeric':
        return {
          label: 'Numérica',
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          icon: <Hash className="w-3.5 h-3.5 mr-1" />,
        };
      case 'categorical':
        return {
          label: 'Categórica',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: <Type className="w-3.5 h-3.5 mr-1" />,
        };
      case 'datetime':
        return {
          label: 'Temporal / Fecha',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: <Calendar className="w-3.5 h-3.5 mr-1" />,
        };
      case 'boolean':
        return {
          label: 'Booleana / Binaria',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <Binary className="w-3.5 h-3.5 mr-1" />,
        };
      case 'id':
        return {
          label: 'Identificador / ID',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          icon: <KeyRound className="w-3.5 h-3.5 mr-1" />,
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Punto 5 • Tipología de Variables
          </span>
          <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            Clasificación y Naturaleza de los Atributos
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Total detectado: <strong className="text-white">{totalCols} variables</strong>
        </p>
      </div>

      {/* KPI Cards summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setFilterType(filterType === 'numeric' ? 'all' : 'numeric')}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            filterType === 'numeric'
              ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-1">
            <span className="font-medium">Numéricas</span>
            <Hash className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{counts.numeric}</div>
          <div className="text-[11px] text-slate-400">
            {totalCols > 0 ? ((counts.numeric / totalCols) * 100).toFixed(0) : 0}% del dataset
          </div>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'categorical' ? 'all' : 'categorical')}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            filterType === 'categorical'
              ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span className="font-medium">Categóricas</span>
            <Type className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{counts.categorical}</div>
          <div className="text-[11px] text-slate-400">
            {totalCols > 0 ? ((counts.categorical / totalCols) * 100).toFixed(0) : 0}% del dataset
          </div>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'datetime' ? 'all' : 'datetime')}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            filterType === 'datetime'
              ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-400 mb-1">
            <span className="font-medium">Fechas / Tiempo</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{counts.datetime}</div>
          <div className="text-[11px] text-slate-400">
            {totalCols > 0 ? ((counts.datetime / totalCols) * 100).toFixed(0) : 0}% del dataset
          </div>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'boolean' ? 'all' : 'boolean')}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            filterType === 'boolean'
              ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span className="font-medium">Booleanas</span>
            <Binary className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{counts.boolean}</div>
          <div className="text-[11px] text-slate-400">
            {totalCols > 0 ? ((counts.boolean / totalCols) * 100).toFixed(0) : 0}% del dataset
          </div>
        </div>

        <div
          onClick={() => setFilterType(filterType === 'id' ? 'all' : 'id')}
          className={`p-3 rounded-xl border cursor-pointer transition ${
            filterType === 'id'
              ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-indigo-400 mb-1">
            <span className="font-medium">Identificadores</span>
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">{counts.id}</div>
          <div className="text-[11px] text-slate-400">
            {totalCols > 0 ? ((counts.id / totalCols) * 100).toFixed(0) : 0}% del dataset
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar variable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
          <span>Filtrar por:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas las variables ({totalCols})</option>
            <option value="numeric">Solo Numéricas ({counts.numeric})</option>
            <option value="categorical">Solo Categóricas ({counts.categorical})</option>
            <option value="datetime">Solo Fechas ({counts.datetime})</option>
            <option value="boolean">Solo Booleanas ({counts.boolean})</option>
            <option value="id">Solo IDs ({counts.id})</option>
          </select>
        </div>
      </div>

      {/* Variables Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredColumns.map((col) => {
          const meta = columnMeta[col];
          if (!meta) return null;
          const badge = getTypeBadge(meta.type);

          return (
            <div
              key={col}
              className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-white text-xs truncate" title={col}>
                    {col}
                  </h4>
                  <span
                    className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Valores válidos:</span>
                    <span className="font-mono text-slate-200">
                      {meta.validCount} / {meta.totalCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valores únicos (distintos):</span>
                    <span className="font-mono text-slate-200">
                      {meta.uniqueCount} ({((meta.uniqueCount / meta.totalCount) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valores de muestra:</span>
                    <span
                      className="font-mono text-indigo-300 truncate max-w-[150px]"
                      title={meta.sampleValues.filter(Boolean).slice(0, 3).join(', ')}
                    >
                      {meta.sampleValues.filter(Boolean).slice(0, 3).join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Type Override Dropdown */}
              <div className="pt-2.5 mt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Reclasificar:</span>
                <select
                  value={meta.type}
                  onChange={(e) => onUpdateVariableType(col, e.target.value as VariableType)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="numeric">Numérica</option>
                  <option value="categorical">Categórica</option>
                  <option value="datetime">Fecha / Tiempo</option>
                  <option value="boolean">Booleana</option>
                  <option value="id">Identificador</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
