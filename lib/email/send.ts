/**
 * Minimal transactional email sender using the Resend HTTP API directly
 * (no SDK dependency). Two hard rules:
 *   1. NEVER throw — a notification failure must never break the user
 *      action that triggered it (upload, approval, rating).
 *   2. No key configured → log and skip, so local/dev environments work
 *      without email credentials.
 *
 * Env:
 *   RESEND_API_KEY — from resend.com (server-only)
 *   EMAIL_FROM     — verified sender, e.g. "Mon Beau Miroir <hello@yourdomain>"
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(`[email skipped — RESEND_API_KEY/EMAIL_FROM not set] "${subject}" → ${to}`);
    return;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!response.ok) {
      console.error("Email send failed", response.status, await response.text());
    }
  } catch (error) {
    console.error("Email send failed", error);
  }
}
