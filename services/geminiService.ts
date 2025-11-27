import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const convertVBACode = async (code: string): Promise<string> => {
  if (!code.trim()) return "";

  try {
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      You are an expert Visual Basic (VBA/VB6) developer.
      Your task is to convert the provided code to be fully compatible with BOTH Legacy 32-bit (VBA6) and Modern 32-bit/64-bit (VBA7) architectures using Conditional Compilation.

      STRICT RULES FOR EVERY 'DECLARE' STATEMENT:
      You must wrap every API declaration in an #If VBA7 block following this exact pattern:

      #If VBA7 Then
          ' Modern Syntax (VBA7 for 32-bit & 64-bit)
          ' 1. MUST use 'PtrSafe' keyword.
          ' 2. MUST use 'LongPtr' for Handles (hWnd, hDC), Pointers, and Memory Addresses.
          ' 3. Keep 'Long' for standard 32-bit integers.
          Public Declare PtrSafe Function Example Lib "dll" (ByVal hWnd As LongPtr) As Long
      #Else
          ' Legacy Syntax (VBA6 for older 32-bit only)
          ' 1. MUST NOT use 'PtrSafe'.
          ' 2. MUST use 'Long' for Handles and Pointers (LongPtr does not exist here).
          Public Declare Function Example Lib "dll" (ByVal hWnd As Long) As Long
      #End If

      ADDITIONAL RULES:
      1. Analyze parameters carefully. Only change types that are Pointers or Handles to LongPtr in the VBA7 section.
      2. Do not change the logic of Sub/Function bodies unless they rely on specific pointer arithmetic that differs.
      3. Return ONLY the code block. No markdown, no comments outside the code.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [{ text: `Convert this VBV/VBA code to dual architecture (VBA7/Legacy) format:\n\n${code}` }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Very low temperature for strict adherence to syntax rules
      }
    });

    return response.text?.trim() || "";
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