import { format } from 'date-fns';

export interface ExportToCSVOptions {
  data: any[];
  filename: string;
  headers?: string[];
}

export function exportToCSV({ data, filename, headers }: ExportToCSVOptions): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const csvHeaders = headers || Object.keys(data[0]);
  
  const csvRows: string[] = [];
  csvRows.push(csvHeaders.join(','));

  data.forEach((row) => {
    const values = csvHeaders.map((header) => {
      const value = row[header];
      
      if (value === null || value === undefined) {
        return '';
      }
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      
      if (Array.isArray(value)) {
        return `"${value.join('; ').replace(/"/g, '""')}"`;
      }
      
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    
    csvRows.push(values.join(','));
  });

  const csvContent = csvRows.join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function getCurrentDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
