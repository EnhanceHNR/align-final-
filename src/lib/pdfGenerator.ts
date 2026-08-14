import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { Submission } from '@/lib/types';
import { isVideoUrl } from '@/lib/utils';

// Helper to convert an image URL to a base64 string using Canvas to ensure JPEG format
const fetchImageAsBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve) => {
        // Proxy external images through our own API route to completely bypass browser CORS limitations
        const proxyUrl = url.startsWith('http') 
            ? `/api/proxy-image?url=${encodeURIComponent(url)}` 
            : url;
            
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                // Fill with white background in case of transparent PNGs
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                // Export as JPEG (jsPDF supports JPEG well, and it avoids WebP issues)
                try {
                    const dataURL = canvas.toDataURL('image/jpeg', 0.85);
                    resolve(dataURL);
                } catch (e) {
                    console.error("Canvas export error:", e);
                    resolve("");
                }
            } else {
                resolve("");
            }
        };
        
        img.onerror = (e) => {
            console.error("Error loading image for PDF via proxy:", proxyUrl, e);
            resolve("");
        };
        
        img.src = proxyUrl;
    });
};

export const exportTrailPDF = async (trail: Submission[], exportType: 'internal' | 'external' = 'internal') => {
  const doc = new jsPDF();
  
  for (let tIndex = 0; tIndex < trail.length; tIndex++) {
      const sub = trail[tIndex];
      if (tIndex > 0) doc.addPage();
      
      let currentY = 20;
      
      // Title
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175); // blue-800
      doc.text(`Submission Record (${sub.type.toUpperCase()})`, 14, currentY);
      currentY += 10;
      
      // Date and ID
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, currentY);
      currentY += 5;
      doc.text(`Record Date: ${format(new Date(sub.createdAt), 'PPPP p')}`, 14, currentY);
      currentY += 12;

      // --- Transaction Info ---
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Transaction Information", 14, currentY);
      currentY += 6;
      
      doc.setFontSize(11);
      const infoLeft = [
        `Patient: ${sub.patientName || 'N/A'}`,
        `Item: ${sub.item || 'N/A'}`,
        `Lab: ${sub.labName || 'N/A'}`,
      ];
      const infoRight = [
        `Performed By: ${sub.type === 'send' ? sub.senderName : sub.receiverName}`,
        `Logistics: ${sub.deliveryPerson || 'N/A'}`,
        `Status: ${sub.appointmentStatus || 'Pending'}`,
      ];

      infoLeft.forEach((text, i) => {
        doc.text(text, 14, currentY + (i * 6));
      });
      infoRight.forEach((text, i) => {
        doc.text(text, 110, currentY + (i * 6));
      });
      currentY += 20;

      // Remarks
      if (sub.remarks) {
        doc.setFontSize(12);
        doc.text("Remarks & Notes", 14, currentY);
        currentY += 5;
        doc.setFontSize(10);
        const splitRemarks = doc.splitTextToSize(sub.remarks, 180);
        doc.text(splitRemarks, 14, currentY);
        currentY += splitRemarks.length * 5 + 8;
      }

      // --- Gather All Images ---
      type LabeledImage = { url: string; label: string };
      const allImages: LabeledImage[] = [];
      
      if (exportType === 'internal') {
          const primaryPhotoUrl = sub.senderSelfieUrl || sub.photoUrl;
          if (primaryPhotoUrl) {
              allImages.push({ url: primaryPhotoUrl, label: sub.type === 'send' ? "Sender Selfie" : "Verification" });
          }
          
          if (sub.deliveryPersonPhotoUrl) {
              allImages.push({ url: sub.deliveryPersonPhotoUrl, label: "Delivery" });
          }
      }

      if (sub.linkedReceiveRecord) {
          if (sub.photoUrls && sub.photoUrls.length > 0) {
              sub.photoUrls.forEach((u, i) => allImages.push({ url: u, label: `Sent Item ${i+1}` }));
          }
          if (sub.linkedReceiveRecord.photoUrls && sub.linkedReceiveRecord.photoUrls.length > 0) {
              sub.linkedReceiveRecord.photoUrls.forEach((u, i) => allImages.push({ url: u, label: `Received Item ${i+1}` }));
          }
      } else {
          if (sub.photoUrls && sub.photoUrls.length > 0) {
              sub.photoUrls.forEach((u, i) => allImages.push({ url: u, label: `Case Gallery ${i+1}` }));
          }
      }

      if (sub.billPhotoUrl) allImages.push({ url: sub.billPhotoUrl, label: "Bill" });
      if (sub.paymentProofUrl) allImages.push({ url: sub.paymentProofUrl, label: "Payment Proof" });

      // --- Render Image Grid ---
      if (allImages.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(0);
          doc.text("Visual Records", 14, currentY);
          currentY += 8;

          // Calculate sizes to fit on one page
          const cols = 4;
          const marginX = 14;
          const spacingX = 5;
          const spacingY = 10;
          const imgWidth = 41; 
          const imgHeight = 41;
          
          let xOffset = marginX;
          
          for (let i = 0; i < allImages.length; i++) {
              const { url, label } = allImages[i];
              
              if (i > 0 && i % cols === 0) {
                  xOffset = marginX;
                  currentY += imgHeight + spacingY;
              }

              if (currentY + imgHeight + 5 > 285) {
                  doc.addPage();
                  currentY = 20;
              }

              doc.setFontSize(8);
              doc.setTextColor(100);
              doc.text(label, xOffset, currentY);
              
              if (isVideoUrl(url)) {
                  doc.setFillColor(240, 240, 240);
                  doc.rect(xOffset, currentY + 2, imgWidth, imgHeight, 'F');
                  doc.setDrawColor(200);
                  doc.rect(xOffset, currentY + 2, imgWidth, imgHeight, 'S');
                  
                  doc.setTextColor(100);
                  doc.setFontSize(10);
                  doc.text("VIDEO", xOffset + imgWidth/2, currentY + imgHeight/2, { align: 'center' });
                  
                  doc.setFontSize(7);
                  doc.setTextColor(150);
                  doc.text("(View online)", xOffset + imgWidth/2, currentY + imgHeight/2 + 5, { align: 'center' });
              } else {
                  const base64 = await fetchImageAsBase64(url);
                  if (base64) {
                      try {
                          doc.addImage(base64, 'JPEG', xOffset, currentY + 2, imgWidth, imgHeight);
                      } catch (e) {
                          console.error("Error adding image to PDF:", e);
                          doc.text("Failed to load", xOffset, currentY + 15);
                      }
                  } else {
                      doc.setDrawColor(200);
                      doc.rect(xOffset, currentY + 2, imgWidth, imgHeight);
                      doc.text("No Image", xOffset + 12, currentY + 22);
                  }
              }
              xOffset += imgWidth + spacingX;
          }
      }
  }

  // Save the PDF
  const firstSub = trail[0];
  doc.save(`record_${firstSub?.patientName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'export'}.pdf`);
};
