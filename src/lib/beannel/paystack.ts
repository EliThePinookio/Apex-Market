import { createServerFn } from "@tanstack/react-start";

function usableKey(value: string | undefined | null): string | null {
  const trimmed = (value || "").trim();
  if (trimmed.length < 12) return null;
  if (!trimmed.startsWith("sk_")) return null;
  return trimmed;
}

function secretFrom(input?: string): string | null {
  return usableKey(process.env.PAYSTACK_SECRET_KEY) || usableKey(input);
}

export const startPaystackCheckout = createServerFn({ method: "POST" })
  .validator(
    (input: {
      email: string;
      amount: number;
      callbackUrl: string;
      secretKey?: string;
      metadata?: Record<string, string>;
    }) => input,
  )
  .handler(async ({ data }) => {
    const secret = secretFrom(data.secretKey);
    if (!secret) {
      return { ok: false as const, error: "Paystack is not connected yet. Use cash on delivery, or add the Paystack secret in Settings." };
    }
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false as const, error: "A sign-in email is required for Paystack." };
    const pesewas = Math.round(data.amount * 100);
    if (pesewas < 100) return { ok: false as const, error: "Amount is too small to charge." };

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: pesewas,
        currency: "GHS",
        channels: ["mobile_money", "card"],
        callback_url: data.callbackUrl,
        metadata: data.metadata || {},
      }),
    });
    const body = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };
    if (!res.ok || !body.status || !body.data?.authorization_url) {
      return { ok: false as const, error: body.message || "Paystack could not start the charge." };
    }
    return {
      ok: true as const,
      url: body.data.authorization_url,
      reference: body.data.reference || "",
    };
  });

export const verifyPaystackCheckout = createServerFn({ method: "POST" })
  .validator((input: { reference: string; secretKey?: string }) => input)
  .handler(async ({ data }) => {
    const secret = secretFrom(data.secretKey);
    if (!secret) return { ok: false as const, error: "Paystack is not connected." };
    const reference = data.reference.trim();
    if (!reference) return { ok: false as const, error: "Missing Paystack reference." };

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { status?: string; amount?: number; reference?: string };
    };
    if (!res.ok || !body.status) {
      return { ok: false as const, error: body.message || "Could not confirm Paystack payment." };
    }
    if (body.data?.status !== "success") {
      return { ok: false as const, error: "Payment was not completed." };
    }
    return {
      ok: true as const,
      reference: body.data.reference || reference,
      amount: (body.data.amount || 0) / 100,
    };
  });
