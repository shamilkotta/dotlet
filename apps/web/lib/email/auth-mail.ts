import { sendTransactionalEmail } from ".";
import { waitUntil } from "@vercel/functions";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function queueAuthEmail(send: () => Promise<void>): void {
  waitUntil(
    send().catch((err: unknown) => {
      console.error("[auth] transactional email failed:", err);
    }),
  );
}

type EmailShellParams = {
  previewText: string;
  greetingName: string;
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  fallbackLead: string;
  footer: string;
};

function renderAuthEmailHtml(params: EmailShellParams): string {
  const greetingName = escapeHtml(params.greetingName);
  const heading = escapeHtml(params.heading);
  const intro = escapeHtml(params.intro);
  const ctaLabel = escapeHtml(params.ctaLabel);
  const ctaUrl = escapeHtml(params.ctaUrl);
  const fallbackLead = escapeHtml(params.fallbackLead);
  const footer = escapeHtml(params.footer);
  const previewText = escapeHtml(params.previewText);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${heading}</title>
    <style>
      /* Reset */
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      body { margin: 0 !important; padding: 0 !important; width: 100% !important; }

      /* Design tokens (light) */
      .bg-page { background-color: #fafafa; }
      .bg-card { background-color: #ffffff; }
      .border-subtle { border-color: #ececec; }
      .text-fg { color: #0a0a0a; }
      .text-muted { color: #737373; }
      .btn-primary { background-color: #0a0a0a; color: #ffffff !important; }
      .code-block { background-color: #f5f5f5; color: #0a0a0a; border-color: #ececec; }
      .divider { border-top: 1px solid #ececec; }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .bg-page { background-color: #0a0a0a !important; }
        .bg-card { background-color: #141414 !important; }
        .border-subtle { border-color: #262626 !important; }
        .text-fg { color: #fafafa !important; }
        .text-muted { color: #a3a3a3 !important; }
        .btn-primary { background-color: #fafafa !important; color: #0a0a0a !important; }
        .code-block { background-color: #1a1a1a !important; color: #fafafa !important; border-color: #262626 !important; }
        .divider { border-top-color: #262626 !important; }
      }

      /* Mobile */
      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .px-responsive { padding-left: 24px !important; padding-right: 24px !important; }
        .heading-responsive { font-size: 22px !important; line-height: 28px !important; }
      }
    </style>
  </head>
  <body class="bg-page" style="margin:0; padding:0; background-color:#fafafa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:transparent; opacity:0;">
      ${previewText}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background-color:#fafafa;">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" class="container" style="width:560px; max-width:100%;">
            <tr>
              <td align="center" style="padding: 0 0 24px 0;">
                <span class="text-fg" style="font-size:22px; font-weight:700; letter-spacing:-0.01em; color:#0a0a0a;">dotlet</span>
              </td>
            </tr>
            <tr>
              <td class="bg-card border-subtle px-responsive" style="background-color:#ffffff; border:1px solid #ececec; border-radius:12px; padding: 40px;">
                <h1 class="text-fg heading-responsive" style="margin:0 0 10px 0; font-size:26px; line-height:32px; font-weight:700; letter-spacing:-0.015em; color:#0a0a0a;">
                  ${heading}
                </h1>
                <p class="text-muted" style="margin:0 0 28px 0; font-size:15px; line-height:24px; color:#737373;">
                  Hi ${greetingName}, ${intro}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                  <tr>
                    <td align="center" class="btn-primary" style="border-radius:10px; background-color:#0a0a0a;">
                      <a href="${ctaUrl}" class="btn-primary" style="display:inline-block; padding:13px 24px; font-size:15px; font-weight:600; line-height:20px; color:#ffffff; text-decoration:none; border-radius:10px;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                <p class="text-muted" style="margin:0 0 10px 0; font-size:13px; line-height:20px; color:#737373;">
                  ${fallbackLead}
                </p>
                <div class="code-block" style="background-color:#f5f5f5; border:1px solid #ececec; border-radius:8px; padding:12px 14px; font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace; font-size:12px; line-height:18px; color:#0a0a0a; word-break:break-all;">
                  <a href="${ctaUrl}" style="color:inherit; text-decoration:none;">${ctaUrl}</a>
                </div>
                <div class="divider" style="margin:28px 0 0 0; border-top:1px solid #ececec;"></div>
                <p class="text-muted" style="margin:20px 0 0 0; font-size:13px; line-height:20px; color:#737373;">
                  ${footer}
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 24px 16px 0 16px;">
                <p class="text-muted" style="margin:0; font-size:12px; line-height:18px; color:#737373;">
                  Sent by dotlet · This is an automated message, please do not reply.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderAuthEmailText(params: {
  heading: string;
  greetingName: string;
  intro: string;
  ctaUrl: string;
  footer: string;
}): string {
  return `${params.heading}

Hi ${params.greetingName}, ${params.intro}

${params.ctaUrl}

${params.footer}

— dotlet`;
}

export function sendVerificationEmailMessage(params: {
  to: string;
  displayName: string;
  verifyUrl: string;
}): void {
  const subject = "Verify your email for dotlet";
  const heading = "Verify your email";
  const intro =
    "confirm this is you by clicking the button below. The link is valid for a limited time.";
  const fallbackLead = "Button not working? Copy and paste this URL into your browser:";
  const footer = "If you did not create a dotlet account, you can safely ignore this email.";

  const html = renderAuthEmailHtml({
    previewText: "Verify your email to finish setting up your dotlet account.",
    greetingName: params.displayName,
    heading,
    intro,
    ctaLabel: "Verify email",
    ctaUrl: params.verifyUrl,
    fallbackLead,
    footer,
  });

  const text = renderAuthEmailText({
    heading,
    greetingName: params.displayName,
    intro,
    ctaUrl: params.verifyUrl,
    footer,
  });

  queueAuthEmail(() =>
    sendTransactionalEmail({
      to: params.to,
      subject,
      text,
      html,
    }),
  );
}

export function sendPasswordResetEmailMessage(params: {
  to: string;
  displayName: string;
  resetUrl: string;
}): void {
  const subject = "Reset your dotlet password";
  const heading = "Reset your password";
  const intro =
    "we received a request to reset your password. Click the button below to choose a new one.";
  const fallbackLead = "Button not working? Copy and paste this URL into your browser:";
  const footer =
    "If you did not request a password reset, you can safely ignore this email — your password will not change.";

  const html = renderAuthEmailHtml({
    previewText: "Reset your dotlet password.",
    greetingName: params.displayName,
    heading,
    intro,
    ctaLabel: "Reset password",
    ctaUrl: params.resetUrl,
    fallbackLead,
    footer,
  });

  const text = renderAuthEmailText({
    heading,
    greetingName: params.displayName,
    intro,
    ctaUrl: params.resetUrl,
    footer,
  });

  queueAuthEmail(() =>
    sendTransactionalEmail({
      to: params.to,
      subject,
      text,
      html,
    }),
  );
}
