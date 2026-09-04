import { createServerFn } from "@tanstack/react-start";

export type TrustedBusinessContext = {
  businessName: string;
  currency: string;
  periodLabel: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  capital: number;
  inventoryValue: number;
  lowStock: Array<{ name: string; stock: number; min: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number; profit: number }>;
  slowProducts: Array<{ name: string; stock: number; trapped: number }>;
  expenseCategories: Array<{ name: string; amount: number }>;
  txCount: number;
};

function usableKey(value: string | undefined | null): string | null {
  const trimmed = (value || "").trim();
  if (trimmed.length < 8) return null;
  if (trimmed === "MY_OPENROUTER_API_KEY") return null;
  return trimmed;
}

function trustedBlock(c: TrustedBusinessContext): string {
  return `
TRUSTED LEDGER FIGURES — these numbers are the source of truth. Never invent, round-up, or replace them.
Business: ${c.businessName}
Period: ${c.periodLabel}
Revenue: ${c.currency}${c.revenue.toFixed(2)}
COGS: ${c.currency}${c.cogs.toFixed(2)}
Gross profit: ${c.currency}${c.grossProfit.toFixed(2)}
Operating expenses: ${c.currency}${c.expenses.toFixed(2)}
Net profit: ${c.currency}${c.netProfit.toFixed(2)}
Capital injected: ${c.currency}${c.capital.toFixed(2)}
Inventory at cost: ${c.currency}${c.inventoryValue.toFixed(2)}
Transactions: ${c.txCount}
Low stock: ${c.lowStock.map((p) => `${p.name} (${p.stock}/${p.min})`).join("; ") || "none"}
Top products by profit: ${c.topProducts.map((p) => `${p.name} qty ${p.qty} rev ${c.currency}${p.revenue.toFixed(2)} profit ${c.currency}${p.profit.toFixed(2)}`).join("; ") || "none"}
Slow stock (unsold with qty > 0): ${c.slowProducts.map((p) => `${p.name} qty ${p.stock} trapped ${c.currency}${p.trapped.toFixed(2)}`).join("; ") || "none"}
Expense mix: ${c.expenseCategories.map((e) => `${e.name} ${c.currency}${e.amount.toFixed(2)}`).join("; ") || "none"}
`.trim();
}

const SYSTEM = `You are Beannel, a concise business operations advisor for a shop owner.
Rules:
- Use only the trusted ledger figures provided. Never fabricate a financial number.
- If a figure is missing, say you do not have it.
- Write in plain language. Structure: WHAT, WHY, IMPLICATION, POSSIBLE ACTION.
- Keep answers under 220 words unless the user asks for more.
- Do not claim access to bank accounts, tax filings, or data not listed.`;

async function chatOpenRouter(apiKey: string, userContent: string): Promise<string | null> {
  const models = [
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-small-24b-instruct-2501",
    "qwen/qwen-2.5-72b-instruct",
    "deepseek/deepseek-chat",
  ];
  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://beannel.app",
          "X-Title": "BEANNEL",
        },
        body: JSON.stringify({
          model,
          max_tokens: 700,
          temperature: 0.4,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = body.choices?.[0]?.message?.content?.trim() || "";
      if (text) return text;
    } catch {
      continue;
    }
  }
  return null;
}

async function chatXai(apiKey: string, userContent: string): Promise<string | null> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      max_tokens: 700,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return body.choices?.[0]?.message?.content?.trim() || null;
}

export const askApexAdvisor = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; context: TrustedBusinessContext; mode?: string; openrouterKey?: string }) => input)
  .handler(async ({ data }) => {
    const userContent = `${trustedBlock(data.context)}\n\nMode: ${data.mode || "general"}\nQuestion: ${data.prompt.slice(0, 2000)}`;
    const openrouter = usableKey(process.env.OPENROUTER_API_KEY) || usableKey(data.openrouterKey);
    const xai = usableKey(process.env.XAI_API_KEY);

    if (openrouter) {
      const text = await chatOpenRouter(openrouter, userContent);
      if (text) return { ok: true as const, text };
    }
    if (xai) {
      const text = await chatXai(xai, userContent);
      if (text) return { ok: true as const, text };
    }
    if (!openrouter && !xai) {
      return {
        ok: false as const,
        error: "Advisor needs an OpenRouter key in Settings, or a server AI key.",
      };
    }
    return { ok: false as const, error: "Advisor request failed." };
  });
