import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

export async function sendMagicLink(to: string, link: string) {
    const brand = 'LedgerSnap';
    await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: `Your ${brand} login link`,
        text: `${brand} sign-in link:\n\n${link}\n\nThis link expires soon. If you did not request this, you can ignore this email.`,
        html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
            <div style="padding:20px 24px;background:#2563eb;color:#fff">
              <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em">${brand}</div>
              <div style="font-size:12px;opacity:0.9;margin-top:4px">Secure login link</div>
            </div>
            <div style="padding:24px;color:#0f172a">
              <p style="margin:0 0 16px;font-size:14px">Use the button below to sign in.</p>
              <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px">Sign in to ${brand}</a>
              <p style="margin:16px 0 0;font-size:12px;color:#64748b">If the button doesn't work, paste this link into your browser:</p>
              <p style="margin:8px 0 0;font-size:12px;color:#2563eb;word-break:break-all">${link}</p>
            </div>
            <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:11px">
              This link expires soon. If you did not request this, you can ignore this email.
            </div>
          </div>
        </div>
        `,
    });
}
