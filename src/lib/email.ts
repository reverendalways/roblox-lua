import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY not set');
    resendClient = new Resend(key);
  }
  return resendClient;
}

export interface SendEmailOptions { to: string; subject: string; text?: string; html?: string; }

export async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const emailOptions: any = { from, to, subject };
  if (html) emailOptions.html = html;
  else if (text) emailOptions.text = text;
  await getResend().emails.send(emailOptions);
}
