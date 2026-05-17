const SUPPORT_EMAIL = "support@drivadocs.com";

type EmailRow = {
  label: string;
  value: string | number | null | undefined;
};

type EmailSection = {
  title: string;
  rows: EmailRow[];
};

export function getEmailFrom() {
  return process.env.EMAIL_FROM || process.env.CONTACT_FROM_EMAIL || `DrivaDocs <${SUPPORT_EMAIL}>`;
}

export function getSupportEmail() {
  return SUPPORT_EMAIL;
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function createBrandedEmail({
  title,
  preview,
  greeting,
  intro,
  sections,
  cta,
  footerNote
}: {
  title: string;
  preview: string;
  greeting?: string;
  intro: string;
  sections: EmailSection[];
  cta?: { label: string; href: string };
  footerNote?: string;
}) {
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/images/drivadocs-logo.png`;
  const bodyText = [
    greeting,
    intro,
    ...sections.flatMap((section) => [
      "",
      section.title,
      ...section.rows
        .filter((row) => row.value !== null && row.value !== undefined && String(row.value).trim() !== "")
        .map((row) => `${row.label}: ${row.value}`)
    ]),
    cta ? ["", `${cta.label}: ${cta.href}`].join("\n") : null,
    "",
    footerNote || "Thank you for choosing DrivaDocs.",
    "DrivaDocs Support",
    SUPPORT_EMAIL
  ].filter(Boolean).join("\n");

  const htmlSections = sections.map((section) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border:1px solid #e0ebe6;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="background:#eefbf7;padding:12px 16px;font:700 13px Arial,sans-serif;color:#146555;text-transform:uppercase;">${escapeHtml(section.title)}</td>
      </tr>
      <tr>
        <td style="padding:6px 16px 14px;background:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${section.rows
              .filter((row) => row.value !== null && row.value !== undefined && String(row.value).trim() !== "")
              .map((row) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #edf4f1;font:700 12px Arial,sans-serif;color:#6b7a73;text-transform:uppercase;vertical-align:top;width:42%;">${escapeHtml(row.label)}</td>
                  <td style="padding:10px 0;border-bottom:1px solid #edf4f1;font:700 14px Arial,sans-serif;color:#17211d;vertical-align:top;">${escapeHtml(String(row.value))}</td>
                </tr>
              `).join("")}
          </table>
        </td>
      </tr>
    </table>
  `).join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f4faf7;padding:24px 12px;">
    <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preview)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #dfece7;border-radius:10px;overflow:hidden;">
            <tr>
              <td style="background:#17211d;padding:22px 24px;">
                <img src="${escapeHtml(logoUrl)}" width="150" alt="DrivaDocs" style="display:block;max-width:150px;height:auto;background:#ffffff;border-radius:6px;padding:6px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px 8px;">
                <h1 style="margin:0;font:800 26px Arial,sans-serif;color:#17211d;line-height:1.2;">${escapeHtml(title)}</h1>
                ${greeting ? `<p style="margin:18px 0 0;font:700 15px Arial,sans-serif;color:#17211d;">${escapeHtml(greeting)}</p>` : ""}
                <p style="margin:12px 0 0;font:400 15px Arial,sans-serif;color:#4f6259;line-height:1.7;">${escapeHtml(intro)}</p>
                ${htmlSections}
                ${cta ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#146555;color:#ffffff;text-decoration:none;border-radius:6px;padding:13px 18px;font:800 14px Arial,sans-serif;">${escapeHtml(cta.label)}</a></p>` : ""}
                <p style="margin:24px 0 0;font:400 14px Arial,sans-serif;color:#4f6259;line-height:1.7;">${escapeHtml(footerNote || "Thank you for choosing DrivaDocs.")}</p>
              </td>
            </tr>
            <tr>
              <td style="background:#eefbf7;padding:18px 24px;border-top:1px solid #dfece7;">
                <p style="margin:0;font:800 14px Arial,sans-serif;color:#146555;">DrivaDocs Support</p>
                <p style="margin:4px 0 0;font:400 13px Arial,sans-serif;color:#4f6259;">Vehicle documents, licensing, renewals, permits, and delivery support.</p>
                <p style="margin:8px 0 0;font:700 13px Arial,sans-serif;color:#17211d;">${SUPPORT_EMAIL}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text: bodyText };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
