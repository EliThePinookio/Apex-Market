import { Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/ui/category-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { exportInventoryCsv } from "@/lib/apex/export";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import { coverFor } from "@/lib/beannel/catalog";
import { familyKey } from "@/lib/beannel/shop-meta";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

type StatusFilter = "all" | "active" | "draft" | "archived";

type Family = {
  key: string;
  name: string;
  category: string;
  vendor: string;
  garmentType: string;
  image: string;
  status: Product["status"];
  listed: boolean;
  stock: number;
  variants: Product[];
  primary: Product;
};

function statusOf(p: Product): NonNullable<Product["status"]> {
  return p.status || (p.listed === false ? "draft" : "active");
}

export function InventoryView() {
  const { products, categories, profile } = useApex();
  const search = useSearch({ strict: false }) as { cat?: string };
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(search?.cat || "All");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    if (search?.cat) setCat(search.cat);
  }, [search?.cat]);

  const families = useMemo(() => {
    const map = new Map<string, Family>();
    for (const p of products) {
      const key = familyKey(p.name, p.category);
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          key,
          name: p.name,
          category: p.category,
          vendor: p.vendor || "BEANNEL",
          garmentType: p.garmentType || "",
          image: p.imageUrl || coverFor(p.category),
          status: statusOf(p),
          listed: p.listed !== false,
          stock: p.stockQuantity,
          variants: [p],
          primary: p,
        });
        continue;
      }
      current.variants.push(p);
      current.stock += p.stockQuantity;
      if (!current.image && p.imageUrl) current.image = p.imageUrl;
      if (p.updatedAt > current.primary.updatedAt) current.primary = p;
    }
    return [...map.values()];
  }, [products]);

  const list = useMemo(() => {
    return families.filter((f) => {
      const hay = `${f.name} ${f.vendor} ${f.variants.map((v) => v.sku).join(" ")}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (cat !== "All" && f.category !== cat) return false;
      if (status !== "all" && (f.status || "active") !== status) return false;
      if (stockFilter === "low") return f.variants.some((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold);
      if (stockFilter === "out") return f.stock <= 0;
      return true;
    });
  }, [families, q, cat, status, stockFilter]);

  const value = products.reduce((s, p) => s + p.buyPrice * p.stockQuantity, 0);

  const open = (family: Family) => {
    void navigate({ to: "/inventory/$productId", params: { productId: family.primary.id } });
  };

  return (
    <div className="office-page">
      <PageHeader
        compact
        title="Products"
        subtitle={`${families.length} product${families.length === 1 ? "" : "s"} · ${money(value, profile.currencySymbol)} at cost`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportInventoryCsv(products, profile.currencySymbol)}>
              Export
            </Button>
            <Button size="sm" onClick={() => void navigate({ to: "/inventory/new" })}>
              Add product
            </Button>
          </>
        }
      />

      <div className="office-index">
        <div className="office-index-tabs">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["draft", "Draft"],
              ["archived", "Archived"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" data-active={status === id} onClick={() => setStatus(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="product-index-tools">
          <SearchField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="flex-1" />
          <div className="tag-row">
            {(["all", "low", "out"] as const).map((f) => (
              <button key={f} type="button" data-active={stockFilter === f} onClick={() => setStockFilter(f)} className="tag-chip capitalize">
                {f === "all" ? "Stock" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="tag-row tag-row-scroll no-scrollbar px-3 pb-2">
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

        {products.length === 0 ? (
          <div className="office-index-empty">
            <EmptyState
              icon={Package}
              title="Add your products"
              body="Start by adding your first product. It will show in the shop when status is Active and Online store is on."
              action={<Button onClick={() => void navigate({ to: "/inventory/new" })}>Add product</Button>}
            />
          </div>
        ) : list.length === 0 ? (
          <div className="office-index-empty">
            <EmptyState icon={Package} title="No products in this view" body="Try another tab or a different search." />
          </div>
        ) : (
          <div className="office-index-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Inventory</th>
                  <th>Type</th>
                  <th>Vendor</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => {
                  const low = f.variants.some((p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold);
                  const out = f.stock <= 0;
                  return (
                    <tr key={f.key} onClick={() => open(f)}>
                      <td>
                        <div className="product-index-cell">
                          <img src={f.image} alt="" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{f.name}</p>
                            <p className="office-muted">
                              {f.variants.length > 1
                                ? `${f.variants.length} variants`
                                : f.variants[0]?.sku}
                              {f.category ? ` · ${f.category}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={cn("product-status", `is-${f.status || "active"}`)}>
                          {f.status === "draft" ? "Draft" : f.status === "archived" ? "Archived" : "Active"}
                        </span>
                      </td>
                      <td className={cn("tabular", out && "text-danger", low && !out && "text-warning")}>
                        {f.stock} in stock
                        {f.variants.length > 1 ? ` for ${f.variants.length} variants` : ""}
                      </td>
                      <td className="office-muted">{f.garmentType || f.category}</td>
                      <td className="office-muted">{f.vendor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
