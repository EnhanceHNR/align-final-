import { z } from "zod";

export const patientSchema = z.object({
    fullName: z
        .string()
        .min(2, "Full Name must have at least 2 letters")
        .regex(
            /^[A-Za-zČĆŽŠĐčćžšđ\s]+$/,
            "Full Name can only contain letters"
        ),

    email: z
        .string()
        .email("Enter a valid email address")
        .optional()
        .or(z.literal("")),

    phone: z
        .string()
        .trim()
        .regex(
            /^\+[1-9]\d{8,14}$/,
            "Enter a valid phone number")
        .optional()
        .or(z.literal("")),

    sex: z.enum(["M", "F"]).optional(),
    // PRISMA -> jmb
    jmb: z
        .string()
        .min(3, "Patient ID is required"),

    occupation: z.string().optional(),

    // PRISMA -> employmentStatus
    employmentStatus: z.string().optional(),

    address: z.string().optional(),
    notes:   z.string().optional(),

    dateOfBirth: z
        .string()
        .min(8, "Please complete the Date of birth"),

    // ANAMNESIS
    allergiesFlag: z.boolean(),
    allergiesDetails: z.string().optional(),
    anesthesiaHistoryFlag: z.boolean(),
    anesthesiaComplications: z.string().optional(),
    medicationsFlag: z.boolean(),
    medicationsDetails: z.string().optional(),
    previousDiseases: z.string().optional(),
    currentDisease: z.string().optional(),

})
    .refine(
        (data) => !(data.allergiesFlag && !data.allergiesDetails?.trim()),
        { path: ["allergiesDetails"], message: "Enter allergy details" }
    )
    .refine(
        (data) => !(data.medicationsFlag && !data.medicationsDetails?.trim()),
        { path: ["medicationsDetails"], message: "Enter the medications you use" }
    );

export type PatientFormData = z.infer<typeof patientSchema>;