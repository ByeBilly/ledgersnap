import { ReceiptData, TransactionData } from "../types";

const apiBaseUrl = import.meta.env.VITE_API_URL as string;

export async function extractReceipt(base64Image: string): Promise<ReceiptData> {
  const response = await fetch(`${apiBaseUrl}/api/extract-receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Receipt extraction failed");
  }

  return response.json();
}

export async function mapBankData(rawContent: string): Promise<TransactionData[]> {
  const response = await fetch(`${apiBaseUrl}/api/map-bank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawContent })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Statement mapping failed");
  }

  return response.json();
}
