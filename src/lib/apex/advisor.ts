import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/beannel/guard";

export type ChatTurn = { role: "user" | "assistant"; content: string };

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
  aov?: number;
  orders?: number;
  units?: number;
  margin?: number;
  debt?: number;
  pendingOrders?: number;
  salesDelta?: number | null;
  netDelta?: number | null;
  headline?: string;
  subhead?: string;
  trend?: string;
  actions?: Array<{ title: string; why: string; impact: number }>;
};

function usableKey(value: string | undefined | null): string | null {
  const trimmed = (value || "").trim();
  if (trimmed.length < 8) return null;
  if (trimmed === "MY_OPENROUTER_API_KEY") return null;
  return trimmed;
}

export function trustedBlock(c: TrustedBusinessContext): string {
  const cur = c.currency;
  const delta = (v?: number | null) => (typeof v === "number" ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}% vs prior` : "n/a");
  return `
TRUSTED LEDGER — source of truth. Never invent or replace these numbers.
Business: ${c.businessName}
Period: ${c.periodLabel}
Revenue: ${cur}${c.revenue.toFixed(2)} (${delta(c.salesDelta)})
Orders: ${c.orders ?? "n/a"} · Units: ${c.units ?? "n/a"} · AOV: ${cur}${(c.aov ?? 0).toFixed(2)}
COGS: ${cur}${c.cogs.toFixed(2)}
Gross profit: ${cur}${c.grossProfit.toFixed(2)} · margin ${(c.margin ?? 0).toFixed(1)}%
Operating expenses: ${cur}${c.expenses.toFixed(2)}
Net profit: ${cur}${c.netProfit.toFixed(2)} (${delta(c.netDelta)})
Capital injected: ${cur}${c.capital.toFixed(2)}
Inventory at cost: ${cur}${c.inventoryValue.toFixed(2)}
Unpaid customer balances: ${cur}${(c.debt ?? 0).toFixed(2)}
Pending shop orders: ${c.pendingOrders ?? 0}
Transactions: ${c.txCount}
Trend: ${c.trend || "n/a"}
Headline: ${c.headline || "n/a"}
${c.subhead || ""}
Low stock: ${c.lowStock.map((p) => `${p.name} (${p.stock}/${p.min})`).join("; ") || "none"}
Top products by profit: ${c.topProducts.map((p) => `${p.name} qty ${p.qty} rev ${cur}${p.revenue.toFixed(2)} profit ${cur}${p.profit.toFixed(2)}`).join("; ") || "none"}
Slow stock: ${c.slowProducts.map((p) => `${p.name} qty ${p.stock} trapped ${cur}${p.trapped.toFixed(2)}`).join("; ") || "none"}
Expense mix: ${c.expenseCategories.map((e) => `${e.name} ${cur}${e.amount.toFixed(2)}`).join("; ") || "none"}
Money moves: ${c.actions?.map((a) => `${a.title} — ${a.why} (~${cur}${a.impact.toFixed(0)})`).join("; ") || "none"}
`.trim();
}

const SYSTEM = `You are Beannel, the in-store financial partner for this shop owner.
You sit inside the office and read the live ledger, stock, orders, customers, and trends on every turn.
Rules:
- Use only the trusted ledger block and this chat memory. Never invent a financial number.
- If a figure is missing, say you do not have it.
- Remember what the owner already asked in this thread and stay consistent with it.
- Answer like a conversation: short, direct, then one next move.
- Tie every recommendation to a number from the ledger (restock, idle cash, unpaid balances, margin).
- Do not mention APIs, models, OpenRouter, or that you are an AI unless asked.`;

type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

function packMessages(context: TrustedBusinessContext, prompt: string, history: ChatTurn[]): LlmMessage[] {
  const prior = history.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `${trustedBlock(context)}\n\nTreat the block above as the live books for every reply in this thread.`,
    },
    {
      role: "assistant",
      content: "I have the live books. I will only use those figures and this conversation.",
    },
    ...prior,
    { role: "user", content: prompt.slice(0, 2000) },
  ];
}

async function withTimeout<T>(promise: Promise<T | null>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function chatOpenRouter(apiKey: string, messages: LlmMessage[]): Promise<string | null> {
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
          temperature: 0.35,
          messages,
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

async function chatXai(apiKey: string, messages: LlmMessage[]): Promise<string | null> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 700,
        temperature: 0.35,
        messages,
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return body.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export function localAdvisorReply(prompt: string, c: TrustedBusinessContext): string {
  const cur = c.currency;
  const q = prompt.toLowerCase();
  const top = c.topProducts[0];
  const action = c.actions?.[0];
  const lines: string[] = [];

  if (/restock|stock|sold out|inventory/.test(q) && c.lowStock.length) {
    lines.push(
      `WHAT: ${c.lowStock
        .slice(0, 3)
        .map((p) => `${p.name} (${p.stock} left, min ${p.min})`)
        .join("; ")}.`,
    );
    lines.push("WHY: Velocity is eating cover. A dark winner is lost sales.");
  } else if (/profit|margin|money|cash|make/.test(q)) {
    lines.push(
      `WHAT: Net profit is ${cur}${c.netProfit.toFixed(2)} on ${cur}${c.revenue.toFixed(2)} sales this ${c.periodLabel.toLowerCase()}. Gross margin ${(c.margin ?? 0).toFixed(1)}%.`,
    );
    if (c.netDelta != null)
      lines.push(`WHY: That is ${c.netDelta >= 0 ? "up" : "down"} ${Math.abs(c.netDelta).toFixed(1)}% versus the last window.`);
  } else if (/idle|slow|dead|sitting/.test(q) && c.slowProducts.length) {
    lines.push(
      `WHAT: Idle stock is tying cash — ${c.slowProducts
        .slice(0, 3)
        .map((p) => `${p.name} ${cur}${p.trapped.toFixed(0)}`)
        .join("; ")}.`,
    );
    lines.push("WHY: Those pieces took no money this period.");
  } else if (/debt|unpaid|collect/.test(q) && (c.debt || 0) > 0) {
    lines.push(`WHAT: ${cur}${(c.debt || 0).toFixed(2)} is still unpaid.`);
    lines.push("WHY: Sales already happened. The cash has not come in.");
  } else {
    lines.push(`WHAT: ${c.headline || `Sales ${cur}${c.revenue.toFixed(2)} this ${c.periodLabel.toLowerCase()}.`}`);
    lines.push(`WHY: ${c.subhead || (top ? `${top.name} is leading profit.` : "The books only show recorded sales.")}`);
  }

  if (action) {
    lines.push(`IMPLICATION: ${action.title}. ${action.why}`);
    lines.push(
      `POSSIBLE ACTION: Do that next${action.impact > 0 ? ` — about ${cur}${action.impact.toFixed(0)} on the line` : ""}.`,
    );
  } else {
    lines.push("IMPLICATION: No leak is louder than ringing the next real sale.");
    lines.push("POSSIBLE ACTION: Keep winners in stock and log every ticket.");
  }
  return lines.join("\n");
}

export const askApexAdvisor = createServerFn({ method: "POST" })
  .validator(
    (input: {
      prompt: string;
      context: TrustedBusinessContext;
      mode?: string;
      openrouterKey?: string;
      history?: ChatTurn[];
    }) => input,
  )
  .handler(async ({ data }) => {
    const history = Array.isArray(data.history) ? data.history : [];
    if (!rateLimit(`advisor:${data.mode || "chat"}`, 20, 10 * 60_000, 60_000)) {
      return {
        ok: true as const,
        text: "Slow down a moment. Ask again in a minute.",
        source: "ledger" as const,
      };
    }
    const prompt = data.prompt.slice(0, 2000);
    const messages = packMessages(data.context, prompt, history);
    const openrouter = usableKey(process.env.OPENROUTER_API_KEY) || usableKey(data.openrouterKey);
    const xai = usableKey(process.env.XAI_API_KEY);

    if (openrouter) {
      const text = await withTimeout(chatOpenRouter(openrouter, messages), 9000);
      if (text) return { ok: true as const, text, source: "openrouter" as const };
    }
    if (xai) {
      const text = await withTimeout(chatXai(xai, messages), 9000);
      if (text) return { ok: true as const, text, source: "xai" as const };
    }
    return {
      ok: true as const,
      text: localAdvisorReply(data.prompt, data.context),
      source: "ledger" as const,
    };
  });
