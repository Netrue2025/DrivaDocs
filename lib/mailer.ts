import nodemailer from "nodemailer";

type MailInput = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

type MailDelivery =
  | { sent: true; provider: "resend" | "smtp" }
  | { sent: false; reason: string };

export async function sendMail(input: MailInput): Promise<MailDelivery> {
  const resendApiKey = env("RESEND_API_KEY");
  if (resendApiKey) {
    return sendWithResend(input, resendApiKey);
  }

  const smtpConfig = getSmtpConfig();
  if (smtpConfig) {
    return sendWithSmtp(input, smtpConfig);
  }

  return { sent: false, reason: "No email provider is configured. Set RESEND_API_KEY or SMTP_HOST, SMTP_USER, and SMTP_PASSWORD." };
}

async function sendWithResend(input: MailInput, apiKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      reply_to: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Unable to send email through Resend: ${response.status} ${body}`);
  }

  return { sent: true as const, provider: "resend" as const };
}

async function sendWithSmtp(input: MailInput, config: SmtpConfig) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: {
      user: config.username,
      pass: config.password
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      servername: config.host
    }
  });

  await transporter.sendMail({
    from: input.from,
    to: input.to,
    replyTo: input.replyTo,
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  transporter.close();
  return { sent: true as const, provider: "smtp" as const };
}

type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = env("SMTP_HOST");
  const username = env("SMTP_USER") || env("SMTP_USERNAME");
  const password = env("SMTP_PASSWORD") || env("SMTP_PASS");
  if (!host || !username || !password) return null;

  const port = Number(env("SMTP_PORT") || 587);
  const secure = parseBoolean(env("SMTP_SECURE")) ?? port === 465;

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    username,
    password,
    secure
  };
}

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function parseBoolean(value: string) {
  if (!value) return null;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  return null;
}
