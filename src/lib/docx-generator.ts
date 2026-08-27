import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import type { Employee, EmployeeConfigSnapshot } from "./types";
import { format, parse } from "date-fns";

export type LanguageOption = "English" | "Marathi";

const formatShiftTime = (time: string) => {
  try {
      return format(parse(time, 'HH:mm', new Date()), 'p');
  } catch (e) {
      return time;
  }
};

/**
 * Helper to fetch a .docx template from the public folder and generate a populated document.
 */
export const generateDocument = async (
  employee: Employee,
  templateUrl: string,
  fileName: string,
  language: LanguageOption = "English",
  snapshot?: EmployeeConfigSnapshot
) => {
  try {
    const cacheBuster = `?v=${Date.now()}`;
    const response = await fetch(`${templateUrl}${cacheBuster}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch template from ${templateUrl}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const zip = new PizZip(arrayBuffer);

    // Initialize docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const joiningDateStr = employee.joiningDate
      ? format(new Date(employee.joiningDate), "MMM dd, yyyy")
      : "TBD";

    const workingHours = snapshot 
      ? snapshot.shiftSegments.map(s => `${formatShiftTime(s.startTime)} - ${formatShiftTime(s.endTime)}`).join(', ')
      : (employee.shift && employee.shift.length > 0 
          ? employee.shift.map(s => `${formatShiftTime(s.startTime)} - ${formatShiftTime(s.endTime)}`).join(', ')
          : "10:00 AM - 07:00 PM");

    const salary = snapshot 
      ? snapshot.baseSalary.toString()
      : (employee.baseSalary ? employee.baseSalary.toString() : "TBD");

    const dateStr = snapshot 
      ? format(new Date(snapshot.effectiveFrom), "MMM dd, yyyy")
      : format(new Date(), "MMM dd, yyyy");

    // Standard variables for all templates
    const data = {
      name: employee.name,
      address: employee.address || "Address not provided",
      role: employee.role,
      joiningDate: joiningDateStr,
      workingHours: workingHours,
      commitment: "1 Year", // Default or fetch from settings
      salary: salary,
      date: dateStr,
      organization: employee.organization || "Enhance Head Neck Rehabilitation",
    };

    doc.render(data);

    // Generate blob and trigger download
    const out = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(out, fileName);
  } catch (error) {
    console.error("Error generating document:", error);
    throw error;
  }
};

export const getOrgPrefix = (organization?: string) => {
  if (organization?.includes("Smileinn")) return "Smileinn";
  return "Enhance";
};

export const downloadAppointmentOrder = (
  employee: Employee,
  language: LanguageOption,
  snapshot?: EmployeeConfigSnapshot
) => {
  const orgPrefix = getOrgPrefix(employee.organization);
  const templateUrl =
    language === "English"
      ? `/templates/${orgPrefix}_Appointment_Order_English.docx`
      : `/templates/${orgPrefix}_Appointment_Order_Marathi.docx`;

  const suffix = snapshot ? `_${snapshot.effectiveFrom}` : '';
  const fileName = `Appointment_Order_${language}_${employee.name.replace(/\s+/g, "_")}${suffix}.docx`;

  return generateDocument(employee, templateUrl, fileName, language, snapshot);
};

export const downloadAcceptanceLetter = (employee: Employee) => {
  const orgPrefix = getOrgPrefix(employee.organization);
  const templateUrl = `/templates/${orgPrefix}_Acceptance_Letter.docx`;
  const fileName = `Acceptance_Letter_${employee.name.replace(
    /\s+/g,
    "_"
  )}.docx`;

  return generateDocument(employee, templateUrl, fileName, "English"); 
};

export const downloadIncrementLetter = (
  employee: Employee,
  snapshot: EmployeeConfigSnapshot
) => {
  const orgPrefix = getOrgPrefix(employee.organization);
  const templateUrl = `/templates/${orgPrefix}_Increment_Letter.docx`;
  const fileName = `Increment_Letter_${employee.name.replace(/\s+/g, "_")}_${snapshot.effectiveFrom}.docx`;

  return generateDocument(employee, templateUrl, fileName, "English", snapshot);
};
