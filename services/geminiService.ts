import { GoogleGenAI } from "@google/genai";
import { ProcessingOptions } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const convertVBACode = async (code: string, options: ProcessingOptions, customInstruction?: string): Promise<string> => {
  if (!code.trim()) return "";

  try {
    const model = 'gemini-2.5-flash';
    
    // Build dynamic instructions based on user options
    let instructionParts = [
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

    // Comment Handling
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

    // Add user custom instruction if provided
    if (customInstruction && customInstruction.trim()) {
      instructionParts.push(`
      [USER SPECIAL INSTRUCTION - PRIORITY]:
      The user has provided a specific direction that you MUST follow:
      "${customInstruction.trim()}"
      `);
    }

    const systemInstruction = instructionParts.join("\n");

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [{ text: `Apply the enabled rules and the special instruction to this code:\n\n${code}` }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, 
      }
    });

    let text = response.text?.trim() || "";

    // Clean up markdown formatting
    text = text.replace(/^```(?:vba|vb)?\s*[\r\n]*/i, ''); 
    text = text.replace(/[\r\n]*\s*```$/i, '');

    return text.trim();
  } catch (error) {
    console.error("Gemini Conversion Error:", error);
    throw new Error("حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي");
  }
};

export const analyzeCodeIssues = async (code: string): Promise<string[]> => {
    if (!code.trim()) return [];

    try {
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model: model,
            contents: `Analyze this VBA code for 64-bit compatibility. 
            Check if it lacks "PtrSafe" or uses "Long" for pointers/handles which would crash on 64-bit.
            Return a JSON string array of short Arabic warning messages. If safe, return []. Code: \n${code}`,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "[]";
        return JSON.parse(text);
    } catch (e) {
        return ["تعذر تحليل الكود بدقة حالياً."];
    }
}