'use server';

// The reference app generates this "AI Report" tab via a Genkit AI flow that
// Dental doesn't have wired up. Rather than leave the ported
// attendance-tracker.tsx unable to compile (it imports this module), this is
// a light placeholder with the same shape so the tab renders without
// crashing. Swap this out for a real AI flow later if the AI Report feature
// is wanted.
export type AttendanceReportOutput = {
  report: string;
};

export async function generateAttendanceReport(input: {
  employeeId: string;
  startDate: string;
  endDate: string;
}): Promise<AttendanceReportOutput> {
  return {
    report: `AI-generated attendance summaries aren't configured yet for ${input.startDate} to ${input.endDate}.`,
  };
}
