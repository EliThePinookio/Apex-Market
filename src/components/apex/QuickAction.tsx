import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { NumericInput, toNumber, type NumericValue } from "@/components/ui/numeric-field";
import { Sheet } from "@/components/ui/sheet";
import { useApex } from "@/lib/apex/store";
import { money } from "@/lib/apex/money";
import type { PaymentMethod } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "sale" | "expense" | "capital" | "refill";

export function QuickAction({ open, onClose }: Props) {
  const { products, profile, recordSale, recordExpense, recordCapital, recordStockRefill } =
    useApex();
  const [mode, setMode] = useState<Mode>("sale");
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState<NumericValue>(1);
  const [pay, setPay] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState<NumericValue>("");
  const [category, setCategory] = useState("Rent & Space");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState<NumericValue>("");

  const prod = products.find((p) => p.id === productId) || products[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "sale") {
        if (!prod) return;
        if (toNumber(qty, 1) > prod.stockQuantity && !profile.allowNegativeStock) {
          toast.error(`Only ${prod.stockQuantity} ${prod.unit} in stock`);
          return;
        }
        await recordSale({
          items: [
            {
              productId: prod.id,
              productName: prod.name,
              quantity: toNumber(qty, 1),
              unitBuyPrice: prod.buyPrice,
              unitSellPrice: prod.sellPrice,
              totalSellPrice: prod.sellPrice * toNumber(qty, 1),
              totalBuyPrice: prod.buyPrice * toNumber(qty, 1),
            },
          ],
          paymentMethod: pay,
        });
        toast.success(`Sale recorded · ${money(prod.sellPrice * toNumber(qty, 1), profile.currencySymbol)}`);
      } else if (mode === "expense") {
        if (amount === "") {
          toast.error("Enter an amount");
          return;
        }
        await recordExpense({
          amount: toNumber(amount),
          category,
          description: desc || category,
          paymentMethod: pay,
        });
        toast.success("Expense recorded");
      } else if (mode === "capital") {
        if (amount === "") {
          toast.error("Enter an amount");
          return;
        }
        await recordCapital({
          amount: toNumber(amount),
          description: desc || "Capital injection",
          paymentMethod: "transfer",
        });
        toast.success("Capital recorded");
      } else if (prod) {
        await recordStockRefill({
          productId: prod.id,
          quantityToAdd: toNumber(qty, 1),
          costPerUnit: toNumber(cost, prod.buyPrice),
        });
        toast.success("Stock refilled");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Quick entry" subtitle="Sale, expense, capital or refill.">
      <form onSubmit={submit} className="space-y-4">
        <div className="tag-row">
          {(["sale", "expense", "capital", "refill"] as Mode[]).map((m) => (
            <button key={m} type="button" className="tag-chip capitalize" data-active={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>

        {(mode === "sale" || mode === "refill") && (
          <>
            <Field label="Product">
              <select value={prod?.id || ""} onChange={(e) => setProductId(e.target.value)} className="field">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.stockQuantity} {p.unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantity">
              <NumericInput value={qty} onChange={setQty} min={1} />
            </Field>
          </>
        )}

        {mode === "sale" && (
          <Field label="Payment">
            <select value={pay} onChange={(e) => setPay(e.target.value as PaymentMethod)} className="field">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile money</option>
              <option value="transfer">Transfer</option>
            </select>
          </Field>
        )}

        {(mode === "expense" || mode === "capital") && (
          <>
            <Field label="Amount">
              <NumericInput value={amount} onChange={setAmount} min={0} step="0.01" />
            </Field>
            {mode === "expense" && (
              <Field label="Category">
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="field" />
              </Field>
            )}
            <Field label="Note">
              <input value={desc} onChange={(e) => setDesc(e.target.value)} className="field" />
            </Field>
          </>
        )}

        {mode === "refill" && (
          <Field label="Cost per unit">
            <NumericInput value={cost} onChange={setCost} min={0} step="0.01" placeholder={prod ? String(prod.buyPrice) : ""} />
          </Field>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={busy}>
            Record
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
