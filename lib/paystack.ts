export async function initializePaystackPayment(input: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return {
      authorizationUrl: `/dashboard/requests?reference=${input.reference}`,
      accessCode: "local-dev",
      reference: input.reference
    };
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountNaira * 100,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata
    })
  });

  if (!response.ok) {
    throw new Error("Paystack initialization failed");
  }

  const body = await response.json();
  return {
    authorizationUrl: body.data.authorization_url as string,
    accessCode: body.data.access_code as string,
    reference: body.data.reference as string
  };
}

export async function verifyPaystackPayment(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return null;

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${secret}`
    },
    cache: "no-store"
  });

  if (!response.ok) return null;

  const body = await response.json();
  return body.data as { status?: string; reference?: string; [key: string]: unknown };
}
