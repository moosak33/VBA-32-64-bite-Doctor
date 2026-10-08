import { ProcessingOptions } from "../types";
import { ATRIA_CONFIG } from "../config/atria";
import { GoogleGenAI } from "@google/genai";

// Primary call to Atria ASI with fallback
async function requestAtriaConversion(
  prompt: string,
  systemInstruction: string,
  timeoutMs: number = 35000
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ATRIA_CONFIG.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ATRIA_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: ATRIA_CONFIG.model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Atria ASI");
    }
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fast Gemini Flash fallback if Atria hangs or fails
async function requestGeminiConversion(
  prompt: string,
  systemInstruction: string
): Promise<string> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.2
    }
  });

  return response.text || "";
}

export const convertVBACode = async (
  code: string,
  options: ProcessingOptions,
  customInstruction?: string
): Promise<string> => {
  if (!code.trim()) return "";

  // Build dynamic instructions based on user options
  const instructionParts = [
    `You are an expert Visual Basic (VBA/VB6) developer known as "VBA Code Doctor".`,
    `Your task is to rewrite the user's code applying ONLY the enabled rules below.`,
    `Output raw VBA code only. Do NOT wrap the code in markdown blocks (e.g. no \`\`\`vba).`
  ];

  if (options.compatibility) {
    instructionParts.push(`
    [ENABLED] COMPATIBILITY RULE (32-bit & 64-bit):
    - Wrap every API 'Declare' statement in an #If VBA7 block:
      #If VBA7 Then
          Declare PtrSafe Function ... Lib "..." (ByVal ... As LongPtr) As LongPtr
      #Else
          Declare Function ... Lib "..." (ByVal ... As Long) As Long
      #End If
    - Replace pointer and handle types (HWND, HDC, etc.) with LongPtr for VBA7.
    `);
  }

  if (options.codeCorrection) {
    instructionParts.push(`
    [ENABLED] CODE CORRECTION RULE:
    - Fix syntax errors, undeclared variables, loops or object assignment bugs.
    - Ensure 'Option Explicit' compliance.
    `);
  }

  if (options.formatting) {
    instructionParts.push(`
    [ENABLED] FORMATTING RULE:
    - Indent code cleanly using 4 spaces.
    - Fix keyword casing.
    `);
  }

  if (options.commentsAr && options.commentsEn) {
    instructionParts.push(`
    [ENABLED] COMMENTS RULE (BILINGUAL):
    - Add comprehensive comments in both Arabic and English.
    `);
  } else if (options.commentsAr) {
    instructionParts.push(`
    [ENABLED] COMMENTS RULE (ARABIC):
    - Add comprehensive comments in Arabic only.
    `);
  } else if (options.commentsEn) {
    instructionParts.push(`
    [ENABLED] COMMENTS RULE (ENGLISH):
    - Add comprehensive comments in English only.
    `);
  }

  if (options.errorHandling) {
    instructionParts.push(`
    [ENABLED] ERROR HANDLING RULE:
    - Wrap every Sub and Function with On Error GoTo ErrorHandler.
    `);
  }

  if (options.lineNumbers) {
    instructionParts.push(`
    [ENABLED] LINE NUMBERS RULE:
    - Add standard VBA line numbers (10, 20...) to executable lines.
    `);
  }

  if (customInstruction && customInstruction.trim()) {
    instructionParts.push(`
    [USER SPECIAL INSTRUCTION]:
    "${customInstruction.trim()}"
    `);
  }

  const systemInstruction = instructionParts.join("\n");
  const prompt = `Rewrite and enhance this VBA code according to the rules:\n\n${code}`;

  let rawOutput = "";

  // Try Atria ASI first
  try {
    rawOutput = await requestAtriaConversion(prompt, systemInstruction, 25000);
  } catch (atriaError: any) {
    console.warn("Atria ASI timeout or unavailable, falling back to backup engine...", atriaError?.message);
    try {
      rawOutput = await requestGeminiConversion(prompt, systemInstruction);
    } catch (fallbackError: any) {
      console.error("All AI engines failed:", fallbackError);
      throw new Error("تعذر معالجة الكود في الوقت الحالي بسبب بطء خادم المزود، يرجى المحاولة مرة أخرى.");
    }
  }

  let text = rawOutput.trim();
  text = text.replace(/^```(?:vba|vb)?\s*[\r\n]*/i, "");
  text = text.replace(/[\r\n]*\s*```$/i, "");
  return text.trim();
};

/**
 * Instant static analysis (runs in < 10ms with zero network lag)
 */
export const analyzeCodeIssues = async (code: string): Promise<string[]> => {
  if (!code.trim()) return [];

  const issues: string[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();

    // Check for 32-bit Declare statements missing PtrSafe
    if (lower.startsWith("declare ") || lower.includes(" declare ")) {
      if (!lower.includes("ptrsafe")) {
        issues.push(`السطر ${i + 1}: تصريح دالة API بنظام 32-بت قديم (يفتقر إلى PtrSafe للتوافق مع Office 64-بت).`);
      }
      if (lower.includes(" as long") && (lower.includes("hwnd") || lower.includes("hkey") || lower.includes("handle") || lower.includes("hdc") || lower.includes("ptr"))) {
        issues.push(`السطر ${i + 1}: استخدام نوع البيانات Long لمقبض/مؤشر ذاكرة، يجب استبداله بـ LongPtr لـ 64-بت.`);
      }
    }

    // Check missing Option Explicit at top
    if (i === 0 && !code.toLowerCase().includes("option explicit")) {
      issues.push("يُستحسن تضمين 'Option Explicit' في بداية الوحدة البرمجية لإلزام التصريح عن المتغيرات.");
    }

    // Detect On Error Resume Next without handling
    if (lower.includes("on error resume next")) {
      issues.push(`السطر ${i + 1}: استخدام 'On Error Resume Next' قد يُخفي الأخطاء البرمجية الحرجة.`);
    }

    // Detect GoTo without clean structure
    if (lower.startsWith("goto ") && !lower.includes("error")) {
      issues.push(`السطر ${i + 1}: تجنب استخدام GoTo المباشر للحفاظ على نظافة الهيكلية البرمجية.`);
    }
  }

  return issues;
};
