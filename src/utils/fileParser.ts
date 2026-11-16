import * as XLSX from 'xlsx';
import {
  DatasetState,
  ColumnMetadata,
  NumericalStats,
  CategoricalStats,
} from '../types/dataset';
import {
  inferVariableType,
  computeNumericalStats,
  computeCategoricalStats,
  detectSector,
  isMissing,
} from './statistics';

// Detect delimiter for TXT/CSV files
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return ',';

  const delimiters = [',', ';', '\t', '|'];
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };

  for (const line of lines) {
    for (const d of delimiters) {
      const match = line.split(d);
      if (match.length > 1) {
        counts[d] += match.length;
      }
    }
  }

  let best = ',';
  let maxCount = -1;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      best = delim;
    }
  }

  return best;
}

// Parse CSV/TSV/TXT text respecting quotes and escaped characters
export function parseDelimitedText(text: string, delimiter?: string): Record<string, any>[] {
  const actualDelimiter = delimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === actualDelimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  // Clean headers
  const headers = rows[0].map((h, idx) => (h ? h.replace(/^["']|["']$/g, '') : `Columna_${idx + 1}`));
  const data: Record<string, any>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj: Record<string, any> = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      let val = row[idx] !== undefined ? row[idx] : null;
      if (val !== null && val !== '') {
        hasValue = true;
      }
      obj[h] = val;
    });
    if (hasValue) {
      data.push(obj);
    }
  }

  return data;
}

// Main process function to transform raw rows into complete DatasetState
export function processRawDataset(
  rawData: Record<string, any>[],
  fileName: string,
  fileSize: number
): DatasetState {
  if (rawData.length === 0) {
    throw new Error('El archivo no contiene filas de datos válidas.');
  }

  const columns = Object.keys(rawData[0]);
  const totalRows = rawData.length;
  const totalColumns = columns.length;

  const columnMeta: Record<string, ColumnMetadata> = {};
  const numericalStats: Record<string, NumericalStats> = {};
  const categoricalStats: Record<string, CategoricalStats> = {};

  let missingCellsCount = 0;
  let completeRowsCount = 0;

  // Process column metadata and variable types
  for (const col of columns) {
    const values = rawData.map((row) => row[col]);
    const inferredType = inferVariableType(col, values);
    const nonNullValues = values.filter((v) => !isMissing(v));
    const missingCount = values.length - nonNullValues.length;
    const missingPercent = totalRows > 0 ? (missingCount / totalRows) * 100 : 0;
    const uniqueCount = new Set(nonNullValues.map(String)).size;

    columnMeta[col] = {
      name: col,
      type: inferredType,
      totalCount: totalRows,
      validCount: nonNullValues.length,
      missingCount,
      missingPercent,
      uniqueCount,
      isIdCandidate: uniqueCount === nonNullValues.length && nonNullValues.length > 5,
      sampleValues: values.slice(0, 5),
    };

    if (inferredType === 'numeric') {
      numericalStats[col] = computeNumericalStats(values);
    } else {
      categoricalStats[col] = computeCategoricalStats(values);
    }
  }

  // Row-level completeness check
  for (const row of rawData) {
    let rowHasMissing = false;
    for (const col of columns) {
      if (isMissing(row[col])) {
        missingCellsCount++;
        rowHasMissing = true;
      }
    }
    if (!rowHasMissing) {
      completeRowsCount++;
    }
  }

  const totalCells = totalRows * totalColumns;
  const missingCellsPercent = totalCells > 0 ? (missingCellsCount / totalCells) * 100 : 0;
  const sectorContext = detectSector(columns, rawData);

  return {
    fileName,
    fileSize,
    rawData,
    columns,
    columnMeta,
    numericalStats,
    categoricalStats,
    sectorContext,
    missingTotal: missingCellsCount,
    missingCellsPercent,
    completeRowsCount,
    incompleteRowsCount: totalRows - completeRowsCount,
    totalRows,
    totalColumns,
  };
}

// Parse File from File Object (supports .xlsx, .xls, .csv, .tsv, .txt, .json)
export async function parseUploadedFile(file: File): Promise<DatasetState> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'xlsx' || extension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('El archivo Excel no contiene hojas de cálculo.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: null,
      raw: false, // preserve formatted strings
    });
    return processRawDataset(jsonData, file.name, file.size);
  }

  if (extension === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const dataArray = Array.isArray(parsed) ? parsed : [parsed];
    return processRawDataset(dataArray, file.name, file.size);
  }

  // txt, csv, tsv, or others as text
  const text = await file.text();
  const rawData = parseDelimitedText(text);
  return processRawDataset(rawData, file.name, file.size);
}

// Built-in Demo Datasets
export const DEMO_DATASETS: {
  id: string;
  name: string;
  sector: string;
  description: string;
  rows: number;
  data: Record<string, any>[];
}[] = [
  {
    id: 'retail',
    name: 'Ventas E-commerce & Retail 2026',
    sector: 'Comercio, Ventas & Retail',
    description: 'Transacciones de tiendas retail multicanal, incluyendo precios, descuentos, costos y márgenes de ganancia.',
    rows: 40,
    data: [
      { ID_Orden: 'ORD-101', Categoria: 'Electrónica', Canal_Venta: 'Online', Precio_Unitario: 350.5, Cantidad: 3, Descuento_Pct: 10, Costo_Envio: 15.0, Margen_Ganancia: 28.5, Satisfaccion_Cliente: 4.8 },
      { ID_Orden: 'ORD-102', Categoria: 'Hogar', Canal_Venta: 'Tienda Física', Precio_Unitario: 85.0, Cantidad: 2, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 42.0, Satisfaccion_Cliente: 4.2 },
      { ID_Orden: 'ORD-103', Categoria: 'Electrónica', Canal_Venta: 'Online', Precio_Unitario: 1200.0, Cantidad: 1, Descuento_Pct: 15, Costo_Envio: 25.0, Margen_Ganancia: 21.0, Satisfaccion_Cliente: 4.9 },
      { ID_Orden: 'ORD-104', Categoria: 'Moda', Canal_Venta: 'Online', Precio_Unitario: 45.0, Cantidad: 4, Descuento_Pct: 20, Costo_Envio: 5.5, Margen_Ganancia: 55.0, Satisfaccion_Cliente: 3.9 },
      { ID_Orden: 'ORD-105', Categoria: 'Deportes', Canal_Venta: 'Tienda Física', Precio_Unitario: 130.0, Cantidad: 2, Descuento_Pct: 5, Costo_Envio: 0.0, Margen_Ganancia: 38.0, Satisfaccion_Cliente: 4.5 },
      { ID_Orden: 'ORD-106', Categoria: 'Electrónica', Canal_Venta: 'Marketplace', Precio_Unitario: 520.0, Cantidad: 1, Descuento_Pct: 5, Costo_Envio: 12.0, Margen_Ganancia: 19.5, Satisfaccion_Cliente: 4.1 },
      { ID_Orden: 'ORD-107', Categoria: 'Hogar', Canal_Venta: 'Online', Precio_Unitario: 210.0, Cantidad: 2, Descuento_Pct: 12, Costo_Envio: 18.0, Margen_Ganancia: 35.0, Satisfaccion_Cliente: 4.4 },
      { ID_Orden: 'ORD-108', Categoria: 'Moda', Canal_Venta: 'Tienda Física', Precio_Unitario: 95.0, Cantidad: 3, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 52.0, Satisfaccion_Cliente: 4.7 },
      { ID_Orden: 'ORD-109', Categoria: 'Alimentos', Canal_Venta: 'Online', Precio_Unitario: 28.0, Cantidad: 8, Descuento_Pct: 0, Costo_Envio: 8.0, Margen_Ganancia: 18.0, Satisfaccion_Cliente: 4.6 },
      { ID_Orden: 'ORD-110', Categoria: 'Deportes', Canal_Venta: 'Online', Precio_Unitario: 280.0, Cantidad: 1, Descuento_Pct: 25, Costo_Envio: 14.0, Margen_Ganancia: 26.0, Satisfaccion_Cliente: 3.8 },
      { ID_Orden: 'ORD-111', Categoria: 'Electrónica', Canal_Venta: 'Tienda Física', Precio_Unitario: 890.0, Cantidad: 1, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 24.0, Satisfaccion_Cliente: 4.9 },
      { ID_Orden: 'ORD-112', Categoria: 'Moda', Canal_Venta: 'Marketplace', Precio_Unitario: 65.0, Cantidad: 2, Descuento_Pct: 15, Costo_Envio: 6.0, Margen_Ganancia: 48.0, Satisfaccion_Cliente: 4.0 },
      { ID_Orden: 'ORD-113', Categoria: 'Hogar', Canal_Venta: 'Online', Precio_Unitario: 145.0, Cantidad: 3, Descuento_Pct: 10, Costo_Envio: 16.5, Margen_Ganancia: 39.0, Satisfaccion_Cliente: 4.3 },
      { ID_Orden: 'ORD-114', Categoria: 'Electrónica', Canal_Venta: 'Online', Precio_Unitario: 1450.0, Cantidad: 2, Descuento_Pct: 18, Costo_Envio: 30.0, Margen_Ganancia: 17.5, Satisfaccion_Cliente: 4.8 },
      { ID_Orden: 'ORD-115', Categoria: 'Alimentos', Canal_Venta: 'Tienda Física', Precio_Unitario: 42.0, Cantidad: 5, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 22.0, Satisfaccion_Cliente: 4.4 },
      { ID_Orden: 'ORD-116', Categoria: 'Deportes', Canal_Venta: 'Online', Precio_Unitario: 95.0, Cantidad: 4, Descuento_Pct: 10, Costo_Envio: 9.0, Margen_Ganancia: 41.0, Satisfaccion_Cliente: 4.6 },
      { ID_Orden: 'ORD-117', Categoria: 'Moda', Canal_Venta: 'Online', Precio_Unitario: 110.0, Cantidad: 2, Descuento_Pct: 5, Costo_Envio: 7.0, Margen_Ganancia: 53.0, Satisfaccion_Cliente: 4.5 },
      { ID_Orden: 'ORD-118', Categoria: 'Electrónica', Canal_Venta: 'Marketplace', Precio_Unitario: 290.0, Cantidad: 1, Descuento_Pct: 8, Costo_Envio: 11.0, Margen_Ganancia: 23.0, Satisfaccion_Cliente: 4.2 },
      { ID_Orden: 'ORD-119', Categoria: 'Hogar', Canal_Venta: 'Tienda Física', Precio_Unitario: 320.0, Cantidad: 1, Descuento_Pct: 15, Costo_Envio: 0.0, Margen_Ganancia: 34.0, Satisfaccion_Cliente: 4.1 },
      { ID_Orden: 'ORD-120', Categoria: 'Alimentos', Canal_Venta: 'Online', Precio_Unitario: 19.5, Cantidad: 10, Descuento_Pct: 0, Costo_Envio: 10.0, Margen_Ganancia: 15.0, Satisfaccion_Cliente: 4.3 },
      { ID_Orden: 'ORD-121', Categoria: 'Electrónica', Canal_Venta: 'Online', Precio_Unitario: 2100.0, Cantidad: 1, Descuento_Pct: 12, Costo_Envio: 35.0, Margen_Ganancia: 16.0, Satisfaccion_Cliente: 5.0 },
      { ID_Orden: 'ORD-122', Categoria: 'Moda', Canal_Venta: 'Tienda Física', Precio_Unitario: 78.0, Cantidad: 3, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 50.0, Satisfaccion_Cliente: 4.7 },
      { ID_Orden: 'ORD-123', Categoria: 'Deportes', Canal_Venta: 'Marketplace', Precio_Unitario: 160.0, Cantidad: 2, Descuento_Pct: 15, Costo_Envio: 12.0, Margen_Ganancia: 33.0, Satisfaccion_Cliente: 3.9 },
      { ID_Orden: 'ORD-124', Categoria: 'Hogar', Canal_Venta: 'Online', Precio_Unitario: 410.0, Cantidad: 1, Descuento_Pct: 5, Costo_Envio: 22.0, Margen_Ganancia: 37.0, Satisfaccion_Cliente: 4.6 },
      { ID_Orden: 'ORD-125', Categoria: 'Electrónica', Canal_Venta: 'Tienda Física', Precio_Unitario: 640.0, Cantidad: 2, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 25.0, Satisfaccion_Cliente: 4.8 },
      { ID_Orden: 'ORD-126', Categoria: 'Alimentos', Canal_Venta: 'Online', Precio_Unitario: 55.0, Cantidad: 4, Descuento_Pct: 5, Costo_Envio: 7.5, Margen_Ganancia: 20.0, Satisfaccion_Cliente: 4.5 },
      { ID_Orden: 'ORD-127', Categoria: 'Moda', Canal_Venta: 'Online', Precio_Unitario: 135.0, Cantidad: 1, Descuento_Pct: 20, Costo_Envio: 6.0, Margen_Ganancia: 47.0, Satisfaccion_Cliente: 4.1 },
      { ID_Orden: 'ORD-128', Categoria: 'Deportes', Canal_Venta: 'Tienda Física', Precio_Unitario: 220.0, Cantidad: 1, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 40.0, Satisfaccion_Cliente: 4.7 },
      { ID_Orden: 'ORD-129', Categoria: 'Electrónica', Canal_Venta: 'Online', Precio_Unitario: 780.0, Cantidad: 3, Descuento_Pct: 10, Costo_Envio: 20.0, Margen_Ganancia: 22.5, Satisfaccion_Cliente: 4.6 },
      { ID_Orden: 'ORD-130', Categoria: 'Hogar', Canal_Venta: 'Marketplace', Precio_Unitario: 190.0, Cantidad: 2, Descuento_Pct: 10, Costo_Envio: 15.0, Margen_Ganancia: 36.0, Satisfaccion_Cliente: 4.2 },
      { ID_Orden: 'ORD-131', Categoria: 'Alimentos', Canal_Venta: 'Tienda Física', Precio_Unitario: 34.0, Cantidad: 6, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 19.0, Satisfaccion_Cliente: 4.6 },
      { ID_Orden: 'ORD-132', Categoria: 'Moda', Canal_Venta: 'Online', Precio_Unitario: 89.0, Cantidad: 2, Descuento_Pct: 15, Costo_Envio: 5.5, Margen_Ganancia: 49.0, Satisfaccion_Cliente: 4.3 },
      { ID_Orden: 'ORD-133', Categoria: 'Electrónica', Canal_Venta: 'Online', Precio_Unitario: 3100.0, Cantidad: 1, Descuento_Pct: 25, Costo_Envio: 45.0, Margen_Ganancia: 14.0, Satisfaccion_Cliente: 4.9 },
      { ID_Orden: 'ORD-134', Categoria: 'Deportes', Canal_Venta: 'Online', Precio_Unitario: 75.0, Cantidad: 3, Descuento_Pct: 5, Costo_Envio: 8.0, Margen_Ganancia: 43.0, Satisfaccion_Cliente: 4.4 },
      { ID_Orden: 'ORD-135', Categoria: 'Hogar', Canal_Venta: 'Tienda Física', Precio_Unitario: 520.0, Cantidad: 1, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 38.0, Satisfaccion_Cliente: 4.5 },
      { ID_Orden: 'ORD-136', Categoria: 'Electrónica', Canal_Venta: 'Marketplace', Precio_Unitario: 410.0, Cantidad: 2, Descuento_Pct: 10, Costo_Envio: 13.0, Margen_Ganancia: 21.0, Satisfaccion_Cliente: 4.0 },
      { ID_Orden: 'ORD-137', Categoria: 'Moda', Canal_Venta: 'Tienda Física', Precio_Unitario: 125.0, Cantidad: 1, Descuento_Pct: 0, Costo_Envio: 0.0, Margen_Ganancia: 51.0, Satisfaccion_Cliente: 4.8 },
      { ID_Orden: 'ORD-138', Categoria: 'Alimentos', Canal_Venta: 'Online', Precio_Unitario: 62.0, Cantidad: 3, Descuento_Pct: 8, Costo_Envio: 9.0, Margen_Ganancia: 21.5, Satisfaccion_Cliente: 4.4 },
      { ID_Orden: 'ORD-139', Categoria: 'Deportes', Canal_Venta: 'Tienda Física', Precio_Unitario: 340.0, Cantidad: 1, Descuento_Pct: 10, Costo_Envio: 0.0, Margen_Ganancia: 36.0, Satisfaccion_Cliente: 4.6 },
      { ID_Orden: 'ORD-140', Categoria: 'Electrónica', Canal_Venta: 'Online', Precio_Unitario: 980.0, Cantidad: 2, Descuento_Pct: 5, Costo_Envio: 18.0, Margen_Ganancia: 23.5, Satisfaccion_Cliente: 4.7 },
    ],
  },
  {
    id: 'health',
    name: 'Estudio Clínico & Salud Cardiovascular',
    sector: 'Salud & Medicina Clínica',
    description: 'Parámetros biomédicos de pacientes en seguimiento cardiológico, con biomarcadores, presión arterial y factores de riesgo.',
    rows: 35,
    data: [
      { Paciente_ID: 'P-01', Edad: 54, Genero: 'Femenino', Presion_Sistolica: 138, Colesterol_Total: 220, Glucosa_Ayuno: 105, IMC: 27.4, Fumador: 'No', Ejercicio_Semanal_Hrs: 2.5, Riesgo_Cardiovascular: 'Moderado' },
      { Paciente_ID: 'P-02', Edad: 62, Genero: 'Masculino', Presion_Sistolica: 155, Colesterol_Total: 260, Glucosa_Ayuno: 140, IMC: 31.2, Fumador: 'Si', Ejercicio_Semanal_Hrs: 0.5, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-03', Edad: 45, Genero: 'Femenino', Presion_Sistolica: 118, Colesterol_Total: 185, Glucosa_Ayuno: 92, IMC: 23.1, Fumador: 'No', Ejercicio_Semanal_Hrs: 4.0, Riesgo_Cardiovascular: 'Bajo' },
      { Paciente_ID: 'P-04', Edad: 70, Genero: 'Masculino', Presion_Sistolica: 162, Colesterol_Total: 245, Glucosa_Ayuno: 125, IMC: 29.8, Fumador: 'Si', Ejercicio_Semanal_Hrs: 1.0, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-05', Edad: 38, Genero: 'Masculino', Presion_Sistolica: 122, Colesterol_Total: 195, Glucosa_Ayuno: 88, IMC: 24.6, Fumador: 'No', Ejercicio_Semanal_Hrs: 5.0, Riesgo_Cardiovascular: 'Bajo' },
      { Paciente_ID: 'P-06', Edad: 58, Genero: 'Femenino', Presion_Sistolica: 144, Colesterol_Total: 235, Glucosa_Ayuno: 118, IMC: 28.5, Fumador: 'No', Ejercicio_Semanal_Hrs: 2.0, Riesgo_Cardiovascular: 'Moderado' },
      { Paciente_ID: 'P-07', Edad: 49, Genero: 'Masculino', Presion_Sistolica: 135, Colesterol_Total: 215, Glucosa_Ayuno: 99, IMC: 26.2, Fumador: 'Si', Ejercicio_Semanal_Hrs: 1.5, Riesgo_Cardiovascular: 'Moderado' },
      { Paciente_ID: 'P-08', Edad: 66, Genero: 'Femenino', Presion_Sistolica: 158, Colesterol_Total: 275, Glucosa_Ayuno: 155, IMC: 33.4, Fumador: 'No', Ejercicio_Semanal_Hrs: 0.0, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-09', Edad: 41, Genero: 'Femenino', Presion_Sistolica: 115, Colesterol_Total: 172, Glucosa_Ayuno: 86, IMC: 22.0, Fumador: 'No', Ejercicio_Semanal_Hrs: 6.0, Riesgo_Cardiovascular: 'Bajo' },
      { Paciente_ID: 'P-10', Edad: 52, Genero: 'Masculino', Presion_Sistolica: 142, Colesterol_Total: 228, Glucosa_Ayuno: 112, IMC: 28.1, Fumador: 'Si', Ejercicio_Semanal_Hrs: 2.0, Riesgo_Cardiovascular: 'Moderado' },
      { Paciente_ID: 'P-11', Edad: 60, Genero: 'Masculino', Presion_Sistolica: 150, Colesterol_Total: 250, Glucosa_Ayuno: 130, IMC: 30.5, Fumador: 'No', Ejercicio_Semanal_Hrs: 1.0, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-12', Edad: 35, Genero: 'Femenino', Presion_Sistolica: 112, Colesterol_Total: 168, Glucosa_Ayuno: 84, IMC: 21.5, Fumador: 'No', Ejercicio_Semanal_Hrs: 4.5, Riesgo_Cardiovascular: 'Bajo' },
      { Paciente_ID: 'P-13', Edad: 73, Genero: 'Masculino', Presion_Sistolica: 170, Colesterol_Total: 290, Glucosa_Ayuno: 168, IMC: 34.1, Fumador: 'Si', Ejercicio_Semanal_Hrs: 0.5, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-14', Edad: 47, Genero: 'Femenino', Presion_Sistolica: 126, Colesterol_Total: 202, Glucosa_Ayuno: 94, IMC: 25.0, Fumador: 'No', Ejercicio_Semanal_Hrs: 3.5, Riesgo_Cardiovascular: 'Bajo' },
      { Paciente_ID: 'P-15', Edad: 55, Genero: 'Masculino', Presion_Sistolica: 148, Colesterol_Total: 240, Glucosa_Ayuno: 122, IMC: 29.2, Fumador: 'Si', Ejercicio_Semanal_Hrs: 1.0, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-16', Edad: 64, Genero: 'Femenino', Presion_Sistolica: 152, Colesterol_Total: 258, Glucosa_Ayuno: 138, IMC: 32.0, Fumador: 'No', Ejercicio_Semanal_Hrs: 1.5, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-17', Edad: 42, Genero: 'Masculino', Presion_Sistolica: 120, Colesterol_Total: 180, Glucosa_Ayuno: 90, IMC: 23.8, Fumador: 'No', Ejercicio_Semanal_Hrs: 4.0, Riesgo_Cardiovascular: 'Bajo' },
      { Paciente_ID: 'P-18', Edad: 59, Genero: 'Femenino', Presion_Sistolica: 140, Colesterol_Total: 224, Glucosa_Ayuno: 108, IMC: 27.8, Fumador: 'No', Ejercicio_Semanal_Hrs: 2.0, Riesgo_Cardiovascular: 'Moderado' },
      { Paciente_ID: 'P-19', Edad: 68, Genero: 'Masculino', Presion_Sistolica: 165, Colesterol_Total: 280, Glucosa_Ayuno: 160, IMC: 31.9, Fumador: 'Si', Ejercicio_Semanal_Hrs: 0.0, Riesgo_Cardiovascular: 'Alto' },
      { Paciente_ID: 'P-20', Edad: 37, Genero: 'Femenino', Presion_Sistolica: 110, Colesterol_Total: 162, Glucosa_Ayuno: 82, IMC: 20.9, Fumador: 'No', Ejercicio_Semanal_Hrs: 5.5, Riesgo_Cardiovascular: 'Bajo' },
    ],
  },
  {
    id: 'finance',
    name: 'Evaluación Crediticia & Finanzas',
    sector: 'Finanzas & Servicios Bancarios',
    description: 'Análisis de riesgo de clientes para aprobación de préstamos personales e hipotecas.',
    rows: 30,
    data: [
      { Cliente_ID: 'CLI-801', Ingreso_Mensual: 4500, Score_Crediticio: 740, Deuda_Total: 12000, Antiguedad_Laboral_Anios: 6, Edad: 36, Tipo_Prestamo: 'Hipotecario', Aprobado: 'Si', Tasa_Interes_Pct: 7.2 },
      { Cliente_ID: 'CLI-802', Ingreso_Mensual: 1800, Score_Crediticio: 580, Deuda_Total: 9500, Antiguedad_Laboral_Anios: 1, Edad: 24, Tipo_Prestamo: 'Personal', Aprobado: 'No', Tasa_Interes_Pct: 18.5 },
      { Cliente_ID: 'CLI-803', Ingreso_Mensual: 6200, Score_Crediticio: 810, Deuda_Total: 15000, Antiguedad_Laboral_Anios: 10, Edad: 44, Tipo_Prestamo: 'Hipotecario', Aprobado: 'Si', Tasa_Interes_Pct: 6.5 },
      { Cliente_ID: 'CLI-804', Ingreso_Mensual: 2900, Score_Crediticio: 640, Deuda_Total: 8000, Antiguedad_Laboral_Anios: 3, Edad: 29, Tipo_Prestamo: 'Automotriz', Aprobado: 'Si', Tasa_Interes_Pct: 11.0 },
      { Cliente_ID: 'CLI-805', Ingreso_Mensual: 2100, Score_Crediticio: 590, Deuda_Total: 11000, Antiguedad_Laboral_Anios: 2, Edad: 31, Tipo_Prestamo: 'Personal', Aprobado: 'No', Tasa_Interes_Pct: 19.0 },
      { Cliente_ID: 'CLI-806', Ingreso_Mensual: 5400, Score_Crediticio: 760, Deuda_Total: 18000, Antiguedad_Laboral_Anios: 8, Edad: 40, Tipo_Prestamo: 'Hipotecario', Aprobado: 'Si', Tasa_Interes_Pct: 7.0 },
      { Cliente_ID: 'CLI-807', Ingreso_Mensual: 3300, Score_Crediticio: 690, Deuda_Total: 7200, Antiguedad_Laboral_Anios: 4, Edad: 33, Tipo_Prestamo: 'Automotriz', Aprobado: 'Si', Tasa_Interes_Pct: 9.8 },
      { Cliente_ID: 'CLI-808', Ingreso_Mensual: 8500, Score_Crediticio: 830, Deuda_Total: 22000, Antiguedad_Laboral_Anios: 14, Edad: 49, Tipo_Prestamo: 'Hipotecario', Aprobado: 'Si', Tasa_Interes_Pct: 6.2 },
      { Cliente_ID: 'CLI-809', Ingreso_Mensual: 1600, Score_Crediticio: 540, Deuda_Total: 7000, Antiguedad_Laboral_Anios: 1, Edad: 22, Tipo_Prestamo: 'Personal', Aprobado: 'No', Tasa_Interes_Pct: 21.0 },
      { Cliente_ID: 'CLI-810', Ingreso_Mensual: 4100, Score_Crediticio: 715, Deuda_Total: 10500, Antiguedad_Laboral_Anios: 5, Edad: 35, Tipo_Prestamo: 'Automotriz', Aprobado: 'Si', Tasa_Interes_Pct: 8.9 },
      { Cliente_ID: 'CLI-811', Ingreso_Mensual: 2400, Score_Crediticio: 610, Deuda_Total: 6500, Antiguedad_Laboral_Anios: 2, Edad: 27, Tipo_Prestamo: 'Personal', Aprobado: 'No', Tasa_Interes_Pct: 16.5 },
      { Cliente_ID: 'CLI-812', Ingreso_Mensual: 7200, Score_Crediticio: 795, Deuda_Total: 19500, Antiguedad_Laboral_Anios: 11, Edad: 46, Tipo_Prestamo: 'Hipotecario', Aprobado: 'Si', Tasa_Interes_Pct: 6.8 },
      { Cliente_ID: 'CLI-813', Ingreso_Mensual: 3600, Score_Crediticio: 675, Deuda_Total: 9000, Antiguedad_Laboral_Anios: 4, Edad: 32, Tipo_Prestamo: 'Automotriz', Aprobado: 'Si', Tasa_Interes_Pct: 10.2 },
      { Cliente_ID: 'CLI-814', Ingreso_Mensual: 5000, Score_Crediticio: 750, Deuda_Total: 14000, Antiguedad_Laboral_Anios: 7, Edad: 38, Tipo_Prestamo: 'Hipotecario', Aprobado: 'Si', Tasa_Interes_Pct: 7.1 },
      { Cliente_ID: 'CLI-815', Ingreso_Mensual: 1950, Score_Crediticio: 570, Deuda_Total: 8800, Antiguedad_Laboral_Anios: 1, Edad: 25, Tipo_Prestamo: 'Personal', Aprobado: 'No', Tasa_Interes_Pct: 19.5 },
    ],
  },
  {
    id: 'hr',
    name: 'Gestión de Talento Humano & Desempeño',
    sector: 'Recursos Humanos & Gestión de Talento',
    description: 'Indicadores laborales de colaboradores, bandas salariales, horas extras y clima laboral.',
    rows: 25,
    data: [
      { Colaborador_ID: 'EMP-01', Departamento: 'Ingenieria', Salario_USD: 4200, Antiguedad_Anios: 4, Desempeno_Puntaje: 92, Horas_Extras_Mes: 12, Satisfaccion_Clima: 8.5, Modalidad: 'Hibrido' },
      { Colaborador_ID: 'EMP-02', Departamento: 'Ventas', Salario_USD: 2800, Antiguedad_Anios: 2, Desempeno_Puntaje: 86, Horas_Extras_Mes: 22, Satisfaccion_Clima: 7.2, Modalidad: 'Presencial' },
      { Colaborador_ID: 'EMP-03', Departamento: 'Marketing', Salario_USD: 3100, Antiguedad_Anios: 3, Desempeno_Puntaje: 88, Horas_Extras_Mes: 8, Satisfaccion_Clima: 8.0, Modalidad: 'Remoto' },
      { Colaborador_ID: 'EMP-04', Departamento: 'Ingenieria', Salario_USD: 5600, Antiguedad_Anios: 7, Desempeno_Puntaje: 96, Horas_Extras_Mes: 15, Satisfaccion_Clima: 9.1, Modalidad: 'Hibrido' },
      { Colaborador_ID: 'EMP-05', Departamento: 'Operaciones', Salario_USD: 2300, Antiguedad_Anios: 1, Desempeno_Puntaje: 74, Horas_Extras_Mes: 30, Satisfaccion_Clima: 6.0, Modalidad: 'Presencial' },
      { Colaborador_ID: 'EMP-06', Departamento: 'Recursos Humanos', Salario_USD: 2900, Antiguedad_Anios: 3, Desempeno_Puntaje: 84, Horas_Extras_Mes: 5, Satisfaccion_Clima: 8.8, Modalidad: 'Hibrido' },
      { Colaborador_ID: 'EMP-07', Departamento: 'Ventas', Salario_USD: 3900, Antiguedad_Anios: 5, Desempeno_Puntaje: 94, Horas_Extras_Mes: 26, Satisfaccion_Clima: 7.8, Modalidad: 'Presencial' },
      { Colaborador_ID: 'EMP-08', Departamento: 'Ingenieria', Salario_USD: 3600, Antiguedad_Anios: 2, Desempeno_Puntaje: 90, Horas_Extras_Mes: 10, Satisfaccion_Clima: 8.7, Modalidad: 'Remoto' },
      { Colaborador_ID: 'EMP-09', Departamento: 'Marketing', Salario_USD: 2600, Antiguedad_Anios: 1, Desempeno_Puntaje: 79, Horas_Extras_Mes: 6, Satisfaccion_Clima: 7.5, Modalidad: 'Remoto' },
      { Colaborador_ID: 'EMP-10', Departamento: 'Operaciones', Salario_USD: 3400, Antiguedad_Anios: 6, Desempeno_Puntaje: 83, Horas_Extras_Mes: 18, Satisfaccion_Clima: 6.9, Modalidad: 'Presencial' },
      { Colaborador_ID: 'EMP-11', Departamento: 'Ingenieria', Salario_USD: 6400, Antiguedad_Anios: 9, Desempeno_Puntaje: 98, Horas_Extras_Mes: 14, Satisfaccion_Clima: 9.3, Modalidad: 'Hibrido' },
      { Colaborador_ID: 'EMP-12', Departamento: 'Ventas', Salario_USD: 2500, Antiguedad_Anios: 1, Desempeno_Puntaje: 81, Horas_Extras_Mes: 20, Satisfaccion_Clima: 7.0, Modalidad: 'Presencial' },
      { Colaborador_ID: 'EMP-13', Departamento: 'Finanzas', Salario_USD: 3800, Antiguedad_Anios: 4, Desempeno_Puntaje: 89, Horas_Extras_Mes: 11, Satisfaccion_Clima: 8.2, Modalidad: 'Hibrido' },
      { Colaborador_ID: 'EMP-14', Departamento: 'Finanzas', Salario_USD: 5200, Antiguedad_Anios: 8, Desempeno_Puntaje: 93, Horas_Extras_Mes: 16, Satisfaccion_Clima: 8.5, Modalidad: 'Hibrido' },
      { Colaborador_ID: 'EMP-15', Departamento: 'Recursos Humanos', Salario_USD: 4100, Antiguedad_Anios: 5, Desempeno_Puntaje: 87, Horas_Extras_Mes: 4, Satisfaccion_Clima: 9.0, Modalidad: 'Remoto' },
    ],
  },
];
