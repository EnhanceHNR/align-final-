
/*
'use server';

/**
 * @fileOverview Sends email notifications summarizing new lab submissions, using AI to highlight key information.
 *
 * - emailNotificationWithGenAI - A function that sends the email notification.
 * - EmailNotificationWithGenAIInput - The input type for the emailNotificationWithGenAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { sendEmail } from '@/services/email-service';

const EmailNotificationWithGenAIInputSchema = z.object({
  senderName: z.string().optional(),
  senderPhoto: z.string().optional(),
  sendingItem: z.string().optional(),
  deliveryPerson: z.string().optional(),
  receivingLabPerson: z.string().optional(),
  patientName: z.string().optional(),
  appointmentStatus: z.enum(['Appointment given', 'Appointment not given']).optional(),
  submissionType: z.enum(['send', 'receive']), // Match lowercase from actions
  receiverName: z.string().optional(),
  receivedItem: z.string().optional(),
  appointmentDate: z.string().optional(),
});

export type EmailNotificationWithGenAIInput = z.infer<typeof EmailNotificationWithGenAIInputSchema>;

const SummarySchema = z.object({
  summary: z.string().describe('A concise summary of the lab submission, highlighting key details and potential issues.')
});

async function summarizeSubmission(input: EmailNotificationWithGenAIInput): Promise<string> {
  const { output } = await summarizePrompt(input);
  return output!.summary;
}

const summarizePrompt = ai.definePrompt({
  name: 'summarizePrompt',
  input: { schema: EmailNotificationWithGenAIInputSchema },
  output: { schema: SummarySchema },
  prompt: `You are a professional administrative assistant for a high-end dental lab. 
  Your goal is to provide a clear, concise summary of a new lab submission for quick review.
  
  Focus on:
  - Who sent/received the item.
  - What the item is and for which patient.
  - The appointment status and date if applicable.
  
  Keep the tone professional and the length under 250 characters.

  SUBMISSION DETAILS:
  Type: {{submissionType}}
  Sender: {{senderName}}
  Receiver: {{receiverName}}
  Patient: {{patientName}}
  Item: {{sendingItem}}{{receivedItem}}
  Delivery via: {{deliveryPerson}}
  Lab/Person: {{receivingLabPerson}}
  Appointment: {{appointmentStatus}} ({{appointmentDate}})
  
  SUMMARY:`, 
});

export async function emailNotificationWithGenAI(input: EmailNotificationWithGenAIInput): Promise<void> {
  await emailNotificationFlow(input);
}

const emailNotificationFlow = ai.defineFlow(
  {
    name: 'emailNotificationFlow',
    inputSchema: EmailNotificationWithGenAIInputSchema,
  },
  async input => {
    const summary = await summarizeSubmission(input);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@labtrack.com';
    const submissionLabel = input.submissionType.charAt(0).toUpperCase() + input.submissionType.slice(1);
    
    const emailSubject = `[LabTrack] New ${submissionLabel} Submission: ${input.patientName}`;
    const emailBody = `
Dear Admin,

A new lab submission has been recorded via the LabTrack Mobile app.

QUICK SUMMARY:
${summary}

FULL DETAILS:
- Type: ${submissionLabel}
- Patient: ${input.patientName}
- Item: ${input.sendingItem || input.receivedItem}
- Lab/Recipient: ${input.receivingLabPerson}
- Status: ${input.appointmentStatus}
- Appointment Date: ${input.appointmentDate || 'N/A'}
- Delivery: ${input.deliveryPerson || 'N/A'}

You can view the full record and attachments in the LabTrack Admin Dashboard.

Best regards,
LabTrack Automations
    `.trim();

    await sendEmail({
      to: adminEmail,
      subject: emailSubject,
      body: emailBody,
    });
  }
);
*/

