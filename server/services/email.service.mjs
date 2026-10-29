import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT || 587);
const mailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendVerificationCode(email, code, purpose) {
  if (!mailer) {
    throw Object.assign(new Error("Email delivery is not configured. Add SMTP settings to .env."), { status: 503 });
  }
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: purpose === "signup" ? "Verify your Folio email" : "Your Folio sign-in code",
    text: `Your Folio verification code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;color:#252a27"><p style="color:#718c35;font-weight:bold;letter-spacing:2px;text-transform:uppercase;font-size:12px">Folio security</p><h1 style="font-size:24px">Your verification code</h1><p>Use this one-time code to ${purpose === "signup" ? "verify your email" : "sign in"}.</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f4f2ee;padding:18px;border-radius:12px;text-align:center">${code}</p><p style="color:#777">This code expires in 10 minutes. If you did not request it, ignore this email.</p></div>`,
  });
}
