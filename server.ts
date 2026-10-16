/**
 * Full-stack Express server for InsightPilot AI
 * Mounts Vite middlewares in dev mode, serves production build in prod,
 * and provides secure server-side Gemini API endpoints for deep data analyst synthesis.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK safely on the server side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('[InsightPilot AI] Server-side Gemini AI initialized.');
  } catch (err) {
    console.warn('[InsightPilot AI] Could not initialize Gemini SDK:', err);
  }
} else {
  console.log('[InsightPilot AI] Running in local statistical calculation mode (GEMINI_API_KEY not configured).');
}

/**
 * POST /api/gemini/qa
 * Grounded Natural Language Question Answering
 */
app.post('/api/gemini/qa', async (req, res) => {
  const { question, computedAnswer, evidenceTable, columnsUsed, datasetMeta } = req.body;

  if (!ai || !apiKey) {
    // Return the local mathematical answer
    return res.json({
      answer: computedAnswer,
      isAi: false,
    });
  }

  try {
    const prompt = `
You are InsightPilot AI, an expert Senior Data Analyst.
A business user asked the following question about their dataset "${datasetMeta.name}":
Question: "${question}"

Pre-calculated, verified mathematical facts from the real dataset:
- Total Records Evaluated: ${datasetMeta.rows} rows × ${datasetMeta.cols} columns
- Columns Used: ${JSON.stringify(columnsUsed || [])}
- Computed Analysis: ${computedAnswer}
- Evidence Table Data: ${JSON.stringify(evidenceTable || {})}

Instructions:
1. Provide a professional, concise, direct answer (2-3 short sentences).
2. ONLY cite numbers that exist in the pre-calculated facts and evidence table above. Do NOT fabricate numbers or external facts.
3. State the exact columns used to reach this conclusion.
4. Keep the tone executive, objective, and data-grounded.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const aiText = response.text?.trim() || computedAnswer;

    return res.json({
      answer: aiText,
      isAi: true,
    });
  } catch (err: any) {
    console.error('[InsightPilot AI] Gemini Q&A error, using fallback:', err.message);
    return res.json({
      answer: computedAnswer,
      isAi: false,
    });
  }
});

/**
 * POST /api/gemini/insights
 * Executive Strategic Synthesis Briefing
 */
app.post('/api/gemini/insights', async (req, res) => {
  const { datasetMeta, currentInsights } = req.body;

  if (!ai || !apiKey) {
    return res.status(200).json({
      summary: null,
      fallback: true,
    });
  }

  try {
    const prompt = `
You are InsightPilot AI, a Principal Data Analyst delivering an Executive Briefing to business stakeholders.
Synthesize an executive summary for dataset "${datasetMeta.name}".

Verified Dataset Facts:
- Records: ${datasetMeta.rows} rows × ${datasetMeta.cols} columns
- Missing Values Rate: ${datasetMeta.missingRate}%
- Duplicate Records: ${datasetMeta.duplicates}
- Columns & Summary Metrics: ${JSON.stringify(datasetMeta.columns)}
- Detected Signals: ${JSON.stringify(currentInsights)}

Instructions:
- Format as 3 concise bullet points with bold headlines:
  1. **Portfolio Scale & Quality**: Volume and health audit.
  2. **Primary Performance Driver**: Highest yield segments and distribution skewness.
  3. **Strategic Action Item**: Recommended operational next step.
- Do NOT invent data not provided above.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({
      summary: response.text?.trim() || null,
      isAi: true,
    });
  } catch (err: any) {
    console.error('[InsightPilot AI] Gemini Insights error:', err.message);
    return res.status(200).json({
      summary: null,
      fallback: true,
    });
  }
});

/**
 * POST /api/gemini/sql
 * Natural Language to Safe Read-Only SQL Query Generation
 */
app.post('/api/gemini/sql', async (req, res) => {
  const { question, schema, sampleRows } = req.body;

  if (!ai || !apiKey) {
    return res.status(200).json({
      sql: null,
      explanation: null,
      fallback: true,
    });
  }

  try {
    const prompt = `
You are InsightPilot AI, an expert Database Architect and Senior SQL Analyst.
A business user wants to query their uploaded dataset using natural language.

Dataset Schema:
- Table Name: ${schema.tableName || 'dataset'}
- Columns:
${schema.columns.map((c: any) => `  * "${c.name}" (${c.type})`).join('\n')}

Sample Rows:
${JSON.stringify(sampleRows?.slice(0, 3) || [])}

User Question: "${question}"

Strict Security & Architectural Rules:
1. Generate ONLY a single, read-only SELECT query (or WITH clause followed by SELECT).
2. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or data-modifying commands.
3. Quote column names with double quotes if they contain spaces or camelCase (e.g. "Order Date", "Sales").
4. Always query from table "${schema.tableName || 'dataset'}".
5. Use standard ANSI SQL supported by in-memory SQLite / AlaSQL (e.g. SELECT, WHERE, GROUP BY, ORDER BY, SUM, AVG, COUNT, MIN, MAX, CASE WHEN, LIMIT).
6. Provide a concise explanation of what the query does and how it answers the user's question.
7. Recommend a chart type ('bar', 'line', 'donut', 'scatter', or 'table') if appropriate.

Respond in strict JSON format matching this schema:
{
  "sql": "SELECT ...",
  "explanation": "Detailed plain-English explanation...",
  "suggestedChart": "bar" | "line" | "donut" | "scatter" | "table"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    return res.json({
      sql: parsed.sql || null,
      explanation: parsed.explanation || null,
      suggestedChart: parsed.suggestedChart || 'table',
      isAi: true,
    });
  } catch (err: any) {
    console.error('[InsightPilot AI] Gemini SQL generation error:', err.message);
    return res.status(200).json({
      sql: null,
      explanation: null,
      fallback: true,
    });
  }
});

// Mount Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`[InsightPilot AI] Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
