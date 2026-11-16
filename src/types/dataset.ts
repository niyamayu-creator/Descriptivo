export type VariableType = 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'id';

export interface ColumnMetadata {
  name: string;
  type: VariableType;
  totalCount: number;
  validCount: number;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  isIdCandidate: boolean;
  sampleValues: (string | number | boolean | null)[];
}

export interface NumericalStats {
  count: number;
  validCount: number;
  missingCount: number;
  missingPercent: number;
  mean: number;
  stdDev: number;
  variance: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
  outlierCount: number;
  skewness: number;
  kurtosis: number;
  cv: number; // Coeficiente de variación (%)
  distributionShape: 'Simétrica' | 'Asimetría Positiva (Derecha)' | 'Asimetría Negativa (Izquierda)' | 'Aplanada' | 'Puntiaguda';
}

export interface CategoricalStats {
  count: number;
  validCount: number;
  missingCount: number;
  missingPercent: number;
  uniqueCount: number;
  mode: string;
  modeFreq: number;
  modePercent: number;
  topCategories: { label: string; count: number; percent: number }[];
}

export interface SectorContext {
  sector: string;
  confidence: number;
  description: string;
  keyVariablesInferred: string[];
  domainMetrics: string[];
  icon: string;
  color: string;
}

export interface DatasetState {
  fileName: string;
  fileSize: number;
  rawData: Record<string, any>[];
  columns: string[];
  columnMeta: Record<string, ColumnMetadata>;
  numericalStats: Record<string, NumericalStats>;
  categoricalStats: Record<string, CategoricalStats>;
  sectorContext: SectorContext;
  missingTotal: number;
  missingCellsPercent: number;
  completeRowsCount: number;
  incompleteRowsCount: number;
  totalRows: number;
  totalColumns: number;
}
