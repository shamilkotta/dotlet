type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SendEmailResponse = {
  success: boolean;
  errors?: { code: number; message: string }[];
};

export async function sendTransactionalEmail(input: SendTransactionalEmailInput): Promise<void> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_EMAIL_API_TOKEN;
  const fromAddress = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME;

  if (!accountId || !apiToken || !fromAddress) {
    throw new Error(
      "Email Sending is not configured. Set CF_ACCOUNT_ID, CF_EMAIL_API_TOKEN, and EMAIL_FROM.",
    );
  }

  const from =
    fromName && fromName.length > 0 ? { address: fromAddress, name: fromName } : fromAddress;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: input.to,
      from,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  const body = (await response.json()) as SendEmailResponse;
  if (!response.ok || !body.success) {
    const detail = body.errors?.map((e) => e.message).join("; ") ?? response.statusText;
    throw new Error(`Email send failed: ${detail}`);
  }
}
