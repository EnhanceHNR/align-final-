
"use client";

import { Submission } from "./types";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export function downloadAsCSV(submissions: Submission[]) {
  const data = submissions.map(sub => ({
    ID: sub.id,
    Type: sub.type,
    "Submission Date": format(sub.createdAt, "yyyy-MM-dd HH:mm:ss"),
    "Patient Name": sub.patientName,
    "Lab Name": sub.labName,
    "Item": sub.item,
    "Sender Name": sub.senderName || "N/A",
    "Receiver Name": sub.receiverName || "N/A",
    "Delivery Person": sub.deliveryPerson || "N/A",
    "Appointment Status": sub.appointmentStatus,
    "Appointment Date": sub.appointmentDate ? format(sub.appointmentDate, "yyyy-MM-dd") : "N/A",
    "Photo URL": sub.photoUrl,
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `labtrack-records-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadAsPDF(submissions: Submission[]) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("LabTrack Mobile - Records", 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Report generated on: ${format(new Date(), "PPpp")}`, 14, 28);
  
  const tableData = await Promise.all(submissions.map(async sub => {
    return [
      sub.type,
      sub.patientName,
      sub.labName,
      sub.item,
      format(sub.createdAt, "PP"),
      sub.appointmentStatus === "Appointment given" ? format(sub.appointmentDate!, "PP") : "N/A",
    ];
  }));

  autoTable(doc, {
    startY: 35,
    head: [["Type", "Patient", "Lab", "Item", "Submitted", "Appointment"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [59, 42, 56] }, // #3B2A38 approx
  });

  doc.addPage();
  doc.setFontSize(18);
  doc.text("Submission Details & Photos", 14, 22);
  let y = 30;

  for (const sub of submissions) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(`Record ID: ${sub.id}`, 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Patient: ${sub.patientName} | Item: ${sub.item}`, 14, y);
    y += 10;
    
    try {
        const response = await fetch(sub.photoUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
            reader.onload = () => {
                const dataUrl = reader.result as string;
                try {
                    doc.addImage(dataUrl, 'JPEG', 14, y, 80, 80);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        y += 90;

    } catch (e) {
      console.error("Error adding image to PDF:", e);
      doc.text("Image could not be loaded.", 14, y);
      y += 10;
    }
  }

  doc.save(`labtrack-records-${new Date().toISOString().split('T')[0]}.pdf`);
}
