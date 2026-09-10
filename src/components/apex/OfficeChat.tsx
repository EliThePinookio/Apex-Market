import { Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { askApexAdvisor, type ChatTurn } from "@/lib/apex/advisor";
import { buildTrustedContext } from "@/lib/apex/ai-context";
import { previousPeriod, computeSummary } from "@/lib/apex/summary";
import { useApex } from "@/lib/apex/store";
import { readOpenRouterKey } from "@/lib/beannel/keys";
import { cn } from "@/lib/cn";
import { tick } from "@/lib/feel";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { useSheetPresence } from "@/components/ui/sheet";

const MEMORY_KEY = "beannel_office_chat";
const SUGGESTIONS = [
  "What should I restock?",
  "Where is cash sitting still?",
  "Which pieces are in the wrong room?",
];

type Bubble = { role: "user" | "assistant"; text: string };

function loadMemory(): Bubble[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Bubble[];
    return Array.isArray(parsed) ? parsed.slice(-24) : [];
  } catch {
    return [];
  }
}

function saveMemory(rows: Bubble[]) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(rows.slice(-24)));
  } catch {
    /* ignore */
  }
}

export function OfficeChat({
  locked,
  onUnlock,
}: {
  locked?: boolean;
  onUnlock?: () => void;
}) {
  const {
    products,
    transactions,
    customers,
    profile,
    period,
    periodSummary,
    periodTransactions,
    pendingShopCount,
  } = useApex();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [memoryReady, setMemoryReady] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const { present, shown, onPanelTransitionEnd } = useSheetPresence(open);

  const prevBounds = previousPeriod(period);
  const prevSummary = useMemo(() => {
    if (!prevBounds) return null;
    const prevTx = transactions.filter((t) => {
      const time = new Date(t.date).getTime();
      return time >= prevBounds.start.getTime() && time < prevBounds.end.getTime();
    });
    return computeSummary(prevTx, products);
  }, [transactions, products, prevBounds]);

  useEffect(() => {
    setMessages(loadMemory());
    setMemoryReady(true);
  }, []);

  useEffect(() => {
    if (!memoryReady) return;
    saveMemory(messages);
  }, [messages, memoryReady]);

  useEffect(() => {
    if (!open) return;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [open, messages, busy]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    if (locked) {
      onUnlock?.();
      return;
    }
    const next = [...messages, { role: "user" as const, text: prompt }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    tick("light");
    try {
      const ctx = buildTrustedContext({
        businessName: profile.businessName || "BEANNEL",
        currency: profile.currencySymbol || "GH₵",
        periodLabel: period === "today" ? "Today" : period === "week" ? "7 days" : period === "month" ? "This month" : "All time",
        summary: periodSummary,
        products,
        transactions: periodTransactions,
        customers,
        prevSummary,
        pendingOrders: pendingShopCount,
      });
      const history: ChatTurn[] = next.slice(-12).map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const res = await askApexAdvisor({
        data: {
          prompt,
          context: ctx,
          mode: "office_chat",
          openrouterKey: readOpenRouterKey(),
          history: history.slice(0, -1),
        },
      });
      const reply = res.text || "I could not read the books just now.";
      setMessages([...next, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages([
        ...next,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "I could not reach the books.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={cn("office-chat-fab", open && "is-open")}
        aria-label={open ? "Close Beannel" : "Ask Beannel"}
        onClick={() => {
          if (locked) {
            onUnlock?.();
            return;
          }
          setOpen((v) => !v);
        }}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </button>

      {present && (
        <section
          className={cn("office-chat-panel", shown && "is-open")}
          role="dialog"
          aria-label="Ask Beannel"
          onTransitionEnd={onPanelTransitionEnd}
        >
          <header className="office-chat-head">
            <div>
              <p>Ask Beannel</p>
              <span>Reads your live stock, sales, and trends</span>
            </div>
            <button
              type="button"
              className="office-chat-clear"
              onClick={() => {
                tick("light");
                setMessages([]);
              }}
            >
              Clear
            </button>
          </header>
          <div className="office-chat-log" ref={scroller}>
            {messages.length === 0 && (
              <div className="office-chat-empty">
                <p>Ask in plain language. I answer from this store’s books, not the internet.</p>
                <div className="office-chat-suggest">
                  {SUGGESTIONS.map((q) => (
                    <button key={q} type="button" onClick={() => void send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={cn("office-chat-bubble", m.role === "user" ? "is-user" : "is-bot")}>
                {m.text}
              </div>
            ))}
            {busy && <div className="office-chat-bubble is-bot is-wait">Reading the books…</div>}
          </div>
          <LiquidGlass
            as="form"
            className="office-chat-composer"
            strength="secondary"
            onSubmit={(e: { preventDefault: () => void }) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about sales, stock, profit…"
              aria-label="Message Beannel"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !draft.trim()}>
              Send
            </button>
          </LiquidGlass>
        </section>
      )}
    </>
  );
}
