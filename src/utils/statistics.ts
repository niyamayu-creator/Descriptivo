import {
  ColumnMetadata,
  NumericalStats,
  CategoricalStats,
  SectorContext,
  VariableType,
} from '../types/dataset';

// Helper to determine if a value is null/undefined/empty string
export function isMissing(val: any): boolean {
  return (
    val === null ||
    val === undefined ||
    val === '' ||
    val === 'NA' ||
    val === 'N/A' ||
    val === 'null' ||
    val === 'NaN' ||
    val === '-' ||
    val === '.'
  );
}

// Convert string/number to clean number if possible
export function parsePossibleNumber(val: any): number | null {
  if (isMissing(val)) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  let str = String(val).trim();
  // Strip currency symbols and spaces
  str = str.replace(/[$€£¥]/g, '').trim();

  // If format like "1.234,56" or "1234,56"
  if (/^-?\d{1,3}(\.\d{3})*,\d+$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d+,\d+$/.test(str)) {
    str = str.replace(',', '.');
  } else {
    // Normal format or remove commas in "1,234.56"
    str = str.replace(/,/g, '');
  }

  // Remove percentage sign
  if (str.endsWith('%')) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? null : num / 100;
  }

  const num = Number(str);
  return isNaN(num) ? null : num;
}

// Infer type of variable based on data distribution
export function inferVariableType(colName: string, rawValues: any[]): VariableType {
  const nonNull = rawValues.filter((v) => !isMissing(v));
  if (nonNull.length === 0) return 'categorical';

  const lowerName = colName.toLowerCase();

  // ID heuristic
  if (
    lowerName === 'id' ||
    lowerName.endsWith('_id') ||
    lowerName.endsWith('id') ||
    lowerName.includes('uuid') ||
    lowerName.includes('codigo') ||
    lowerName.includes('código') ||
    lowerName.includes('cedula') ||
    lowerName.includes('dni')
  ) {
    const uniqueCount = new Set(nonNull.map(String)).size;
    if (uniqueCount / nonNull.length > 0.85) {
      return 'id';
    }
  }

  // Boolean check
  const booleanValues = new Set(['true', 'false', '0', '1', 'si', 'no', 'yes', 's', 'n', 'verdadero', 'falso']);
  const isBool = nonNull.every((v) => {
    const s = String(v).trim().toLowerCase();
    return booleanValues.has(s) || typeof v === 'boolean';
  });
  if (isBool && nonNull.length > 2) {
    const unique = new Set(nonNull.map((v) => String(v).toLowerCase())).size;
    if (unique <= 2) return 'boolean';
  }

  // Date check
  const dateNamePatterns = ['date', 'fecha', 'timestamp', 'time', 'año', 'year', 'mes', 'month', 'dia', 'day'];
  const nameSuggestsDate = dateNamePatterns.some((p) => lowerName.includes(p));
  let validDateCount = 0;
  for (const v of nonNull.slice(0, 50)) {
    if (v instanceof Date && !isNaN(v.getTime())) {
      validDateCount++;
      continue;
    }
    const str = String(v).trim();
    // common date formats: YYYY-MM-DD, DD/MM/YYYY, etc.
    if (str.length >= 6 && (str.includes('-') || str.includes('/') || str.includes('T'))) {
      const parsed = Date.parse(str);
      if (!isNaN(parsed) && str.length > 4) validDateCount++;
    }
  }
  if (validDateCount / Math.min(nonNull.length, 50) > 0.8 || (nameSuggestsDate && validDateCount > 0)) {
    return 'datetime';
  }

  // Numeric check
  let numericCount = 0;
  for (const v of nonNull) {
    if (parsePossibleNumber(v) !== null) {
      numericCount++;
    }
  }

  if (numericCount / nonNull.length >= 0.85) {
    return 'numeric';
  }

  return 'categorical';
}

// Compute comprehensive numerical statistics
export function computeNumericalStats(values: any[]): NumericalStats {
  const numbers: number[] = [];
  let missing = 0;

  for (const v of values) {
    const parsed = parsePossibleNumber(v);
    if (parsed !== null) {
      numbers.push(parsed);
    } else {
      missing++;
    }
  }

  const count = values.length;
  const validCount = numbers.length;
  const missingPercent = count > 0 ? (missing / count) * 100 : 0;

  if (validCount === 0) {
    return {
      count,
      validCount: 0,
      missingCount: missing,
      missingPercent,
      mean: 0,
      stdDev: 0,
      variance: 0,
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      iqr: 0,
      lowerWhisker: 0,
      upperWhisker: 0,
      outliers: [],
      outlierCount: 0,
      skewness: 0,
      kurtosis: 0,
      cv: 0,
      distributionShape: 'Simétrica',
    };
  }

  // Sort ascending
  numbers.sort((a, b) => a - b);

  const sum = numbers.reduce((acc, val) => acc + val, 0);
  const mean = sum / validCount;

  // Variance & Standard Deviation
  let sumSqDiff = 0;
  let sumCubeDiff = 0;
  let sumFourthDiff = 0;

  for (const n of numbers) {
    const diff = n - mean;
    sumSqDiff += diff * diff;
    sumCubeDiff += diff * diff * diff;
    sumFourthDiff += diff * diff * diff * diff;
  }

  const variance = validCount > 1 ? sumSqDiff / (validCount - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // Percentiles helper
  const getPercentile = (p: number): number => {
    if (validCount === 1) return numbers[0];
    const index = p * (validCount - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return numbers[lower] * (1 - weight) + numbers[upper] * weight;
  };

  const min = numbers[0];
  const q1 = getPercentile(0.25);
  const median = getPercentile(0.5);
  const q3 = getPercentile(0.75);
  const max = numbers[validCount - 1];

  const iqr = q3 - q1;
  const lowerThreshold = q1 - 1.5 * iqr;
  const upperThreshold = q3 + 1.5 * iqr;

  // Whiskers bounded by actual data points within 1.5 * IQR
  let lowerWhisker = min;
  for (let i = 0; i < validCount; i++) {
    if (numbers[i] >= lowerThreshold) {
      lowerWhisker = numbers[i];
      break;
    }
  }

  let upperWhisker = max;
  for (let i = validCount - 1; i >= 0; i--) {
    if (numbers[i] <= upperThreshold) {
      upperWhisker = numbers[i];
      break;
    }
  }

  const outliers: number[] = [];
  for (const n of numbers) {
    if (n < lowerThreshold || n > upperThreshold) {
      outliers.push(n);
    }
  }

  // Skewness & Kurtosis
  let skewness = 0;
  let kurtosis = 0;
  if (stdDev > 0 && validCount > 2) {
    skewness = (sumCubeDiff / validCount) / Math.pow(stdDev, 3);
    if (validCount > 3) {
      kurtosis = (sumFourthDiff / validCount) / Math.pow(stdDev, 4) - 3;
    }
  }

  // Coefficient of Variation
  const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

  // Shape interpretation
  let distributionShape: NumericalStats['distributionShape'] = 'Simétrica';
  if (skewness > 0.6) {
    distributionShape = 'Asimetría Positiva (Derecha)';
  } else if (skewness < -0.6) {
    distributionShape = 'Asimetría Negativa (Izquierda)';
  } else if (kurtosis < -1) {
    distributionShape = 'Aplanada';
  } else if (kurtosis > 1.5) {
    distributionShape = 'Puntiaguda';
  }

  return {
    count,
    validCount,
    missingCount: missing,
    missingPercent,
    mean,
    stdDev,
    variance,
    min,
    q1,
    median,
    q3,
    max,
    iqr,
    lowerWhisker,
    upperWhisker,
    outliers,
    outlierCount: outliers.length,
    skewness,
    kurtosis,
    cv,
    distributionShape,
  };
}

// Compute Categorical Statistics
export function computeCategoricalStats(values: any[]): CategoricalStats {
  const counts: Record<string, number> = {};
  let missing = 0;
  let validCount = 0;

  for (const v of values) {
    if (isMissing(v)) {
      missing++;
    } else {
      validCount++;
      const s = String(v).trim();
      counts[s] = (counts[s] || 0) + 1;
    }
  }

  const count = values.length;
  const missingPercent = count > 0 ? (missing / count) * 100 : 0;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  let mode = 'N/A';
  let modeFreq = 0;
  if (entries.length > 0) {
    mode = entries[0][0];
    modeFreq = entries[0][1];
  }

  const topCategories = entries.slice(0, 10).map(([label, c]) => ({
    label,
    count: c,
    percent: validCount > 0 ? (c / validCount) * 100 : 0,
  }));

  return {
    count,
    validCount,
    missingCount: missing,
    missingPercent,
    uniqueCount: entries.length,
    mode,
    modeFreq,
    modePercent: validCount > 0 ? (modeFreq / validCount) * 100 : 0,
    topCategories,
  };
}

// Sector detection heuristic based on column semantic analysis
export function detectSector(columns: string[], data: Record<string, any>[]): SectorContext {
  const lowerCols = columns.map((c) => c.toLowerCase());
  const colText = lowerCols.join(' ');

  const sectors = [
    {
      sector: 'Salud & Medicina Clínica',
      icon: 'HeartPulse',
      color: 'rose',
      keywords: [
        'paciente', 'patient', 'edad', 'age', 'diagnostico', 'diagnostic', 'glucosa', 'glucose',
        'presion', 'blood_pressure', 'colesterol', 'cholesterol', 'bmi', 'imc', 'sintoma',
        'tratamiento', 'dosis', 'hospital', 'medico', 'clinica', 'frecuencia_cardiaca', 'oxigeno'
      ],
      description: 'Datos biomédicos, epidemiológicos o de gestión hospitalaria y pacientes.',
      domainMetrics: ['Distribución por grupos de riesgo', 'Presión/Glucosa media', 'Tasa de morbilidad'],
    },
    {
      sector: 'Comercio, Ventas & Retail',
      icon: 'ShoppingBag',
      color: 'emerald',
      keywords: [
        'venta', 'sales', 'precio', 'price', 'producto', 'product', 'sku', 'cliente', 'customer',
        'descuento', 'discount', 'cantidad', 'quantity', 'ingreso', 'revenue', 'tienda', 'store',
        'categoria', 'category', 'orden', 'order', 'margen', 'factura', 'ticket'
      ],
      description: 'Transacciones comerciales, ventas minoristas, carritos y rendimiento de productos.',
      domainMetrics: ['Ticket promedio', 'Volumen de ventas por categoría', 'Margen bruto unitario'],
    },
    {
      sector: 'Finanzas & Servicios Bancarios',
      icon: 'Landmark',
      color: 'blue',
      keywords: [
        'credito', 'credit', 'score', 'interes', 'interest', 'saldo', 'balance', 'deuda', 'debt',
        'prestamo', 'loan', 'inversion', 'investment', 'tasa', 'rate', 'morosidad', 'default',
        'riesgo', 'risk', 'patrimonio', 'banco', 'transaccion', 'cuota'
      ],
      description: 'Portafolio financiero, evaluación crediticia, riesgo y transacciones bancarias.',
      domainMetrics: ['Ratio de endeudamiento', 'Tasa media de morosidad', 'Score de crédito promedio'],
    },
    {
      sector: 'Recursos Humanos & Gestión de Talento',
      icon: 'Users',
      color: 'indigo',
      keywords: [
        'empleado', 'employee', 'salario', 'salary', 'sueldo', 'departamento', 'department',
        'puesto', 'role', 'antiguedad', 'tenure', 'desempeño', 'performance', 'rotacion', 'turnover',
        'horas_extras', 'overtime', 'evaluacion', 'capacitacion', 'edad', 'genero'
      ],
      description: 'Métricas de personal, compensaciones, clima organizacional y retención.',
      domainMetrics: ['Salario medio y mediana', 'Tasa de retención', 'Distribución de desempeño'],
    },
    {
      sector: 'Manufactura, Calidad & Producción',
      icon: 'Factory',
      color: 'amber',
      keywords: [
        'temperatura', 'temperature', 'presion', 'pressure', 'defecto', 'defect', 'calidad', 'quality',
        'lote', 'batch', 'maquina', 'machine', 'tiempo_ciclo', 'cycle_time', 'turno', 'shift',
        'produccion', 'production', 'tolerancia', 'scrap', 'mantenimiento', 'vibracion'
      ],
      description: 'Control de procesos industriales, aseguramiento de la calidad y telemetría operativa.',
      domainMetrics: ['Tasa de defectos (PPM)', 'Tiempo de ciclo medio', 'OEE y dispersión de tolerancias'],
    },
    {
      sector: 'Logística, Transporte & Cadena de Suministro',
      icon: 'Truck',
      color: 'cyan',
      keywords: [
        'envio', 'shipping', 'entrega', 'delivery', 'distancia', 'distance', 'peso', 'weight',
        'origen', 'origin', 'destino', 'destination', 'flota', 'fleet', 'ruta', 'route',
        'almacen', 'warehouse', 'retraso', 'delay', 'combustible', 'flete'
      ],
      description: 'Operaciones de despacho, tiempos de entrega, transporte y almacenamiento.',
      domainMetrics: ['Tiempo promedio de entrega', 'Costo por km/tonelada', 'Tasa de entregas a tiempo (OTIF)'],
    },
    {
      sector: 'Tecnología, SaaS & Producto Digital',
      icon: 'Cpu',
      color: 'purple',
      keywords: [
        'usuario', 'user', 'sesion', 'session', 'dau', 'mau', 'churn', 'arr', 'mrr', 'suscripcion',
        'subscription', 'evento', 'event', 'latencia', 'latency', 'api', 'conversion', 'funnel',
        'click', 'bounce_rate', 'feature', 'tier', 'licencia'
      ],
      description: 'Métricas de producto de software, suscripciones recurrentes y uso digital.',
      domainMetrics: ['Tasa de Churn', 'Ingreso recurrente promedio (ARPU)', 'Conversión de funnel'],
    },
  ];

  let bestSector = sectors[0];
  let highestScore = 0;

  for (const s of sectors) {
    let score = 0;
    for (const kw of s.keywords) {
      if (colText.includes(kw)) {
        score += 2;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestSector = s;
    }
  }

  if (highestScore < 3) {
    return {
      sector: 'General / Análisis Empresarial Transversal',
      confidence: 60,
      description: 'Dataset multipropósito con variables de negocio, operativas y cuantitativas.',
      keyVariablesInferred: columns.slice(0, 4),
      domainMetrics: ['Tendencia central multivariada', 'Índice de completitud', 'Valores atípicos detectados'],
      icon: 'BarChart3',
      color: 'slate',
    };
  }

  const matchedKeywords = bestSector.keywords.filter((kw) => colText.includes(kw));
  const confidence = Math.min(98, Math.max(70, Math.round((highestScore / 10) * 85)));

  return {
    sector: bestSector.sector,
    confidence,
    description: bestSector.description,
    keyVariablesInferred: matchedKeywords.slice(0, 4),
    domainMetrics: bestSector.domainMetrics,
    icon: bestSector.icon,
    color: bestSector.color,
  };
}

// Bivariate correlation and linear regression computation
export function computeCorrelation(
  data: Record<string, any>[],
  xCol: string,
  yCol: string
) {
  const points: { x: number; y: number; originalRow: Record<string, any> }[] = [];

  for (const row of data) {
    const xVal = parsePossibleNumber(row[xCol]);
    const yVal = parsePossibleNumber(row[yCol]);
    if (xVal !== null && yVal !== null) {
      points.push({ x: xVal, y: yVal, originalRow: row });
    }
  }

  const n = points.length;
  if (n < 2) {
    return {
      r: 0,
      r2: 0,
      slope: 0,
      intercept: 0,
      points,
      validPointsCount: n,
      interpretation: 'Datos insuficientes para calcular correlación',
      direction: 'Sin relación',
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const numerator = n * sumXY - sumX * sumY;
  const denomX = n * sumX2 - sumX * sumX;
  const denomY = n * sumY2 - sumY * sumY;
  const denominator = Math.sqrt(denomX * denomY);

  let r = 0;
  if (denominator !== 0) {
    r = numerator / denominator;
  }

  // Clip between -1 and 1
  r = Math.max(-1, Math.min(1, r));
  const r2 = r * r;

  let slope = 0;
  let intercept = meanY;
  if (denomX !== 0) {
    slope = (n * sumXY - sumX * sumY) / denomX;
    intercept = meanY - slope * meanX;
  }

  let direction = 'Neutra';
  if (slope > 0.001) direction = 'Positiva (Creciente)';
  else if (slope < -0.001) direction = 'Negativa (Decreciente)';

  let strength = 'Muy débil o nula';
  const absR = Math.abs(r);
  if (absR >= 0.8) strength = 'Muy fuerte';
  else if (absR >= 0.6) strength = 'Fuerte';
  else if (absR >= 0.4) strength = 'Moderada';
  else if (absR >= 0.2) strength = 'Débil';

  const interpretation = `Correlación ${strength} (${direction}), con un coeficiente de determinación R² de ${(r2 * 100).toFixed(1)}%.`;

  return {
    r,
    r2,
    slope,
    intercept,
    points,
    validPointsCount: n,
    interpretation,
    direction,
  };
}
