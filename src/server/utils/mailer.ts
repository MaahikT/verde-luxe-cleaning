import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("⚠️  SMTP not configured. Email will NOT be sent.");
    console.log("----------------------------------------");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("--- Body ---");
    console.log(html);
    console.log("----------------------------------------");
    return { success: false, message: "SMTP not configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Admin Portal" <no-reply@example.com>',
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ""), // simple strip tags
      html,
    });

    console.log("✅ Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};
