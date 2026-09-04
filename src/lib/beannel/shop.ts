import { coverFor } from "@/lib/beannel/catalog";
import { supabase } from "@/lib/beannel/supabase";
import { newId } from "@/lib/apex/money";
import type { PaymentMethod, Product, TransactionItem } from "@/types";
import {
  listingIdFor,
  parseShopMeta,
  shopInfoId,
  slugProduct,
  sourceIdFromListing,
  waDigits,
  writeShopMeta,
  type ShopMeta,
} from "@/lib/beannel/shop-meta";
import type { BagItem } from "@/lib/beannel/cart";

export interface ShopListing {
  listingId: string;
  productId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  size: string;
  garmentType: string;
  image: string;
  listed: boolean;
  updatedAt: string;
}

export interface ShopGroup {
  slug: string;
  name: string;
  category: string;
  garmentType: string;
  image: string;
  priceFrom: number;
  stock: number;
  variants: ShopListing[];
}

export interface ShopStorefront {
  businessId: string;
  name: string;
  tagline: string;
  currency: string;
  whatsapp: string;
}

export interface ShopInboxOrder {
  id: string;
  name: string;
  phone: string;
  address: string;
  payment: PaymentMethod;
  items: TransactionItem[];
  amount: number;
  date: string;
}

const INFO_SKU = "SHOPINFO";

function listingImage(meta: ShopMeta, category: string): string {
  return meta.imageUrl || coverFor(category);
}

export function groupListings(listings: ShopListing[]): ShopGroup[] {
  const map = new Map<string, ShopGroup>();
  for (const item of listings) {
    if (!item.listed) continue;
    const slug = slugProduct(item.name, item.category);
    const existing = map.get(slug);
    if (!existing) {
      map.set(slug, {
        slug,
        name: item.name,
        category: item.category,
        garmentType: item.garmentType,
        image: item.image,
        priceFrom: item.price,
        stock: item.stock,
        variants: [item],
      });
      continue;
    }
    existing.variants.push(item);
    existing.stock += item.stock;
    existing.priceFrom = Math.min(existing.priceFrom, item.price);
    if (!existing.image && item.image) existing.image = item.image;
  }
  return [...map.values()];
}

function mapListing(row: Record<string, unknown>): ShopListing | null {
  const id = String(row.id || "");
  if (!id.startsWith("list-")) return null;
  const { meta } = parseShopMeta(typeof row.notes === "string" ? row.notes : "");
  if (meta.listed === false) return null;
  const category = String(row.category || "Apparels");
  return {
    listingId: id,
    productId: String(row.barcode || sourceIdFromListing(id)),
    name: String(row.name || "Piece"),
    sku: String(row.sku || ""),
    category,
    price: Number(row.sell_price) || 0,
    stock: Math.max(0, Number(row.stock_quantity) || 0),
    unit: String(row.unit || "pcs"),
    size: meta.size || "",
    garmentType: meta.garmentType || "",
    image: listingImage(meta, category),
    listed: true,
    updatedAt: String(row.updated_at || ""),
  };
}

export async function fetchShopListings(): Promise<ShopListing[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,sku,category,sell_price,stock_quantity,unit,barcode,notes,updated_at")
    .like("id", "list-%")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || [])
    .map((row) => mapListing(row as Record<string, unknown>))
    .filter((row): row is ShopListing => row != null && row.price > 0);
}

export async function fetchShopStorefront(): Promise<ShopStorefront> {
  const fallback: ShopStorefront = {
    businessId: "",
    name: "BEANNEL",
    tagline: "Clothes · Jewelry · Watches · Fashion",
    currency: "GH₵",
    whatsapp: "",
  };
  const { data, error } = await supabase
    .from("products")
    .select("id,name,notes,sku")
    .eq("sku", INFO_SKU)
    .like("id", "info-%")
    .limit(1);
  if (error || !data?.[0]) return fallback;
  const row = data[0];
  if (!row) return fallback;
  const { meta, notes } = parseShopMeta(typeof row.notes === "string" ? row.notes : "");
  return {
    businessId: meta.businessId || String(row.id).replace(/^info-/, ""),
    name: String(row.name || fallback.name),
    tagline: notes || fallback.tagline,
    currency: meta.garmentType || fallback.currency,
    whatsapp: meta.size || "",
  };
}

export async function publishListing(businessId: string, product: Product): Promise<void> {
  const { meta } = parseShopMeta(product.notes);
  const listed = product.listed ?? meta.listed !== false;
  const id = listingIdFor(product.id);
  if (!listed || product.sellPrice <= 0) {
    await supabase.from("products").delete().eq("id", id);
    return;
  }
  const packed = writeShopMeta("", {
    size: product.size || meta.size,
    garmentType: product.garmentType || meta.garmentType,
    imageUrl: product.imageUrl || meta.imageUrl,
    listed: true,
    businessId,
  });
  const now = new Date().toISOString();
  const { error } = await supabase.from("products").upsert(
    {
      id,
      business_id: null,
      name: product.name,
      sku: product.sku,
      category: product.category,
      buy_price: 0,
      sell_price: product.sellPrice,
      stock_quantity: product.stockQuantity,
      min_stock_threshold: 0,
      unit: product.unit,
      barcode: product.id,
      notes: packed,
      created_at: product.createdAt || now,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`Shop listing: ${error.message}`);
}

export async function unpublishListing(productId: string): Promise<void> {
  await supabase.from("products").delete().eq("id", listingIdFor(productId));
}

export async function persistShopInfo(
  businessId: string,
  info: { name: string; tagline?: string; currency: string; whatsapp: string },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("products").upsert(
    {
      id: shopInfoId(businessId),
      business_id: null,
      name: info.name || "BEANNEL",
      sku: INFO_SKU,
      category: "Apparels",
      buy_price: 0,
      sell_price: 0,
      stock_quantity: 0,
      min_stock_threshold: 0,
      unit: "pcs",
      barcode: businessId,
      notes: writeShopMeta(info.tagline || "Clothes · Jewelry · Watches · Fashion", {
        size: info.whatsapp,
        garmentType: info.currency,
        listed: false,
        businessId,
      }),
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`Shop profile: ${error.message}`);
}

export function whatsappHref(number: string, text: string): string {
  const digits = waDigits(number);
  const encoded = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function orderMessage(args: {
  store: string;
  name: string;
  phone: string;
  address: string;
  items: BagItem[];
  total: string;
  pay: string;
}): string {
  const lines = args.items.map((i) => `• ${i.name}${i.size ? ` (${i.size})` : ""} × ${i.qty}`);
  return [
    `BEANNEL order for ${args.store}`,
    `${args.name} · ${args.phone}`,
    args.address ? `Deliver: ${args.address}` : "",
    ...lines,
    `Total ${args.total}`,
    `Pay: ${args.pay}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function placeShopOrder(args: {
  businessId: string;
  customerName: string;
  phone: string;
  address: string;
  payment: "mobile_money" | "cash" | "other";
  items: BagItem[];
}): Promise<{ orderId: string }> {
  const name = args.customerName.trim();
  const phone = args.phone.trim();
  if (!name) throw new Error("Please leave your name.");
  if (phone.replace(/\D/g, "").length < 9) throw new Error("Please leave a working phone number.");
  if (!args.items.length) throw new Error("Your bag is empty.");

  const listings = await fetchShopListings();
  const byId = new Map(listings.map((l) => [l.listingId, l]));
  const lines: TransactionItem[] = [];
  let total = 0;

  for (const item of args.items) {
    const listing = byId.get(item.listingId);
    if (!listing) throw new Error(`${item.name} is no longer on the floor.`);
    if (listing.stock < item.qty) throw new Error(`${item.name} only has ${listing.stock} left.`);
    const lineTotal = listing.price * item.qty;
    total += lineTotal;
    lines.push({
      productId: listing.productId,
      productName: `${listing.name}${listing.size ? ` · ${listing.size}` : ""}`,
      quantity: item.qty,
      unitBuyPrice: 0,
      unitSellPrice: listing.price,
      totalSellPrice: lineTotal,
      totalBuyPrice: 0,
    });
  }

  for (const item of args.items) {
    const listing = byId.get(item.listingId)!;
    const nextStock = listing.stock - item.qty;
    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: nextStock, updated_at: new Date().toISOString() })
      .eq("id", listing.listingId);
    if (error) throw new Error(`Could not hold stock for ${item.name}.`);
  }

  const now = new Date().toISOString();
  const orderId = newId("shop");
  const description = [
    "SHOP",
    args.businessId,
    name,
    phone,
    args.payment,
    args.address.replace(/\|/g, " "),
  ].join("|");

  const { error } = await supabase.from("transactions").insert({
    id: orderId,
    business_id: null,
    type: "sale",
    amount: total,
    cogs: 0,
    gross_profit: 0,
    net_profit: 0,
    date: now,
    description,
    payment_method: args.payment,
    customer_name: name,
    reference_no: "SHOP",
    items: lines,
    created_at: now,
  });
  if (error) throw new Error(`Could not send the order: ${error.message}`);
  return { orderId };
}

function parseInboxDescription(description: string): {
  businessId: string;
  name: string;
  phone: string;
  payment: PaymentMethod;
  address: string;
} | null {
  if (!description.startsWith("SHOP|")) return null;
  const parts = description.split("|");
  if (parts.length < 5) return null;
  const rawPay = parts[4] || "other";
  const payment: PaymentMethod =
    rawPay === "cash" || rawPay === "card" || rawPay === "transfer" || rawPay === "mobile_money" || rawPay === "other"
      ? rawPay
      : "other";
  return {
    businessId: parts[1] || "",
    name: parts[2] || "Customer",
    phone: parts[3] || "",
    payment,
    address: parts.slice(5).join("|"),
  };
}

export async function fetchShopInbox(businessId: string): Promise<ShopInboxOrder[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .is("business_id", null)
    .like("id", "shop-%")
    .order("date", { ascending: true })
    .limit(50);
  if (error || !data?.length) return [];
  const orders: ShopInboxOrder[] = [];
  for (const row of data) {
    const parsed = parseInboxDescription(String(row.description || ""));
    if (!parsed || parsed.businessId !== businessId) continue;
    const items = Array.isArray(row.items) ? (row.items as TransactionItem[]) : [];
    if (!items.length) continue;
    orders.push({
      id: String(row.id),
      name: parsed.name,
      phone: parsed.phone,
      address: parsed.address,
      payment: parsed.payment,
      items,
      amount: Number(row.amount) || 0,
      date: String(row.date || ""),
    });
  }
  return orders;
}

export async function dropInboxOrder(orderId: string): Promise<void> {
  await supabase.from("transactions").delete().eq("id", orderId);
}

export async function wipeShopPublic(businessId: string): Promise<void> {
  await supabase.from("products").delete().eq("id", shopInfoId(businessId));
  const { data } = await supabase.from("products").select("id,notes").like("id", "list-%");
  const mine = (data || []).filter((row) => {
    const { meta } = parseShopMeta(typeof row.notes === "string" ? row.notes : "");
    return meta.businessId === businessId;
  });
  if (mine.length) {
    await supabase.from("products").delete().in(
      "id",
      mine.map((r) => r.id),
    );
  }
  await supabase.from("transactions").delete().like("id", "shop-%").ilike("description", `%${businessId}%`);
}
