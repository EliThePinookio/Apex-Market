import { useNavigate, useSearch } from "@tanstack/react-router";
import { Check, Minus, Package, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/ui/category-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { printReceipt } from "@/lib/apex/export";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import { colorFor, coverFor } from "@/lib/beannel/catalog";
import { cn } from "@/lib/cn";
import type { PaymentMethod, Transaction, TransactionItem } from "@/types";

export function POSView() {
  const { products, categories, profile, customers, recordSale } = useApex();
  const search = useSearch({ strict: false }) as { sku?: string };
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<Record<string, TransactionItem>>({});
  const [checkout, setCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [pay, setPay] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [tendered, setTendered] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Transaction | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (search?.sku) {
      const p = products.find((x) => x.sku === search.sku);
      if (p) add(p);
      void navigate({ to: "/pos" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search?.sku]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(query.trim()));
      const matchC = cat === "All" || p.category === cat;
      return matchQ && matchC;
    });
  }, [products, query, cat]);

  const items = Object.values(cart);
  const subtotal = items.reduce((s, i) => s + i.totalSellPrice, 0);
  const total = Math.max(0, subtotal - discount);
  const change = Number(tendered) > 0 ? Number(tendered) - total : 0;

  function add(product: (typeof products)[number]) {
    const existing = cart[product.id];
    const qty = existing ? existing.quantity + 1 : 1;
    if (qty > product.stockQuantity && !profile.allowNegativeStock) {
      toast.error(`Only ${product.stockQuantity} ${product.unit} available`);
      return;
    }
    setCart({
      ...cart,
      [product.id]: {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitBuyPrice: product.buyPrice,
        unitSellPrice: product.sellPrice,
        totalSellPrice: product.sellPrice * qty,
        totalBuyPrice: product.buyPrice * qty,
      },
    });
  }

  function setQty(id: string, next: number) {
    const product = products.find((p) => p.id === id);
    if (next <= 0) {
      const copy = { ...cart };
      delete copy[id];
      setCart(copy);
      return;
    }
    if (product && next > product.stockQuantity && !profile.allowNegativeStock) {
      toast.error("Stock limit reached");
      return;
    }
    const existing = cart[id];
    if (!existing) return;
    setCart({
      ...cart,
      [id]: {
        ...existing,
        quantity: next,
        totalSellPrice: existing.unitSellPrice * next,
        totalBuyPrice: existing.unitBuyPrice * next,
      },
    });
  }

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const exact = products.find(
      (p) => p.barcode === query.trim() || p.sku.toLowerCase() === query.trim().toLowerCase(),
    );
    if (exact) {
      add(exact);
      setQuery("");
      return;
    }
    if (filtered[0]) add(filtered[0]);
  };

  const complete = async () => {
    if (items.length === 0 || busy) return;
    setBusy(true);
    try {
      const tx = await recordSale({
        items,
        customerName,
        paymentMethod: pay,
        discountAmount: discount,
        description: `Sale of ${items.reduce((s, i) => s + i.quantity, 0)} item(s)`,
      });
      setDone(tx);
      setCheckout(false);
      setCart({});
      toast.success(`Sale ${money(tx.amount, profile.currencySymbol)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete sale");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
        <SearchField
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Search name, SKU, or barcode"
        />
        <div className="tag-row tag-row-scroll no-scrollbar pb-1">
          <CategoryChip name="All" plain active={cat === "All"} onClick={() => setCat("All")} />
          {categories.map((c) => (
            <CategoryChip key={c.id} name={c.name} active={cat === c.name} onClick={() => setCat(c.name)} />
          ))}
        </div>
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products in this workspace"
            body="Add stock in Inventory, then come back to ring a sale."
            action={<Button onClick={() => void navigate({ to: "/inventory" })}>Add product</Button>}
          />
        ) : filtered.length === 0 ? (
          <p className="text-[15px] text-fg-muted py-10 text-center">No products match.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filtered.map((p) => {
              const out = p.stockQuantity <= 0;
              const inCart = cart[p.id]?.quantity || 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  disabled={out && !profile.allowNegativeStock}
                  style={{ ["--cat" as string]: colorFor(p.category) }}
                  className={cn(
                    "pressable cushion product-tile text-left p-4 pl-5 disabled:opacity-40 disabled:pointer-events-none min-h-[8rem] flex flex-col",
                    inCart > 0 && "ring-2 ring-accent/35",
                  )}
                >
                  <img src={coverFor(p.category)} alt="" className="product-thumb" />
                  <p className="text-[15px] font-medium line-clamp-2 leading-snug">{p.name}</p>
                  <p className="text-[12px] text-fg-subtle mt-1">{p.sku}</p>
                  <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                    <span className="tabular text-[15px] font-semibold">
                      {money(p.sellPrice, profile.currencySymbol)}
                    </span>
                    <span
                      className={cn(
                        "text-[12px] tabular font-medium",
                        inCart > 0
                          ? "text-accent"
                          : p.stockQuantity <= p.minStockThreshold
                            ? "text-warning"
                            : "text-fg-subtle",
                      )}
                    >
                      {inCart > 0 ? `${inCart} · ` : ""}
                      {p.stockQuantity} {p.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <aside className="shrink-0 max-h-[42%] lg:max-h-none lg:m-3 lg:ml-0 lg:rounded-[24px] border-t lg:border-0 cushion p-4 flex flex-col min-h-0">
        <h2 className="text-[15px] font-semibold tracking-tight mb-3">Ticket</h2>
        <div className="flex-1 space-y-3 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-[15px] text-fg-muted py-10 text-center">Scan or tap to add.</p>
          )}
          {items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] truncate font-medium">{item.productName}</p>
                <p className="text-[12px] text-fg-subtle tabular">
                  {money(item.unitSellPrice, profile.currencySymbol)}
                </p>
              </div>
              <div className="stepper">
                <button type="button" aria-label="Decrease" onClick={() => setQty(item.productId, item.quantity - 1)}>
                  <Minus className="size-3.5" />
                </button>
                <span>{item.quantity}</span>
                <button type="button" aria-label="Increase" onClick={() => setQty(item.productId, item.quantity + 1)}>
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-5 space-y-3">
          <div className="flex justify-between text-[15px]">
            <span className="text-fg-muted">Subtotal</span>
            <span className="tabular">{money(subtotal, profile.currencySymbol)}</span>
          </div>
          <div className="flex justify-between text-[1.375rem] font-semibold tracking-tight">
            <span>Total</span>
            <span className="tabular">{money(total, profile.currencySymbol)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={items.length === 0} onClick={() => setCart({})}>
              <Trash2 className="size-4" /> Clear
            </Button>
            <Button className="flex-1" disabled={items.length === 0} onClick={() => setCheckout(true)}>
              Charge
            </Button>
          </div>
        </div>
      </aside>

      <Sheet open={checkout} onClose={() => setCheckout(false)} title="Take payment">
        <div className="space-y-4">
          <Field label="Customer">
            <input
              list="custs"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in"
              className="field"
            />
            <datalist id="custs">
              {customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-1.5">
            {(["cash", "card", "mobile_money", "transfer"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPay(m)}
                className={cn(
                  "h-11 rounded-[14px] text-[13px] font-medium capitalize transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
                  pay === m ? "bg-accent text-accent-fg" : "bg-bg-subtle text-fg-muted",
                )}
              >
                {m.replace("_", " ")}
              </button>
            ))}
          </div>
          <Field label="Discount">
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="field"
            />
          </Field>
          {pay === "cash" && (
            <Field label="Cash tendered">
              <input
                type="number"
                min={0}
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                className="field"
              />
            </Field>
          )}
          <p className="flex justify-between items-baseline pt-1">
            <span className="text-[15px] text-fg-muted">Due</span>
            <span className="tabular text-[1.75rem] font-semibold tracking-tight">
              {money(total, profile.currencySymbol)}
            </span>
          </p>
          {pay === "cash" && Number(tendered) > 0 && (
            <p className="text-[15px] flex justify-between text-success">
              <span>Change</span>
              <span className="tabular font-medium">{money(Math.max(0, change), profile.currencySymbol)}</span>
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setCheckout(false)}>
              Back
            </Button>
            <Button className="flex-1" disabled={busy} onClick={() => void complete()}>
              Confirm
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={Boolean(done)} onClose={() => setDone(null)}>
        {done && (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto size-14 rounded-full bg-success/12 text-success grid place-items-center success-pop">
              <Check className="size-7" strokeWidth={2.4} />
            </div>
            <p className="display-title text-[1.375rem]">Sale recorded</p>
            <p className="text-[2.75rem] metric-value tracking-tight leading-none">
              {money(done.amount, profile.currencySymbol)}
            </p>
            <p className="text-[12px] text-fg-subtle">{done.id}</p>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => printReceipt(done, profile)}>
                Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setDone(null);
                  setCheckout(false);
                  setCustomerName("");
                  setDiscount(0);
                  setTendered("");
                  inputRef.current?.focus();
                }}
              >
                Next sale
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
