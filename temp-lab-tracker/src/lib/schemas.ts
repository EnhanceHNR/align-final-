
import { z } from 'zod';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const baseSchema = z.object({
  deliveryPersonPhoto: z
    .any()
    .optional()
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max image size is 50MB.`)
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),
  item: z.string().min(1, "Item name is required."),
  subType: z.string().optional(),
  deliveryPerson: z.string().optional(),
  labName: z.string().min(1, "Lab/person name is required."),
  patientName: z.string().min(1, "Patient name is required."),
  appointmentStatus: z.enum(['Appointment given', 'Appointment not given']).optional(),
  servicePrice: z.string().optional(),
  tat: z.string().optional(),
  linkedRecordId: z.string().optional(),
  approvalStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  senderEmail: z.string().optional(),
  remarks: z.string().optional(),
});

export const sendSchema = baseSchema.extend({
  type: z.literal('send'),
  senderName: z.string().min(1, "Sender name is required."),
  senderSelfie: z
    .any()
    .refine((file) => !!file, "Sender selfie is required.")
    .refine((file) => !file || file.size <= MAX_FILE_SIZE, `Max image size is 50MB.`)
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),
  productPhotos: z.array(z.any()).min(1, "At least one product photo is required."),
  appointmentDate: z.preprocess((arg) => {
    if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
  }, z.date().optional()),
});

export const sendSchemaClient = sendSchema.extend({
    appointmentDate: z.date().optional()
});

export const receiveSchema = baseSchema.extend({
  type: z.literal('receive'),
  photo: z.array(z.any()).min(1, "At least one verification photo is required."),
  receiverSelfie: z.any().refine((file) => !!file, "Receiver selfie is required."),
  receiverName: z.string().min(1, "Receiver name is required."),
  documents: z.array(z.object({
    type: z.enum(['Challan', 'Bill']),
    amount: z.string().optional(),
    photo: z.any().optional(),
  })).optional(),
  appointmentDate: z.preprocess((arg) => {
    if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
  }, z.date().optional()),
});

// This is a client-side version of the schema for conditional logic.
export const receiveSchemaClient = receiveSchema.extend({
    appointmentDate: z.date().optional()
});
