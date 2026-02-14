import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export interface SendEmailOptions { to: string; subject: string; text?: string; html?: string; }

export async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const emailOptions: any = { from, to, subject };
  if (html) emailOptions.html = html;
  else if (text) emailOptions.text = text;
  await resend.emails.send(emailOptions);
}
