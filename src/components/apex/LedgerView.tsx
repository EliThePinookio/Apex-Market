import { ChevronRight, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Group } from "@/components/ui/group";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { exportLedgerCsv, exportMasterReport, printReceipt } from "@/lib/apex/export";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import { cn } from "@/lib/cn";
import type { Transaction, TransactionType } from "@/types";

export function LedgerView() {
  const { transactions, products, profile, summary, deleteTransaction } = useApex();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | TransactionType>("all");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const list = useMemo(() => {
    return transactions.filter((t) => {
      const matchQ =
        t.description.toLowerCase().includes(q.toLowerCase()) ||
        t.id.toLowerCase().includes(q.toLowerCase()) ||
        (t.customerName || "").toLowerCase().includes(q.toLowerCase());
      const matchT = type === "all" || t.type === type;
      return matchQ && matchT;
    });
  }, [transactions, q, type]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader
        title="Ledger"
        subtitle={`${list.length} records in view`}
        actions={
          <>
            <Button variant="secondary" onClick={() => exportLedgerCsv(transactions, profile.currencySymbol)}>
              Sales CSV
            </Button>
            <Button onClick={() => exportMasterReport(transactions, products, profile, summary)}>
              Master report
            </Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <SearchField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search description, customer, id"
          className="flex-1"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="field sm:w-44 bg-bg-elevated shadow-[var(--shadow-1)]"
        >
          <option value="all">All types</option>
          <option value="sale">Sales</option>
          <option value="expense">Expenses</option>
          <option value="capital">Capital</option>
          <option value="stock_refill">Refills</option>
        </select>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No ledger rows yet"
          body="Sales, expenses, capital and refills appear here after they are saved."
        />
      ) : list.length === 0 ? (
        <EmptyState icon={Receipt} title="No matching records" body="Try another type or a different search." />
      ) : (
        <>
          <div className="md:hidden">
            <Group>
              {list.map((t) => (
                <button key={t.id} type="button" className="group-row" onClick={() => setSelected(t)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium truncate">{t.description}</p>
                    <p className="text-[13px] text-fg-subtle">
                      {new Date(t.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {t.customerName ? ` · ${t.customerName}` : ""}
                    </p>
                  </div>
                  <span className="tabular text-[15px] font-medium">
                    {t.type === "expense" ? "-" : ""}
                    {money(t.amount, profile.currencySymbol)}
                  </span>
                  <ChevronRight className="size-4 text-fg-subtle" />
                </button>
              ))}
            </Group>
          </div>
          <div className="hidden md:block panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Detail</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                      <td className="text-fg-muted whitespace-nowrap">
                        {new Date(t.date).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "pill",
                            t.type === "sale" && "bg-success/10 text-success",
                            t.type === "expense" && "bg-danger/10 text-danger",
                            t.type === "capital" && "bg-info/10 text-info",
                            t.type === "stock_refill" && "bg-warning/10 text-warning",
                          )}
                        >
                          {t.type.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <p className="truncate max-w-[320px]">{t.description}</p>
                        <p className="text-[12px] text-fg-subtle">{t.customerName || t.category || ""}</p>
                      </td>
                      <td className="text-right tabular font-medium">
                        {t.type === "expense" ? "-" : ""}
                        {money(t.amount, profile.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.type.replace("_", " ") : ""}
      >
        {selected && (
          <div className="space-y-3">
            <p className="text-[15px] text-fg-muted">{selected.description}</p>
            <p className="text-[2.125rem] tabular font-semibold tracking-tight leading-none">
              {money(selected.amount, profile.currencySymbol)}
            </p>
            {selected.items && (
              <ul className="text-[15px] space-y-2 border-t border-border pt-3">
                {selected.items.map((i) => (
                  <li key={i.productId} className="flex justify-between">
                    <span>
                      {i.productName} × {i.quantity}
                    </span>
                    <span className="tabular">{money(i.totalSellPrice, profile.currencySymbol)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 pt-2">
              {selected.type === "sale" && (
                <Button variant="secondary" className="flex-1" onClick={() => printReceipt(selected, profile)}>
                  Receipt
                </Button>
              )}
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  if (!confirm("Delete this ledger row? Stock is not reversed.")) return;
                  try {
                    await deleteTransaction(selected.id);
                    toast("Transaction removed from ledger");
                    setSelected(null);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Delete failed");
                  }
                }}
              >
                Delete
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
