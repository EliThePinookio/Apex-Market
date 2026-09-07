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

/** Shop-facing gold map. Children still exist in stock; they fold into these six. */
export const GOLD_DEPARTMENTS: CatalogCategory[] = [
  CATALOG[0],
  CATALOG[6],
  CATALOG[5],
  CATALOG[10],
  { ...CATALOG[8], name: "Accessories", short: "Accessories" },
  CATALOG[9],
];

const PARENT_OF: Record<string, string> = {
  apparels: "Apparels",
  trousers: "Apparels",
  tops: "Apparels",
  "men's shirts": "Apparels",
  shirts: "Apparels",
  women: "Apparels",
  shoes: "Shoes",
  footwear: "Shoes",
  watches: "Watches",
  jewellery: "Jewellery",
  jewelry: "Jewellery",
  necklaces: "Jewellery",
  necklace: "Jewellery",
  "clothing accessories": "Accessories",
  accessories: "Accessories",
  belts: "Accessories",
  electronics: "Electronics",
};

const CLASSIFY: Array<{ dept: string; words: string[] }> = [
  { dept: "Jewellery", words: ["necklace", "necklaces", "earring", "earrings", "bracelet", "bangle", "pendant", "jewellery", "jewelry", "choker", "locket", "hoop", "studs", "anklet"] },
  { dept: "Watches", words: ["watch", "watches", "timepiece", "chronograph"] },
  { dept: "Electronics", words: ["earbud", "earbuds", "earphone", "headphone", "airpod", "airpods", "speaker", "charger", "gadget"] },
  { dept: "Shoes", words: ["shoe", "shoes", "sneaker", "loafer", "boot", "sandal", "heel", "oxford", "brogue", "trainer", "mule", "slides", "chelsea"] },
  { dept: "Accessories", words: ["belt", "belts", "cufflink", "cufflinks", "tie", "scarf", "wallet", "cap", "hat", "brooch"] },
  { dept: "Apparels", words: ["shirt", "shirts", "polo", "trouser", "trousers", "jean", "jeans", "chino", "dress", "blouse", "kaftan", "hoodie", "jacket", "suit", "skirt", "short", "shorts", "apparel", "gown", "kente", "ankara", "smock", "agbada", "dashiki", "joggers", "sweatshirt", "palazzo"] },
];

export function goldParent(category: string): string {
  const key = category.trim().toLowerCase();
  if (!key) return "Apparels";
  return PARENT_OF[key] || CATALOG.find((c) => c.name.toLowerCase() === key || (c.short || "").toLowerCase() === key)?.name || category;
}

export function classifyProduct(name: string, category = "", garmentType = ""): { parent: string; hits: number } {
  const blob = `${name} ${category} ${garmentType}`.toLowerCase();
  let best = { parent: goldParent(category), hits: 0 };
  for (const row of CLASSIFY) {
    const hits = row.words.reduce((n, w) => n + (new RegExp(`\\b${w}\\b`, "i").test(blob) ? 1 : 0), 0);
    if (hits > best.hits) best = { parent: row.dept, hits };
  }
  return best;
}

export function isMisplaced(name: string, category: string, garmentType = ""): boolean {
  const guess = classifyProduct(name, category, garmentType);
  if (guess.hits === 0) return false;
  return goldParent(category) !== guess.parent;
}

export function fileProduct(
  name: string,
  category = "",
  garmentType = "",
  notes = "",
): { parent: string; hits: number } {
  const guess = classifyProduct(`${name} ${notes}`.trim(), "", garmentType);
  if (guess.hits > 0) return guess;
  return { parent: goldParent(category || "Apparels"), hits: 0 };
}

export function polishTitle(name: string): string {
  const t = name.trim().replace(/\s+/g, " ");
  if (!t) return t;
  if (/[A-Z]/.test(t) && /[a-z]/.test(t)) return t;
  if (t === t.toUpperCase() && t.length < 14) return t;
  return t.replace(/\b([a-zA-Z])/g, (m) => m.toUpperCase());
}

export type Audience = "men" | "women" | "unisex";

export const GOLD_AUDIENCE: Array<{ id: string; name: "Men" | "Women"; audience: Audience; cover: string }> = [
  { id: "who-women", name: "Women", audience: "women", cover: "/brand/cats/women.jpg" },
  { id: "who-men", name: "Men", audience: "men", cover: "/brand/cats/mens-shirts.jpg" },
];

const MEN_WORDS = ["men", "mens", "men's", "male", "him", "gents", "gentleman", "polo", "chino", "oxford", "brogue", "agbada", "smock", "dashiki"];
const WOMEN_WORDS = ["women", "womens", "women's", "female", "ladies", "lady", "her", "girl", "gown", "dress", "blouse", "heel", "heels", "palazzo", "skirt", "crop"];

function countWords(blob: string, words: string[]): number {
  return words.reduce((n, w) => n + (new RegExp(`\\b${w.replace("'", "'?")}\\b`, "i").test(blob) ? 1 : 0), 0);
}

export function classifyAudience(name: string, category = "", garmentType = "", notes = ""): { audience: Audience; hits: number } {
  const blob = `${name} ${category} ${garmentType} ${notes}`.toLowerCase();
  const men = countWords(blob, MEN_WORDS);
  const women = countWords(blob, WOMEN_WORDS);
  if (men > women && men > 0) return { audience: "men", hits: men };
  if (women > men && women > 0) return { audience: "women", hits: women };
  return { audience: "unisex", hits: 0 };
}

export function fileAudience(name: string, category = "", garmentType = "", notes = "", current?: string): Audience {
  const guess = classifyAudience(name, category, garmentType, notes);
  if (guess.hits > 0) return guess.audience;
  if (current === "men" || current === "women" || current === "unisex") return current;
  return "unisex";
}

export function matchesAudience(listing: string | undefined, wanted: string | undefined): boolean {
  const w = (wanted || "").trim().toLowerCase();
  if (!w || w === "all") return true;
  const a = (listing || "unisex").trim().toLowerCase();
  if (a === "unisex") return w === "men" || w === "women" || w === "unisex";
  return a === w;
}

export function parseAudience(text: string): Audience | null {
  const t = text.toLowerCase();
  if (/\bwomen\b|\bfemale\b|\bladies\b/.test(t)) return "women";
  if (/\bmen\b|\bmale\b|\bgents\b/.test(t)) return "men";
  if (/\bunisex\b|\beveryone\b/.test(t)) return "unisex";
  return null;
}

export function parseGoldRoom(text: string): string | null {
  const t = text.toLowerCase();
  for (const room of GOLD_DEPARTMENTS) {
    if (t.includes(room.name.toLowerCase())) return room.name;
  }
  if (t.includes("jewel")) return "Jewellery";
  if (t.includes("cloth") || t.includes("wear") || t.includes("fashion")) return "Apparels";
  if (t.includes("foot")) return "Shoes";
  return null;
}

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
  const parent = goldParent(category);
  const gold = GOLD_DEPARTMENTS.find((c) => c.name.toLowerCase() === parent.toLowerCase());
  const found = CATALOG.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
  return gold?.cover || found?.cover || "/brand/lifestyle.jpg";
}

export function shortFor(category: string): string {
  const parent = goldParent(category);
  const gold = GOLD_DEPARTMENTS.find((c) => c.name.toLowerCase() === parent.toLowerCase());
  const found = CATALOG.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
  return gold?.short || gold?.name || found?.short || parent;
}

export function matchesCategory(listingCategory: string, wanted: string): boolean {
  const b = wanted.trim().toLowerCase();
  if (!b || b === "all") return true;
  return goldParent(listingCategory).toLowerCase() === goldParent(wanted).toLowerCase();
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
  for (const cat of GOLD_DEPARTMENTS) {
    if (!merged.some((m) => m.name.toLowerCase() === cat.name.toLowerCase())) {
      merged.push({ id: cat.id, name: cat.name, color: cat.color });
    }
  }
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
