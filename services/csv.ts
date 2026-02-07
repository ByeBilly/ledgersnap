
/**
 * Robust CSV Parser for Browser
 * Handles quoted fields, escaped quotes, and empty values.
 */
export async function parseCsv(file: Blob): Promise<string[][]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  
  return lines
    .filter(line => line.trim().length > 0)
    .map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          // Handle escaped quotes (double quotes)
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
}

export function formatCsvPreview(data: string[][], maxRows = 50): string {
  // Take up to maxRows for more context in mapping, as text is lightweight
  return data.slice(0, maxRows).map(row => row.join(',')).join('\n');
}
