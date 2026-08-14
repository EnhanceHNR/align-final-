import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const isVideoUrl = (url: string) => {
  if (!url) return false;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

export function generateSequentialId(count: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const limit = 9999;
  const zeroBasedCount = Math.max(0, count - 1);
  const letterIndex = Math.floor(zeroBasedCount / limit);
  const letter = letters[letterIndex % letters.length];
  const number = (zeroBasedCount % limit) + 1;
  return `${letter}${number.toString().padStart(4, '0')}`;
}

export function exportToCsv<T>(data: T[], filename: string, columns: { key: keyof T, title: string }[]) {
  const header = columns.map(c => c.title).join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const value = String(row[col.key] ?? '');
      // Escape commas and quotes
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  ).join('\n');
  
  const csv = `${header}\n${rows}`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export async function exportToPdf<T>(data: T[], filename: string, columns: { key: keyof T, title: string }[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  
  const doc = new jsPDF();
  const tableHead = [columns.map(c => c.title)];
  const tableBody = data.map(row => columns.map(col => String(row[col.key] ?? '')));

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
  });

  doc.save(filename);
}
