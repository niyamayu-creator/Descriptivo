import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// AI Expert Analysis endpoint using Gemini 3.8 Flash
app.post('/api/ai-expert', async (req, res) => {
  try {
    const { datasetSummary, sectorContext, specificQuery } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured in environment, utilizing rule-based expert engine.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Eres un Científico de Datos Senior y Consultor Estadístico Experto de nivel mundial.
Analiza la siguiente información de un dataset para generar un informe de "Análisis de Experto a Nivel de Tendencias" riguroso, perspicaz y altamente estructurado en español.

CONTEXTO DEL SECTOR Y NEGOCIO:
${sectorContext || 'Sector no especificado (detección automática)'}

RESUMEN ESTADÍSTICO DEL DATASET:
${typeof datasetSummary === 'string' ? datasetSummary : JSON.stringify(datasetSummary, null, 2)}

${specificQuery ? `PREGUNTA ESPECÍFICA DEL USUARIO:\n${specificQuery}\n` : ''}

Por favor, genera un análisis exhaustivo con las siguientes secciones en formato Markdown estructurado:
### 1. Resumen Ejecutivo y Diagnóstico del Sector
- Diagnóstico del dominio y contexto operativo de los datos.
- Salud y calidad global del dataset (completitud, granularidad, sesgos potenciales).

### 2. Análisis Profundo de Tendencias y Patrones Clave
- Tendencias centrales, dispersión y comportamiento de las variables principales.
- Correlaciones y relaciones bivariadas significativas detectadas o hipotetizadas con base en la distribución.
- Patrones de concentración, estacionalidad o asimetrías críticas.

### 3. Detección de Anomalías y Valores Atípicos (Outliers)
- Variables con mayor presencia de valores atípicos y su posible causa (errores de captura, casos extraordinarios, fraude o alto rendimiento).
- Impacto de estos extremos en la toma de decisiones.

### 4. Hallazgos de Alto Impacto para el Sector (${sectorContext || 'General'})
- Qué significan estos datos en la práctica para la toma de decisiones en este sector.
- Riesgos operativos, cuellos de botella o alertas tempranas identificadas.

### 5. Recomendaciones Estratégicas y Próximos Pasos
- 3 a 5 recomendaciones cuantitativas y accionables basadas en las tendencias analizadas.
- Próximos modelos predictivos o pruebas de hipótesis sugeridas (e.g. regresiones, clustering, series temporales).

Sé directo, profesional, preciso con las cifras numéricas y utiliza terminología estadística clara accesible para líderes de negocio.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const text = response.text || '';
    return res.json({ analysis: text, fallback: false });
  } catch (error: any) {
    console.error('Error generating expert analysis:', error);
    return res.status(500).json({
      error: error.message || 'Error executing AI expert analysis',
      fallback: true,
    });
  }
});

// Mount Vite middleware in dev or serve static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
