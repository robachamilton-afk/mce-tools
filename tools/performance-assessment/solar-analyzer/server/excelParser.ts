import * as XLSX from 'xlsx';

/**
 * Parse Excel file and convert to CSV-like format
 * Returns array of rows (each row is an array of values)
 */
export async function parseExcelFile(fileBuffer: Buffer): Promise<string[][]> {
  try {
    // Read the workbook from buffer
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheets found in Excel file');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert sheet to array of arrays
    const data: string[][] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,  // Return array of arrays instead of objects
      raw: false, // Convert all values to strings
      defval: ''  // Default value for empty cells
    });
    
    return data;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Excel file and convert to CSV string
 */
export async function excelToCSV(fileBuffer: Buffer): Promise<string> {
  const data = await parseExcelFile(fileBuffer);
  
  // Convert array of arrays to CSV string
  return data.map(row => 
    row.map(cell => {
      // Escape cells that contain commas, quotes, or newlines
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

/**
 * Get headers from Excel file (first row)
 */
export async function getExcelHeaders(fileBuffer: Buffer): Promise<string[]> {
  const data = await parseExcelFile(fileBuffer);
  
  if (data.length === 0) {
    throw new Error('Excel file is empty');
  }
  
  return data[0];
}
