import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const PRIMARY_MODEL = 'gemini-3.8-flash';
  const FALLBACK_MODEL = 'gemini-flash-latest';

  let globalConversionCount = 1428;

  // Counter endpoints
  app.get('/api/counter', (_req, res) => {
    res.json({ count: globalConversionCount });
  });

  app.post('/api/counter/hit', (_req, res) => {
    globalConversionCount += 1;
    res.json({ count: globalConversionCount });
  });

  // API Route: Convert VBA Code
  app.post('/api/convert', async (req, res) => {
    try {
      const { code, options = {}, customInstruction = '' } = req.body;
      if (!code || typeof code !== 'string' || !code.trim()) {
        return res.json({ result: '' });
      }

      const instructionParts = [
        `You are an expert Visual Basic (VBA/VB6) developer known as "VBA Code Doctor".`,
        `Your task is to rewrite the user's code applying ONLY the enabled rules below.`,
        `Output raw VBA code only. Do NOT wrap the code in markdown blocks (e.g. no \`\`\`vba).`
      ];

      if (options.compatibility) {
        instructionParts.push(`
        [ENABLED] COMPATIBILITY RULE (32-bit & 64-bit):
        - You MUST wrap every API 'Declare' statement in an #If VBA7 block.
        - #If VBA7 Then: Use 'Declare PtrSafe' and 'LongPtr' for handles/pointers.
        - #Else: Use 'Declare' (no PtrSafe) and 'Long' for handles/pointers.
        - Ensure the logic works on both architectures.
        `);
      }

      if (options.codeCorrection) {
        instructionParts.push(`
        [ENABLED] CODE CORRECTION RULE:
        - Fix any syntax errors or logical bugs in the code.
        - Ensure 'Option Explicit' compliance (declare missing variables).
        - Correct misuse of 'Set' for objects vs simple assignment.
        - Fix loop terminations (Next i, Loop, Wend) matching.
        - Address potential division by zero or type mismatch errors where obvious.
        `);
      }

      if (options.formatting) {
        instructionParts.push(`
        [ENABLED] FORMATTING RULE:
        - Indent code perfectly using 4 spaces.
        - Add blank lines between procedures.
        - Fix casing of keywords (e.g., 'sub' -> 'Sub', 'dim' -> 'Dim').
        `);
      }

      if (options.commentsAr && options.commentsEn) {
        instructionParts.push(`
        [ENABLED] COMMENTS RULE (BILINGUAL):
        - Add comprehensive comments to explain complex logic.
        - Comments MUST be in BOTH Arabic and English.
        - Example: ' حفظ الملف -- Save the file
        `);
      } else if (options.commentsAr) {
        instructionParts.push(`
        [ENABLED] COMMENTS RULE (ARABIC):
        - Add comprehensive comments to explain complex logic.
        - Comments MUST be in ARABIC ONLY.
        `);
      } else if (options.commentsEn) {
        instructionParts.push(`
        [ENABLED] COMMENTS RULE (ENGLISH):
        - Add comprehensive comments to explain complex logic.
        - Comments MUST be in ENGLISH ONLY.
        `);
      }

      if (options.errorHandling) {
        instructionParts.push(`
        [ENABLED] ERROR HANDLING RULE:
        - Wrap every Sub and Function with a robust error handler.
        - Pattern:
          On Error GoTo ErrorHandler
          ' ... code ...
          Exit Sub
          ErrorHandler:
          MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "Error"
          Resume Next ' Or Exit, depending on safety
        `);
      }

      if (options.lineNumbers) {
        instructionParts.push(`
        [ENABLED] LINE NUMBERS RULE:
        - Add standard VBA line numbers (10, 20, 30...) to every executable line of code.
        - This is for use with the 'Erl' function.
        - Do not number Dim statements, comments, or labels.
        `);
      }

      if (customInstruction && customInstruction.trim()) {
        instructionParts.push(`
        [USER SPECIAL INSTRUCTION - PRIORITY]:
        The user has provided a specific direction that you MUST follow:
        "${customInstruction.trim()}"
        `);
      }

      const systemInstruction = instructionParts.join("\n");

      let response;
      try {
        response = await ai.models.generateContent({
          model: PRIMARY_MODEL,
          contents: [
            {
              role: 'user',
              parts: [{ text: `Apply the enabled rules and the special instruction to this code:\n\n${code}` }]
            }
          ],
          config: {
            systemInstruction,
            temperature: 0.2,
          }
        });
      } catch (primaryErr) {
        console.warn(`Primary model ${PRIMARY_MODEL} failed, trying fallback ${FALLBACK_MODEL}:`, primaryErr);
        response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: [
            {
              role: 'user',
              parts: [{ text: `Apply the enabled rules and the special instruction to this code:\n\n${code}` }]
            }
          ],
          config: {
            systemInstruction,
            temperature: 0.2,
          }
        });
      }

      let text = response.text?.trim() || "";
      text = text.replace(/^```(?:vba|vb)?\s*[\r\n]*/i, '');
      text = text.replace(/[\r\n]*\s*```$/i, '');

      return res.json({ result: text.trim() });
    } catch (err: any) {
      console.error('Conversion Error:', err);
      return res.status(500).json({
        error: err?.message || 'حدث خطأ أثناء معالجة الكود بواسطة الذكاء الاصطناعي'
      });
    }
  });

  // API Route: Analyze VBA Code Issues
  app.post('/api/analyze', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== 'string' || !code.trim()) {
        return res.json({ issues: [] });
      }

      const prompt = `Analyze this VBA code for 64-bit compatibility. 
Check if it lacks "PtrSafe" or uses "Long" for pointers/handles which would crash on 64-bit.
Return a JSON array of short Arabic warning messages. If completely safe, return an empty array []. Code: \n${code}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: PRIMARY_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              }
            }
          }
        });
      } catch (primaryErr) {
        console.warn(`Primary model ${PRIMARY_MODEL} failed for analysis, trying fallback:`, primaryErr);
        response = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              }
            }
          }
        });
      }

      const text = response.text || "[]";
      let issues = [];
      try {
        issues = JSON.parse(text);
      } catch (parseErr) {
        console.warn('JSON parse issue in analysis:', parseErr);
        issues = [];
      }
      return res.json({ issues: Array.isArray(issues) ? issues : [] });
    } catch (err: any) {
      console.warn('Analyze Error:', err);
      return res.json({ issues: [] });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Frontend serving
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VBA Code Doctor server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
