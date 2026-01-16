/**
 * Get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Check if file is a supported data file type (CSV, Excel, PDF)
 */
export function isSupportedDataFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return ['csv', 'xlsx', 'xls', 'pdf'].includes(ext || '');
}

/**
 * Check if file is Excel format
 */
export function isExcelFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return ['xlsx', 'xls'].includes(ext || '');
}
