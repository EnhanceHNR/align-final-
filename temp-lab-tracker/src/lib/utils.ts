import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isVideoUrl(url: string) {
  if (!url) return false;
  // If it's a data URL, check the mime type
  if (url.startsWith('data:')) {
    return url.startsWith('data:video/');
  }
  // If it's a Firebase URL, check the path before query parameters
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return pathname.endsWith('.mp4') || pathname.endsWith('.mov') || pathname.endsWith('.webm') || pathname.endsWith('.avi');
  } catch (e) {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm') || lowerUrl.includes('.avi');
  }
}
