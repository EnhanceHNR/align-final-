
type Email = {
  to: string;
  subject: string;
  body: string;
};

export async function sendEmail(email: Email): Promise<void> {
  // In a real application, this would use an email sending service
  // like SendGrid, Nodemailer, or AWS SES.
  // For this example, we'll just log it to the console.
  console.log('--- Sending Email ---');
  console.log(`To: ${email.to}`);
  console.log(`Subject: ${email.subject}`);
  console.log('--- Body ---');
  console.log(email.body);
  console.log('--- End Email ---');
  
  return Promise.resolve();
}
