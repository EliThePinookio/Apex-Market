import type { Category, Product, Transaction } from "@/types";

export interface CatalogCategory {
  id: string;
  name: string;
  short?: string;
  prefix: string;
  color: string;
  cover: string;
}

export const CATALOG: CatalogCategory[] = [
  { id: "cat-apparels", name: "Apparels", prefix: "AP", color: "#C4A35A", cover: "/brand/cats/apparels.jpg" },
  { id: "cat-trousers", name: "Trousers", prefix: "TR", color: "#6B7C5E", cover: "/brand/cats/trousers.jpg" },
  { id: "cat-tops", name: "Tops", prefix: "TO", color: "#8C6B4F", cover: "/brand/cats/tops.jpg" },
  { id: "cat-mens-shirts", name: "Men's shirts", short: "Shirts", prefix: "MS", color: "#3E4A5C", cover: "/brand/cats/mens-shirts.jpg" },
  { id: "cat-women", name: "Women", prefix: "WN", color: "#8A4A58", cover: "/brand/cats/women.jpg" },
  { id: "cat-watches", name: "Watches", prefix: "WA", color: "#B0893A", cover: "/brand/cats/watches.jpg" },
  { id: "cat-shoes", name: "Shoes", prefix: "SH", color: "#5C4636", cover: "/brand/cats/shoes.jpg" },
  { id: "cat-belts", name: "Belts", prefix: "BE", color: "#7A5C38", cover: "/brand/cats/belts.jpg" },
  { id: "cat-accessories", name: "Clothing accessories", short: "Accessories", prefix: "CA", color: "#9A7B4F", cover: "/brand/cats/accessories.jpg" },
  { id: "cat-electronics", name: "Electronics", prefix: "EL", color: "#4A5A6A", cover: "/brand/cats/electronics.jpg" },
  { id: "cat-jewellery", name: "Jewellery", prefix: "JW", color: "#C4A35A", cover: "/brand/cats/jewellery.jpg" },
  { id: "cat-necklaces", name: "Necklaces", prefix: "NK", color: "#D4AF37", cover: "/brand/cats/necklaces.jpg" },
];

export function prefixFor(category: string): string {
  const found = CATALOG.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
  if (found) return found.prefix;
  const letters = category.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 2) || "GN").padEnd(2, "X");
}

export function colorFor(category: string): string {
  const found = CATALOG.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
  return found?.color || "#C4A35A";
}

export function coverFor(category: string): string {
  const found = CATALOG.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
  return found?.cover || "/brand/lifestyle.jpg";
}

export function shortFor(category: string): string {
  const found = CATALOG.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
  return found?.short || category;
}

export function isGeneratedSku(sku: string, category: string): boolean {
  const prefix = prefixFor(category);
  return new RegExp(`^${prefix}\\d{3}$`, "i").test(sku.trim());
}

export function nextSku(category: string, products: Product[]): string {
  const prefix = prefixFor(category);
  const re = new RegExp(`^${prefix}(\\d{3})$`, "i");
  let max = 0;
  for (const p of products) {
    const m = p.sku.trim().match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function mergeCatalog(existing: Category[]): Category[] {
  const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c]));
  const merged: Category[] = CATALOG.map((cat) => {
    const found = byName.get(cat.name.toLowerCase());
    return found || { id: cat.id, name: cat.name, color: cat.color };
  });
  for (const c of existing) {
    if (!CATALOG.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) merged.push(c);
  }
  return merged;
}

export interface CategoryPulse {
  id: string;
  name: string;
  cover: string;
  color: string;
  count: number;
  units: number;
  value: number;
  revenue: number;
  sold: number;
  low: number;
}

export function catalogPulse(products: Product[], transactions: Transaction[]): CategoryPulse[] {
  const rows = new Map<string, CategoryPulse>();
  for (const c of CATALOG) {
    rows.set(c.name.toLowerCase(), {
      id: c.id,
      name: c.name,
      cover: c.cover,
      color: c.color,
      count: 0,
      units: 0,
      value: 0,
      revenue: 0,
      sold: 0,
      low: 0,
    });
  }
  const productCat = new Map(products.map((p) => [p.id, p.category]));
  for (const p of products) {
    const key = p.category.trim().toLowerCase();
    const row = rows.get(key);
    if (!row) continue;
    row.count += 1;
    row.units += p.stockQuantity;
    row.value += p.buyPrice * p.stockQuantity;
    if (p.stockQuantity <= p.minStockThreshold) row.low += 1;
  }
  for (const t of transactions) {
    if (t.type !== "sale" || !t.items) continue;
    for (const item of t.items) {
      const cat = productCat.get(item.productId);
      if (!cat) continue;
      const row = rows.get(cat.trim().toLowerCase());
      if (!row) continue;
      row.revenue += item.totalSellPrice;
      row.sold += item.quantity;
    }
  }
  return [...rows.values()];
}
