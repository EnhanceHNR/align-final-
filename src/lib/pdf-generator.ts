import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Ported from the reference app's src/lib/pdf-generator.ts. Only
// generateAttendancePDF is included here since that's the only export the
// ported employee-attendance-calendar.tsx component actually uses.
export function generateAttendancePDF(
  employee: any,
  exportData: Array<any>,
  fromDate: Date,
  toDate: Date
): void {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(employee.organization || 'Attendance Report', 105, 10, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Attendance Report', 105, 16, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Employee Name: ${employee.name}`, 14, 22);
  doc.text(`Role: ${employee.role || ''}`, 14, 26);
  doc.text(
    `Period: ${format(fromDate, 'MMM dd, yyyy')} to ${format(toDate, 'MMM dd, yyyy')}`,
    14,
    30
  );

  const remarksList: string[] = [];
  const multiPunchList: string[] = [];

  let payableDays = 0;
  let presentCount = 0;
  let absentCount = 0;
  let halfDays = 0;
  let doublePresent = 0;
  let weekOffCount = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let publicHolidayCount = 0;
  let totalOvertimeMinutes = 0;

  const tableData = exportData.map((row) => {
    if (row['Remarks'] && row['Remarks'] !== '-') {
      remarksList.push(`[${row['Date']}] ${row['Remarks']}`);
    }
    const isMulti = row['Multi Punch Info'] && row['Multi Punch Info'] !== '-';
    if (isMulti) {
      multiPunchList.push(`[${row['Date']}] ${row['Multi Punch Info']}`);
      doublePresent++;
    }

    const st = row['Status'];
    const lt = row['Leave Type'];

    if (st === 'Present' || st === 'Late' || st === 'Double Late') {
      presentCount++;
      payableDays++;
    } else if (st === 'Half Day') {
      halfDays++;
      payableDays += 0.5;
    } else if (st === 'Absent') {
      absentCount++;
    } else if (st === 'Week Off') {
      weekOffCount++;
      payableDays++;
    } else if (st === 'Public Holiday') {
      publicHolidayCount++;
      payableDays++;
    } else if (st === 'Leave') {
      if (lt === 'LWP' || lt === 'Leave Without Pay' || lt === 'Unpaid') {
        unpaidLeaves++;
      } else {
        paidLeaves++;
        payableDays++;
      }
    }

    if (row['Daily Total Hours'] !== '-') {
      const parts = String(row['Daily Total Hours']).split('h ');
      if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
        const h = parseInt(parts[0]);
        const m = parseInt(parts[1].replace('m', ''));
        const mins = h * 60 + m;
        const shiftMins = 9 * 60;
        if (mins > shiftMins) {
          totalOvertimeMinutes += (mins - shiftMins);
        }
      }
    }

    return [
      row['Date'],
      row['Day of Week'],
      row['Status'],
      row['Punch In Time'],
      row['Punch Out Time'],
      row['Daily Total Hours'],
    ];
  });

  autoTable(doc, {
    startY: 34,
    head: [['Date', 'Day', 'Status', 'In Time', 'Out Time', 'Total Hours']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], cellPadding: 1 },
    styles: { fontSize: 7, cellPadding: 1 },
    margin: { bottom: 10 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 5;

  if (finalY > 275) {
    doc.addPage();
    finalY = 15;
  }

  doc.setFontSize(10);
  doc.setFont(undefined as any, 'bold');
  doc.text('Attendance summary', 14, finalY);
  finalY += 3;

  const overtimeHoursStr = `${Math.floor(totalOvertimeMinutes / 60)}h ${totalOvertimeMinutes % 60}m`;

  autoTable(doc, {
    startY: finalY,
    head: [['Payable Days', 'Present', 'Absent', 'Half Days', 'Double Present', 'Week Off', 'Paid Leaves', 'Unpaid Leaves', 'Public Holiday', 'Overtime']],
    body: [[
      payableDays.toString(),
      presentCount.toString(),
      absentCount.toString(),
      halfDays.toString(),
      doublePresent.toString(),
      weekOffCount.toString(),
      paidLeaves.toString(),
      unpaidLeaves.toString(),
      publicHolidayCount.toString(),
      overtimeHoursStr,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [189, 195, 199], textColor: [0, 0, 0], fontStyle: 'bold', cellPadding: 1 },
    styles: { fontSize: 7, cellPadding: 1 },
    margin: { bottom: 10 },
  });

  finalY = (doc as any).lastAutoTable.finalY + 5;

  if (remarksList.length > 0 || multiPunchList.length > 0) {
    if (finalY > 275) {
      doc.addPage();
      finalY = 15;
    }

    doc.setFontSize(9);
    doc.setFont(undefined as any, 'bold');
    doc.text('Summary & Remarks', 14, finalY);
    finalY += 4;

    doc.setFontSize(7);
    doc.setFont(undefined as any, 'normal');

    if (multiPunchList.length > 0) {
      doc.setFont(undefined as any, 'bold');
      doc.text('Multiple Punches / Double Sessions:', 14, finalY);
      finalY += 4;
      doc.setFont(undefined as any, 'normal');
      multiPunchList.forEach((mp) => {
        if (finalY > 285) {
          doc.addPage();
          finalY = 15;
        }
        doc.text(`• ${mp}`, 18, finalY);
        finalY += 3;
      });
      finalY += 1;
    }

    if (remarksList.length > 0) {
      doc.setFont(undefined as any, 'bold');
      doc.text('Remarks:', 14, finalY);
      finalY += 4;
      doc.setFont(undefined as any, 'normal');
      remarksList.forEach((rm) => {
        if (finalY > 285) {
          doc.addPage();
          finalY = 15;
        }
        doc.text(`• ${rm}`, 18, finalY);
        finalY += 3;
      });
    }
  }

  doc.save(`Attendance_${String(employee.name).replace(/\s+/g, '_')}_${format(fromDate, 'MMM_yyyy')}.pdf`);
}
