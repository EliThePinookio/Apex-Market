import { ChevronRight, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/ui/category-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Group } from "@/components/ui/group";
import { NumericInput, toNumber, type NumericValue } from "@/components/ui/numeric-field";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { exportInventoryCsv } from "@/lib/apex/export";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import { isGeneratedSku, nextSku, prefixFor, colorFor, coverFor } from "@/lib/beannel/catalog";
import { compressImage, FASHION_SIZES, GARMENT_TYPES } from "@/lib/beannel/shop-meta";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

type ProductDraft = Partial<Omit<Product, "buyPrice" | "sellPrice" | "stockQuantity" | "minStockThreshold">> & {
  buyPrice?: NumericValue;
  sellPrice?: NumericValue;
  stockQuantity?: NumericValue;
  minStockThreshold?: NumericValue;
  sizes?: string[];
};

export function InventoryView() {
  const { products, categories, profile, saveProduct, deleteProduct, recordStockRefill } = useApex();
  const search = useSearch({ strict: false }) as { cat?: string };
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(search?.cat || "All");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [refill, setRefill] = useState<Product | null>(null);
  const [refillQty, setRefillQty] = useState<NumericValue>(10);
  const [refillCost, setRefillCost] = useState<NumericValue>("");

  useEffect(() => {
    if (search?.cat) setCat(search.cat);
  }, [search?.cat]);

  const list = useMemo(() => {
    return products.filter((p) => {
      const match =
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.sku.toLowerCase().includes(q.toLowerCase());
      if (!match) return false;
      if (cat !== "All" && p.category !== cat) return false;
      if (filter === "low") return p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold;
      if (filter === "out") return p.stockQuantity <= 0;
      return true;
    });
  }, [products, q, filter, cat]);

  const value = products.reduce((s, p) => s + p.buyPrice * p.stockQuantity, 0);

  const startNew = () => {
    const category = cat !== "All" ? cat : categories[0]?.name || "Apparels";
    setEditing({
      name: "",
      sku: nextSku(category, products),
      category,
      buyPrice: "",
      sellPrice: "",
      stockQuantity: "",
      minStockThreshold: "",
      unit: "pcs",
      listed: true,
      sizes: [],
      size: "",
      garmentType: "",
      imageUrl: "",
    });
  };

  const setCategory = (name: string) => {
    if (!editing) return;
    const others = products.filter((p) => p.id !== editing.id);
    const keepSku = editing.sku && !isGeneratedSku(editing.sku, editing.category || "");
    setEditing({
      ...editing,
      category: name,
      sku: keepSku ? editing.sku : nextSku(name, others),
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} SKUs · ${money(value, profile.currencySymbol)} at cost`}
        actions={
          <>
            <Button variant="secondary" onClick={() => exportInventoryCsv(products, profile.currencySymbol)}>
              Export
            </Button>
            <Button onClick={startNew}>Add product</Button>
          </>
        }
      />

      <div className="tag-row tag-row-scroll no-scrollbar">
        <CategoryChip
          name="All"
          plain
          active={cat === "All"}
          onClick={() => {
            setCat("All");
            void navigate({ to: "/inventory", search: {} });
          }}
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            name={c.name}
            active={cat === c.name}
            onClick={() => {
              setCat(c.name);
              void navigate({ to: "/inventory", search: { cat: c.name } });
            }}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <SearchField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stock"
          className="flex-1"
        />
        <div className="tag-row">
          {(["all", "low", "out"] as const).map((f) => (
            <button key={f} type="button" data-active={filter === f} onClick={() => setFilter(f)} className="tag-chip capitalize">
              {f}
            </button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Your inventory is empty"
          body="Add your first product to start tracking stock, cost, and sell price."
          action={<Button onClick={startNew}>Add product</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState icon={Package} title="No products in this filter" body="Try another filter or a different search." />
      ) : (
        <>
          <div className="md:hidden">
            <Group>
              {list.map((p) => {
                const low = p.stockQuantity <= p.minStockThreshold;
                return (
                  <button key={p.id} type="button" className="group-row" onClick={() => setEditing(p)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium truncate">{p.name}</p>
                      <p className="text-[13px] text-fg-subtle flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full shrink-0" style={{ background: colorFor(p.category) }} />
                        {p.sku}
                        {p.size ? ` · ${p.size}` : ""} · {p.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("tabular text-[15px] font-medium", low && "text-warning")}>
                        {p.stockQuantity} {p.unit}
                      </p>
                      <p className="text-[12px] text-fg-subtle tabular">
                        {money(p.sellPrice, profile.currencySymbol)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-fg-subtle" />
                  </button>
                );
              })}
            </Group>
          </div>
          <div className="hidden md:block panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Stock</th>
                    <th>Cost / Sell</th>
                    <th className="hidden lg:table-cell">Value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const low = p.stockQuantity <= p.minStockThreshold;
                    return (
                      <tr key={p.id}>
                        <td>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-[12px] text-fg-subtle flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full shrink-0" style={{ background: colorFor(p.category) }} />
                            {p.sku}
                            {p.size ? ` · ${p.size}` : ""} · {p.category}
                          </p>
                        </td>
                        <td className={cn("tabular", low && "text-warning font-medium")}>
                          {p.stockQuantity} {p.unit}
                        </td>
                        <td className="tabular text-fg-muted">
                          {money(p.buyPrice, profile.currencySymbol)} / {money(p.sellPrice, profile.currencySymbol)}
                        </td>
                        <td className="tabular hidden lg:table-cell">
                          {money(p.buyPrice * p.stockQuantity, profile.currencySymbol)}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <button
                            className="text-[13px] text-accent mr-4 font-medium min-h-11"
                            onClick={() => {
                              setRefill(p);
                              setRefillQty(Math.max(10, p.minStockThreshold * 2 - p.stockQuantity));
                              setRefillCost(p.buyPrice);
                            }}
                          >
                            Refill
                          </button>
                          <button className="text-[13px] text-fg-muted mr-4 min-h-11" onClick={() => setEditing(p)}>
                            Edit
                          </button>
                          <button
                            className="text-[13px] text-danger min-h-11"
                            onClick={async () => {
                              if (!confirm(`Delete ${p.name}?`)) return;
                              try {
                                await deleteProduct(p.id);
                                toast("Product removed");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Delete failed");
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit product" : "New product"}
      >
        {editing && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const sizeList =
                  !editing.id && editing.sizes && editing.sizes.length > 0
                    ? editing.sizes
                    : [editing.size || ""];
                if (!editing.id && sizeList.length > 1) {
                  let running = [...products];
                  for (const size of sizeList) {
                    const sku = nextSku(editing.category || "Apparels", running);
                    await saveProduct({
                      ...editing,
                      id: undefined,
                      size,
                      sku,
                      listed: editing.listed !== false,
                      buyPrice: toNumber(editing.buyPrice),
                      sellPrice: toNumber(editing.sellPrice),
                      stockQuantity: toNumber(editing.stockQuantity),
                      minStockThreshold: toNumber(editing.minStockThreshold, 5),
                    });
                    running = [
                      ...running,
                      {
                        id: `tmp-${sku}`,
                        sku,
                        category: editing.category || "Apparels",
                      } as Product,
                    ];
                  }
                } else {
                  await saveProduct({
                    ...editing,
                    size: sizeList[0] || "",
                    listed: editing.listed !== false,
                    buyPrice: toNumber(editing.buyPrice),
                    sellPrice: toNumber(editing.sellPrice),
                    stockQuantity: toNumber(editing.stockQuantity),
                    minStockThreshold: toNumber(editing.minStockThreshold, 5),
                  });
                }
                toast.success(editing.id ? "Product updated" : "Product added");
                setEditing(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not save product");
              }
            }}
          >
            <Field label="Name">
              <input
                required
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="field"
                placeholder="Oxford shirt"
              />
            </Field>
            <div>
              <p className="text-[13px] font-medium text-fg-muted mb-1.5">Photo</p>
              <div className="flex items-center gap-3">
                {(editing.imageUrl || coverFor(editing.category || "Apparels")) && (
                  <img
                    src={editing.imageUrl || coverFor(editing.category || "Apparels")}
                    alt=""
                    className="size-16 rounded-[14px] object-cover shadow-[var(--shadow-lift)]"
                  />
                )}
                <label className="btn-secondary-file">
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const imageUrl = await compressImage(file);
                        setEditing((cur) => (cur ? { ...cur, imageUrl } : cur));
                      } catch {
                        toast.error("Could not read that photo");
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU / ID">
                <input value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value.toUpperCase() })} className="field tabular" />
              </Field>
              <Field label="Unit">
                <input value={editing.unit || "pcs"} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} className="field" />
              </Field>
            </div>
            <div>
              <p className="text-[13px] font-medium text-fg-muted mb-1.5">Category</p>
              <div className="tag-row">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="tag-chip"
                    data-active={editing.category === c.name}
                    onClick={() => setCategory(c.name)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[12px] text-fg-subtle">
              {editing.category || "Apparels"} IDs run {prefixFor(editing.category || "Apparels")}001, {prefixFor(editing.category || "Apparels")}002 — counted per category
            </p>
            <div>
              <p className="text-[13px] font-medium text-fg-muted mb-1.5">
                {editing.id ? "Size" : "Sizes"}
              </p>
              <div className="tag-row">
                {FASHION_SIZES.map((size) => {
                  const on = editing.id ? editing.size === size : (editing.sizes || []).includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      className="tag-chip"
                      data-active={on}
                      onClick={() => {
                        if (editing.id) {
                          setEditing({ ...editing, size: editing.size === size ? "" : size });
                          return;
                        }
                        const current = editing.sizes || [];
                        setEditing({
                          ...editing,
                          sizes: current.includes(size) ? current.filter((s) => s !== size) : [...current, size],
                        });
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-medium text-fg-muted mb-1.5">Type</p>
              <div className="tag-row">
                {GARMENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="tag-chip"
                    data-active={editing.garmentType === type}
                    onClick={() => setEditing({ ...editing, garmentType: editing.garmentType === type ? "" : type })}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost">
                <NumericInput value={editing.buyPrice} onChange={(v) => setEditing({ ...editing, buyPrice: v })} min={0} step="0.01" />
              </Field>
              <Field label="Sell">
                <NumericInput value={editing.sellPrice} onChange={(v) => setEditing({ ...editing, sellPrice: v })} min={0} step="0.01" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Qty">
                <NumericInput value={editing.stockQuantity} onChange={(v) => setEditing({ ...editing, stockQuantity: v })} min={0} />
              </Field>
              <Field label="Min">
                <NumericInput value={editing.minStockThreshold} onChange={(v) => setEditing({ ...editing, minStockThreshold: v })} min={0} />
              </Field>
            </div>
            <Field label="Barcode">
              <input
                value={editing.barcode || ""}
                onChange={(e) => setEditing({ ...editing, barcode: e.target.value })}
                className="field"
              />
            </Field>
            <div className="tag-row">
              <button
                type="button"
                className="tag-chip"
                data-active={editing.listed !== false}
                onClick={() => setEditing({ ...editing, listed: true })}
              >
                On the shop
              </button>
              <button
                type="button"
                className="tag-chip"
                data-active={editing.listed === false}
                onClick={() => setEditing({ ...editing, listed: false })}
              >
                Stock only
              </button>
            </div>
            {editing.id && (
              <button
                type="button"
                className="text-[15px] text-accent font-medium min-h-11"
                onClick={() => {
                  const p = products.find((x) => x.id === editing.id);
                  if (!p) return;
                  setEditing(null);
                  setRefill(p);
                  setRefillQty(Math.max(10, p.minStockThreshold * 2 - p.stockQuantity));
                  setRefillCost(p.buyPrice);
                }}
              >
                Refill stock
              </button>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Save
              </Button>
            </div>
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(refill)} onClose={() => setRefill(null)} title={refill ? `Refill ${refill.name}` : "Refill"}>
        {refill && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await recordStockRefill({
                  productId: refill.id,
                  quantityToAdd: toNumber(refillQty),
                  costPerUnit: toNumber(refillCost, refill.buyPrice),
                });
                toast.success("Stock refilled");
                setRefill(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Refill failed");
              }
            }}
          >
            <Field label="Quantity to add">
              <NumericInput value={refillQty} onChange={setRefillQty} min={1} />
            </Field>
            <Field label="Cost per unit">
              <NumericInput value={refillCost} onChange={setRefillCost} min={0} step="0.01" />
            </Field>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setRefill(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Confirm
              </Button>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}
