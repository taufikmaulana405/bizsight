
/**
 * @fileOverview CSV utility functions for exporting and importing data.
 */

/**
 * Converts an array of objects to a CSV formatted string.
 * @param data - Array of data objects.
 * @param headers - Array of strings representing the CSV headers in order.
 * @returns CSV formatted string.
 */
export function convertToCSV(data: Record<string, any>[], headers: string[]): string {
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    let stringValue = String(value);
    // If the value contains a comma, newline, or double quote, wrap it in double quotes.
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      // Escape existing double quotes by doubling them.
      stringValue = stringValue.replace(/"/g, '""');
      return `"${stringValue}"`;
    }
    return stringValue;
  };

  const headerRow = headers.map(escapeCSVValue).join(',');
  const dataRows = data.map(row =>
    headers.map(header => {
      // Ensure date objects are converted to ISO strings
      if (row[header] instanceof Date) {
        return escapeCSVValue(row[header].toISOString());
      }
      return escapeCSVValue(row[header]);
    }).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a browser download for a CSV string.
 * Must be called on the client-side.
 * @param csvString - The CSV content as a string.
 * @param filename - The desired name for the downloaded file.
 */
export function downloadCSV(csvString: string, filename: string): void {
  if (typeof window === 'undefined') {
    console.error("downloadCSV can only be called on the client-side.");
    return;
  }
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) { // feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Simplified CSV parser.
 * Handles comma-separated values, basic quoting (") for fields containing commas.
 * Assumes the first line is headers.
 * Does not handle newlines within quoted fields or very complex CSVs.
 * @param csvText The CSV content as a string.
 * @returns An array of objects, where each object represents a row.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 1) return []; // Need at least headers

  // Trim and remove surrounding quotes from headers
  const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines

    const values: string[] = [];
    // Basic regex to split by comma, but not if comma is inside quotes.
    // This regex is simple and may not cover all edge cases (e.g., escaped quotes within quotes).
    const CsvSplitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const fields = line.split(CsvSplitRegex);

    for (const field of fields) {
      let value = field.trim();
      // Remove surrounding quotes if present (handles cases like ""value"")
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      // Replace CSV standard double quotes "" with a single quote "
      value = value.replace(/""/g, '"');
      values.push(value);
    }
    
    if (values.length === headers.length) {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      records.push(record);
    } else {
      console.warn(`Skipping malformed CSV line ${i + 1}: Expected ${headers.length} fields, found ${values.length}. Line: "${line}"`);
    }
  }
  return records;
}
