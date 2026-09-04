import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ImagePlus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { NumericInput, toNumber, type NumericValue } from "@/components/ui/numeric-field";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import { coverFor, isGeneratedSku, nextSku } from "@/lib/beannel/catalog";
import { familyKey, compressImage, FASHION_SIZES, GARMENT_TYPES, parseShopMeta, type ProductStatus } from "@/lib/beannel/shop-meta";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

type VariantDraft = {
  id?: string;
  size: string;
  sku: string;
  stock: NumericValue;
  price: NumericValue;
  cost: NumericValue;
  barcode: string;
};

type Draft = {
  name: string;
  description: string;
  images: string[];
  sellPrice: NumericValue;
  compareAt: NumericValue;
  buyPrice: NumericValue;
  chargeTax: boolean;
  sku: string;
  barcode: string;
  stockQuantity: NumericValue;
  minStockThreshold: NumericValue;
  continueSelling: boolean;
  unit: string;
  status: ProductStatus;
  listed: boolean;
  category: string;
  garmentType: string;
  vendor: string;
  tags: string[];
  variants: VariantDraft[];
};

function fromProduct(p: Product, family: Product[]): Draft {
  const { notes } = parseShopMeta(p.notes);
  const images = (p.images && p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : []).filter(Boolean);
  const variants: VariantDraft[] =
    family.length > 0
      ? family.map((v) => ({
          id: v.id,
          size: v.size || "",
          sku: v.sku,
          stock: v.stockQuantity,
          price: v.sellPrice,
          cost: v.buyPrice,
          barcode: v.barcode || "",
        }))
      : [];
  return {
    name: p.name,
    description: notes,
    images,
    sellPrice: p.sellPrice,
    compareAt: p.compareAt || "",
    buyPrice: p.buyPrice,
    chargeTax: Boolean(p.chargeTax),
    sku: p.sku,
    barcode: p.barcode || "",
    stockQuantity: p.stockQuantity,
    minStockThreshold: p.minStockThreshold,
    continueSelling: Boolean(p.continueSelling),
    unit: p.unit || "pcs",
    status: p.status || (p.listed === false ? "draft" : "active"),
    listed: p.listed !== false,
    category: p.category || "Apparels",
    garmentType: p.garmentType || "",
    vendor: p.vendor || "BEANNEL",
    tags: p.tags || [],
    variants,
  };
}

function emptyDraft(category: string, sku: string): Draft {
  return {
    name: "",
    description: "",
    images: [],
    sellPrice: "",
    compareAt: "",
    buyPrice: "",
    chargeTax: false,
    sku,
    barcode: "",
    stockQuantity: "",
    minStockThreshold: 5,
    continueSelling: false,
    unit: "pcs",
    status: "active",
    listed: true,
    category,
    garmentType: "",
    vendor: "BEANNEL",
    tags: [],
    variants: [],
  };
}

function serialize(d: Draft): string {
  return JSON.stringify(d);
}

export function ProductEditor({ productId }: { productId?: string }) {
  const { products, categories, profile, saveProduct, deleteProduct } = useApex();
  const navigate = useNavigate();
  const existing = products.find((p) => p.id === productId);
  const family = useMemo(() => {
    if (!existing) return [];
    const key = familyKey(existing.name, existing.category);
    return products.filter((p) => familyKey(p.name, p.category) === key);
  }, [products, existing]);

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) return fromProduct(existing, family.length ? family : [existing]);
    const category = categories[0]?.name || "Apparels";
    return emptyDraft(category, nextSku(category, products));
  });
  const [baseline, setBaseline] = useState(() => serialize(draft));
  const [hydrated, setHydrated] = useState(Boolean(!productId || existing));
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (hydrated || !existing) return;
    const next = fromProduct(existing, family.length ? family : [existing]);
    setDraft(next);
    setBaseline(serialize(next));
    setHydrated(true);
  }, [existing, family, hydrated]);

  const dirty = serialize(draft) !== baseline;
  const cur = profile.currencySymbol;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && !busy) void onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "");
    if (!tag) return;
    if (draft.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagInput("");
      return;
    }
    set({ tags: [...draft.tags, tag] });
    setTagInput("");
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...draft.images];
    for (const file of Array.from(files).slice(0, 8 - next.length)) {
      try {
        next.push(await compressImage(file));
      } catch {
        toast.error("Could not read that photo");
      }
    }
    set({ images: next });
  };

  const setCategory = (name: string) => {
    const keepSku = draft.sku && !isGeneratedSku(draft.sku, draft.category);
    set({
      category: name,
      sku: keepSku ? draft.sku : nextSku(name, products),
    });
  };

  const toggleSize = (size: string) => {
    const has = draft.variants.some((v) => v.size === size);
    if (has) {
      set({ variants: draft.variants.filter((v) => v.size !== size) });
      return;
    }
    const others = products.filter((p) => !draft.variants.some((v) => v.id === p.id));
    set({
      variants: [
        ...draft.variants,
        {
          size,
          sku: nextSku(draft.category, [...others, ...draft.variants.map((v) => ({ sku: v.sku, category: draft.category }) as Product)]),
          stock: draft.stockQuantity === "" ? 0 : draft.stockQuantity,
          price: draft.sellPrice,
          cost: draft.buyPrice,
          barcode: "",
        },
      ],
    });
  };

  const updateVariant = (index: number, patch: Partial<VariantDraft>) => {
    set({
      variants: draft.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    });
  };

  const sharedPayload = (extra: Partial<Product> = {}): Partial<Product> => ({
    name: draft.name.trim(),
    notes: draft.description,
    images: draft.images,
    imageUrl: draft.images[0] || "",
    sellPrice: toNumber(draft.sellPrice),
    compareAt: toNumber(draft.compareAt),
    buyPrice: toNumber(draft.buyPrice),
    chargeTax: draft.chargeTax,
    minStockThreshold: toNumber(draft.minStockThreshold, 5),
    continueSelling: draft.continueSelling,
    unit: draft.unit,
    status: draft.status,
    listed: draft.status === "active" && draft.listed,
    category: draft.category,
    garmentType: draft.garmentType,
    vendor: draft.vendor.trim() || "BEANNEL",
    tags: draft.tags,
    ...extra,
  });

  const onSave = async () => {
    if (!draft.name.trim()) {
      toast.error("Add a title");
      return;
    }
    setBusy(true);
    try {
      const sizes = draft.variants.filter((v) => v.size);
      if (!existing) {
        if (sizes.length > 0) {
          let running = [...products];
          for (const variant of sizes) {
            const sku = variant.sku || nextSku(draft.category, running);
            await saveProduct(
              sharedPayload({
                sku,
                size: variant.size,
                barcode: variant.barcode,
                stockQuantity: toNumber(variant.stock),
                sellPrice: toNumber(variant.price, toNumber(draft.sellPrice)),
                buyPrice: toNumber(variant.cost, toNumber(draft.buyPrice)),
              }),
            );
            running = [...running, { id: `tmp-${sku}`, sku, category: draft.category } as Product];
          }
        } else {
          await saveProduct(
            sharedPayload({
              sku: draft.sku,
              barcode: draft.barcode,
              stockQuantity: toNumber(draft.stockQuantity),
              size: "",
            }),
          );
        }
        toast.success("Product saved");
        await navigate({ to: "/inventory" });
        return;
      }

      if (sizes.length > 0) {
        const seen = new Set<string>();
        for (const variant of sizes) {
          await saveProduct(
            sharedPayload({
              id: variant.id,
              sku: variant.sku,
              size: variant.size,
              barcode: variant.barcode,
              stockQuantity: toNumber(variant.stock),
              sellPrice: toNumber(variant.price, toNumber(draft.sellPrice)),
              buyPrice: toNumber(variant.cost, toNumber(draft.buyPrice)),
            }),
          );
          if (variant.id) seen.add(variant.id);
        }
        for (const sib of family) {
          if (!seen.has(sib.id) && sizes.every((v) => v.id !== sib.id)) {
            await deleteProduct(sib.id);
          }
        }
      } else {
        await saveProduct(
          sharedPayload({
            id: existing.id,
            sku: draft.sku,
            barcode: draft.barcode,
            stockQuantity: toNumber(draft.stockQuantity),
            size: existing.size || "",
          }),
        );
        for (const sib of family) {
          if (sib.id === existing.id) continue;
          await saveProduct(
            sharedPayload({
              id: sib.id,
              sku: sib.sku,
              size: sib.size,
              barcode: sib.barcode,
              stockQuantity: sib.stockQuantity,
              sellPrice: sib.sellPrice,
              buyPrice: sib.buyPrice,
            }),
          );
        }
      }
      toast.success("Product saved");
      setBaseline(serialize(draft));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setBusy(false);
    }
  };

  const onDiscard = () => {
    if (!dirty) {
      void navigate({ to: "/inventory" });
      return;
    }
    setDraft(JSON.parse(baseline) as Draft);
  };

  const onDelete = async () => {
    if (!existing) return;
    if (!confirm(`Delete ${draft.name || "this product"} and its variants from stock and the shop?`)) return;
    setBusy(true);
    try {
      const rows = family.length ? family : [existing];
      for (const row of rows) await deleteProduct(row.id);
      toast("Product removed");
      void navigate({ to: "/inventory" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const featured = draft.images[0] || coverFor(draft.category);
  const profit =
    toNumber(draft.sellPrice) > 0 && toNumber(draft.buyPrice) >= 0
      ? toNumber(draft.sellPrice) - toNumber(draft.buyPrice)
      : 0;

  return (
    <div className="product-editor">
      {dirty && (
        <div className="product-ctxbar">
          <p>{existing ? "Unsaved changes" : "Unsaved product"}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onDiscard} disabled={busy}>
              Discard
            </Button>
            <Button size="sm" onClick={() => void onSave()} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Link to="/inventory" className="product-back">
          <ChevronLeft className="size-4" />
          Products
        </Link>
        {savedFlash && <span className="product-saved">Saved</span>}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1>{existing ? draft.name || "Product" : "Add product"}</h1>
        {!dirty && (
          <Button size="sm" onClick={() => void onSave()} disabled={busy}>
            Save
          </Button>
        )}
      </div>

      <div className="product-editor-grid">
        <div className="product-editor-main">
          <section className="office-card product-card">
            <Field label="Title">
              <input
                className="field"
                value={draft.name}
                placeholder="Short sleeve t-shirt"
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                className="field product-desc"
                rows={6}
                value={draft.description}
                placeholder="Tell customers about the fabric, fit, and how to wear it."
                onChange={(e) => set({ description: e.target.value })}
              />
            </Field>
          </section>

          <section className="office-card product-card">
            <div className="flex items-center justify-between">
              <h2>Media</h2>
              <label className="product-ghost-btn">
                Add files
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {draft.images.length === 0 ? (
              <label className="product-drop">
                <ImagePlus className="size-6" />
                <span>Add files</span>
                <span>Accepts images. First photo is the shop cover.</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : (
              <div className="product-media">
                {draft.images.map((src, i) => (
                  <figure key={`${src.slice(-12)}-${i}`} className={cn("product-thumb", i === 0 && "is-cover")}>
                    <img src={src} alt="" />
                    {i === 0 && <span>Cover</span>}
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => set({ images: draft.images.filter((_, n) => n !== i) })}
                    >
                      <X className="size-3.5" />
                    </button>
                  </figure>
                ))}
                {draft.images.length < 8 && (
                  <label className="product-thumb is-add">
                    <ImagePlus className="size-5" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        void addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </section>

          <section className="office-card product-card">
            <h2>Pricing</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Price (${cur})`}>
                <NumericInput value={draft.sellPrice} onChange={(v) => set({ sellPrice: v })} min={0} step="0.01" />
              </Field>
              <Field label="Compare-at price">
                <NumericInput value={draft.compareAt} onChange={(v) => set({ compareAt: v })} min={0} step="0.01" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Cost per item (${cur})`}>
                <NumericInput value={draft.buyPrice} onChange={(v) => set({ buyPrice: v })} min={0} step="0.01" />
              </Field>
              <div className="product-margin">
                <p>Margin</p>
                <p className="tabular">{money(profit, cur)}</p>
              </div>
            </div>
            <label className="product-check">
              <input type="checkbox" checked={draft.chargeTax} onChange={(e) => set({ chargeTax: e.target.checked })} />
              Charge tax on this product
            </label>
          </section>

          <section className="office-card product-card">
            <h2>Inventory</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU">
                <input className="field tabular" value={draft.sku} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Barcode">
                <input className="field" value={draft.barcode} onChange={(e) => set({ barcode: e.target.value })} />
              </Field>
            </div>
            {draft.variants.length === 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <NumericInput value={draft.stockQuantity} onChange={(v) => set({ stockQuantity: v })} min={0} />
                </Field>
                <Field label="Continue selling below">
                  <NumericInput value={draft.minStockThreshold} onChange={(v) => set({ minStockThreshold: v })} min={0} />
                </Field>
              </div>
            )}
            <label className="product-check">
              <input
                type="checkbox"
                checked={draft.continueSelling}
                onChange={(e) => set({ continueSelling: e.target.checked })}
              />
              Continue selling when out of stock
            </label>
          </section>

          <section className="office-card product-card">
            <div className="flex items-center justify-between">
              <h2>Variants</h2>
              <p className="text-[12px] text-fg-muted">Size</p>
            </div>
            <p className="text-[13px] text-fg-muted">Add options like size so the shop and till share the same stock.</p>
            <div className="tag-row mt-2">
              {FASHION_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="tag-chip"
                  data-active={draft.variants.some((v) => v.size === size)}
                  onClick={() => toggleSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
            {draft.variants.length > 0 && (
              <div className="product-variant-table">
                <table>
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Price</th>
                      <th>Cost</th>
                      <th>Quantity</th>
                      <th>SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.variants.map((v, i) => (
                      <tr key={v.id || v.size}>
                        <td className="font-medium">{v.size}</td>
                        <td>
                          <NumericInput value={v.price} onChange={(n) => updateVariant(i, { price: n })} min={0} step="0.01" />
                        </td>
                        <td>
                          <NumericInput value={v.cost} onChange={(n) => updateVariant(i, { cost: n })} min={0} step="0.01" />
                        </td>
                        <td>
                          <NumericInput value={v.stock} onChange={(n) => updateVariant(i, { stock: n })} min={0} />
                        </td>
                        <td>
                          <input
                            className="field tabular"
                            value={v.sku}
                            onChange={(e) => updateVariant(i, { sku: e.target.value.toUpperCase() })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="product-editor-side">
          <section className="office-card product-card">
            <h2>Status</h2>
            <select
              className="field"
              value={draft.status}
              onChange={(e) => set({ status: e.target.value as ProductStatus })}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </section>

          <section className="office-card product-card">
            <h2>Publishing</h2>
            <p className="text-[13px] text-fg-muted mb-2">Sales channels</p>
            <label className="product-check">
              <input
                type="checkbox"
                checked={draft.listed && draft.status === "active"}
                onChange={(e) => set({ listed: e.target.checked, status: e.target.checked ? "active" : draft.status })}
              />
              Online store
            </label>
            <p className="text-[12px] text-fg-subtle mt-2">
              Point of sale always uses this stock, even if the shop listing is off.
            </p>
          </section>

          <section className="office-card product-card">
            <h2>Product organization</h2>
            <Field label="Category">
              <select className="field" value={draft.category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <p className="text-[13px] font-medium text-fg-muted mb-1.5">Type</p>
              <div className="tag-row">
                {GARMENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="tag-chip"
                    data-active={draft.garmentType === type}
                    onClick={() => set({ garmentType: draft.garmentType === type ? "" : type })}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Vendor">
              <input className="field" value={draft.vendor} onChange={(e) => set({ vendor: e.target.value })} />
            </Field>
            <Field label="Tags">
              <div className="product-tags">
                {draft.tags.map((tag) => (
                  <button key={tag} type="button" className="product-tag" onClick={() => set({ tags: draft.tags.filter((t) => t !== tag) })}>
                    {tag}
                    <X className="size-3" />
                  </button>
                ))}
                <input
                  className="field"
                  value={tagInput}
                  placeholder="Vintage, cotton"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  onBlur={() => addTag(tagInput)}
                />
              </div>
            </Field>
          </section>

          <section className="office-card product-card product-preview">
            <h2>Shop preview</h2>
            <div className="product-preview-card">
              <img src={featured} alt="" />
              <p>{draft.name || "Untitled product"}</p>
              <p className="tabular">
                {draft.compareAt && toNumber(draft.compareAt) > toNumber(draft.sellPrice) ? (
                  <>
                    <s className="text-fg-subtle mr-1">{money(toNumber(draft.compareAt), cur)}</s>
                    {money(toNumber(draft.sellPrice), cur)}
                  </>
                ) : (
                  money(toNumber(draft.sellPrice), cur)
                )}
              </p>
            </div>
          </section>

          {existing && (
            <button type="button" className="product-delete" onClick={() => void onDelete()} disabled={busy}>
              <Trash2 className="size-4" />
              Delete product
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
