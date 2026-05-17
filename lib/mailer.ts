import net from "node:net";
import tls from "node:tls";

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
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(input);
  }

  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return sendWithSmtp(input);
  }

  return { sent: false, reason: "No email provider is configured" };
}

async function sendWithResend(input: MailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
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

async function sendWithSmtp(input: MailInput) {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const username = process.env.SMTP_USER!;
  const password = process.env.SMTP_PASSWORD!;
  const secure = port === 465;
  let socket: net.Socket | tls.TLSSocket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  socket.setEncoding("utf8");
  socket.setTimeout(30000);

  let buffer = "";
  const readResponse = () =>
    new Promise<string>((resolve, reject) => {
      function cleanup() {
        socket.off("data", onData);
        socket.off("error", onError);
        socket.off("timeout", onTimeout);
      }
      function onError(error: Error) {
        cleanup();
        reject(error);
      }
      function onTimeout() {
        cleanup();
        reject(new Error("SMTP connection timed out"));
      }
      function onData(chunk: string) {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        const lastLine = lines[lines.length - 1] || "";
        if (/^\d{3} /.test(lastLine)) {
          const response = buffer;
          buffer = "";
          cleanup();
          resolve(response);
        }
      }
      socket.on("data", onData);
      socket.on("error", onError);
      socket.on("timeout", onTimeout);
    });

  const command = async (line: string, expectedCodes: number[]) => {
    socket.write(`${line}\r\n`);
    const response = await readResponse();
    const code = Number(response.slice(0, 3));
    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP command failed (${line}): ${response.trim()}`);
    }
    return response;
  };

  const connected = new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("error", reject);
  });

  await connected;
  await expectResponse(await readResponse(), [220]);
  await command(`EHLO ${smtpDomain()}`, [250]);

  if (!secure) {
    await command("STARTTLS", [220]);
    await new Promise<void>((resolve, reject) => {
      const secureSocket = tls.connect({ socket, servername: host }, () => {
        secureSocket.setEncoding("utf8");
        secureSocket.setTimeout(30000);
        socket = secureSocket;
        resolve();
      });
      secureSocket.once("error", reject);
    });
    await command(`EHLO ${smtpDomain()}`, [250]);
  }

  await command("AUTH LOGIN", [334]);
  await command(Buffer.from(username).toString("base64"), [334]);
  await command(Buffer.from(password).toString("base64"), [235]);
  await command(`MAIL FROM:<${emailAddress(input.from)}>`, [250]);
  await command(`RCPT TO:<${emailAddress(input.to)}>`, [250, 251]);
  await command("DATA", [354]);

  socket.write(`${buildMimeMessage(input)}\r\n.\r\n`);
  await expectResponse(await readResponse(), [250]);
  await command("QUIT", [221]).catch(() => undefined);
  socket.end();

  return { sent: true as const, provider: "smtp" as const };
}

async function expectResponse(response: string, expectedCodes: number[]) {
  const code = Number(response.slice(0, 3));
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP response failed: ${response.trim()}`);
  }
}

function buildMimeMessage(input: MailInput) {
  const boundary = `drivadocs-${Date.now().toString(36)}`;
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    input.replyTo ? `Reply-To: ${input.replyTo}` : null,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);

  return [
    ...headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    dotStuff(input.html),
    `--${boundary}--`
  ].join("\r\n");
}

function emailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] || value).trim();
}

function encodeHeader(value: string) {
  return /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`
    : value;
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function smtpDomain() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://drivadocs.com").hostname;
  } catch {
    return "drivadocs.com";
  }
}
