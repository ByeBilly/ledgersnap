
import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, TransactionData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractReceipt(base64Image: string): Promise<ReceiptData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/webp" } },
        { text: "Extract receipt details with high precision. Be conservative with confidence values. Return JSON ONLY." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchant: { type: Type.STRING },
          merchant_abn: { type: Type.STRING },
          receipt_date: { type: Type.STRING, description: "YYYY-MM-DD" },
          receipt_time: { type: Type.STRING, description: "HH:MM" },
          total: { type: Type.NUMBER },
          gst_amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          payment_method: { type: Type.STRING },
          category_guess: { type: Type.STRING },
          confidence: {
            type: Type.OBJECT,
            properties: {
              overall: { type: Type.NUMBER },
              fields: {
                type: Type.OBJECT,
                properties: {
                  merchant: { type: Type.NUMBER },
                  receipt_date: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                  gst_amount: { type: Type.NUMBER }
                },
                required: ["merchant", "receipt_date", "total", "gst_amount"]
              }
            },
            required: ["overall", "fields"]
          },
          raw_text: { type: Type.STRING }
        },
        required: ["merchant", "total", "confidence", "raw_text"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
}

/**
 * Maps CSV or raw text bank data into the standard TransactionData[] schema.
 * Explicitly handles DD/MM/YYYY to YYYY-MM-DD conversion.
 */
export async function mapBankData(rawContent: string): Promise<TransactionData[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: `Analyze the following bank statement data (CSV or text). 
        1. Identify the headers and map columns to our standard schema.
        2. Convert dates to ISO YYYY-MM-DD (input may be DD/MM/YYYY).
        3. Identify Debit (negative/withdrawal) and Credit (positive/deposit) values.
        4. Provide a category_guess for each transaction.
        5. Filter out headers or non-transaction rows (like summary totals).
        
        Fields: txn_date (YYYY-MM-DD), description, debit (number|null), credit (number|null), balance (number|null), category_guess, confidence (0-1).
        
        Content:\n\n${rawContent}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            txn_date: { type: Type.STRING },
            description: { type: Type.STRING },
            debit: { type: Type.NUMBER, nullable: true },
            credit: { type: Type.NUMBER, nullable: true },
            balance: { type: Type.NUMBER, nullable: true },
            category_guess: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["txn_date", "description", "confidence"]
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
}
