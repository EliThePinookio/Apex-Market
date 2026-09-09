import { coverFor } from "@/lib/beannel/catalog";
import { supabase } from "@/lib/beannel/supabase";
import { newId } from "@/lib/apex/money";
import { sanitizeText } from "@/lib/beannel/guard";
import type { PaymentMethod, Product, TransactionItem } from "@/types";
import {
  listingIdFor,
  parseShopMeta,
  shopInfoId,
  slugProduct,
  sourceIdFromListing,
  waDigits,
  writeShopMeta,
  isShopVisible,
  type ShopMeta,
} from "@/lib/beannel/shop-meta";
import type { BagItem } from "@/lib/beannel/cart";
import {
  canTransition,
  isOrderStatus,
  parseOrderEnvelope,
  patchOrderEnvelope,
  writeOrderEnvelope,
  type OrderStatus,
  type ShopOrder,
} from "@/lib/beannel/commerce";

export type { ShopOrder } from "@/lib/beannel/commerce";

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
  audience?: string;
  image: string;
  listed: boolean;
  compareAt?: number;
  description?: string;
  images?: string[];
  vendor?: string;
  tags?: string[];
  updatedAt: string;
}

export interface ShopGroup {
  slug: string;
  name: string;
  category: string;
  garmentType: string;
  audience?: string;
  image: string;
  priceFrom: number;
  stock: number;
  variants: ShopListing[];
  compareAt?: number;
  description?: string;
  images?: string[];
  vendor?: string;
  tags?: string[];
  updatedAt: string;
}

export interface ShopStorefront {
  businessId: string;
  name: string;
  tagline: string;
  currency: string;
  whatsapp: string;
  ownerEmail: string;
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
        audience: item.audience || "unisex",
        image: item.image,
        priceFrom: item.price,
        stock: item.stock,
        variants: [item],
        compareAt: item.compareAt,
        description: item.description,
        images: item.images,
        vendor: item.vendor,
        tags: item.tags,
        updatedAt: item.updatedAt,
      });
      continue;
    }
    existing.variants.push(item);
    existing.stock += item.stock;
    existing.priceFrom = Math.min(existing.priceFrom, item.price);
    if (!existing.image && item.image) existing.image = item.image;
    if (!existing.description && item.description) existing.description = item.description;
    if ((!existing.images || existing.images.length === 0) && item.images?.length) existing.images = item.images;
    if (!existing.vendor && item.vendor) existing.vendor = item.vendor;
    if (item.compareAt && (!existing.compareAt || item.compareAt < existing.compareAt)) existing.compareAt = item.compareAt;
    if (item.updatedAt > existing.updatedAt) existing.updatedAt = item.updatedAt;
  }
  return [...map.values()];
}

function mapListing(row: Record<string, unknown>): ShopListing | null {
  const id = String(row.id || "");
  if (!id.startsWith("list-")) return null;
  const { meta, notes } = parseShopMeta(typeof row.notes === "string" ? row.notes : "");
  if (!isShopVisible(meta)) return null;
  const category = String(row.category || "Apparels");
  const images = (meta.images && meta.images.length ? meta.images : meta.imageUrl ? [meta.imageUrl] : []).filter(Boolean);
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
    audience: meta.audience || "unisex",
    image: listingImage({ ...meta, imageUrl: images[0] || meta.imageUrl }, category),
    listed: true,
    compareAt: meta.compareAt,
    description: notes,
    images,
    vendor: meta.vendor,
    tags: meta.tags,
    updatedAt: String(row.updated_at || ""),
  };
}

export function listingsFromProducts(products: Product[]): ShopListing[] {
  return products
    .filter((p) => {
      const { meta } = parseShopMeta(p.notes);
      return isShopVisible({ ...meta, listed: p.listed ?? meta.listed, status: p.status ?? meta.status }) && p.sellPrice > 0;
    })
    .map((p) => {
      const { meta, notes } = parseShopMeta(p.notes);
      const images = (p.images || meta.images || (p.imageUrl ? [p.imageUrl] : [])).filter(Boolean);
      return {
        listingId: listingIdFor(p.id),
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.sellPrice,
        stock: Math.max(0, p.stockQuantity),
        unit: p.unit,
        size: p.size || meta.size || "",
        garmentType: p.garmentType || meta.garmentType || "",
        audience: p.audience || meta.audience || "unisex",
        image: listingImage({ ...meta, imageUrl: p.imageUrl || images[0] || meta.imageUrl }, p.category),
        listed: true,
        compareAt: p.compareAt || meta.compareAt,
        description: notes,
        images,
        vendor: p.vendor || meta.vendor,
        tags: p.tags || meta.tags,
        updatedAt: p.updatedAt,
      };
    });
}

export async function fetchShopListings(): Promise<ShopListing[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,sku,category,sell_price,stock_quantity,unit,barcode,notes,updated_at")
    .like("id", "list-%")
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("shop listings", error.message);
    return [];
  }
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
    ownerEmail: "",
  };
  const { data, error } = await supabase
    .from("products")
    .select("id,name,notes,sku,updated_at")
    .eq("sku", INFO_SKU)
    .like("id", "info-%")
    .order("updated_at", { ascending: false });
  if (error || !data?.length) return fallback;
  const picked =
    data.find((row) => {
      const { meta } = parseShopMeta(typeof row.notes === "string" ? row.notes : "");
      return Boolean(meta.ownerEmail);
    }) || data[0];
  if (!picked) return fallback;
  const { meta, notes } = parseShopMeta(typeof picked.notes === "string" ? picked.notes : "");
  return {
    businessId: meta.businessId || String(picked.id).replace(/^info-/, ""),
    name: String(picked.name || fallback.name),
    tagline: notes || fallback.tagline,
    currency: meta.garmentType || fallback.currency,
    whatsapp: meta.size || "",
    ownerEmail: (meta.ownerEmail || "").trim().toLowerCase(),
  };
}

export async function publishListing(businessId: string, product: Product): Promise<void> {
  const { meta, notes } = parseShopMeta(product.notes);
  const listed = isShopVisible({
    ...meta,
    listed: product.listed ?? meta.listed,
    status: product.status ?? meta.status,
  });
  const id = listingIdFor(product.id);
  if (!listed || product.sellPrice <= 0) {
    await supabase.from("products").delete().eq("id", id);
    return;
  }
  const images = (product.images || meta.images || []).filter(Boolean);
  const imageUrl = product.imageUrl || images[0] || meta.imageUrl;
  const packed = writeShopMeta(notes, {
    size: product.size || meta.size,
    garmentType: product.garmentType || meta.garmentType,
    audience: product.audience || meta.audience,
    imageUrl,
    images: images.length ? images : imageUrl ? [imageUrl] : undefined,
    listed: true,
    status: "active",
    vendor: product.vendor || meta.vendor,
    tags: product.tags || meta.tags,
    compareAt: product.compareAt || meta.compareAt,
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
  info: { name: string; tagline?: string; currency: string; whatsapp: string; ownerEmail?: string },
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
        ownerEmail: info.ownerEmail,
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

function mapShopOrder(row: Record<string, unknown>): ShopOrder | null {
  const parsed = parseOrderEnvelope(String(row.description || ""));
  if (!parsed) return null;
  const items = Array.isArray(row.items) ? (row.items as TransactionItem[]) : [];
  const claimed = Boolean(parsed.saleId) || parsed.status !== "placed";
  const blob = `${row.id || ""} ${row.description || ""} ${row.customer_id || ""} ${parsed.userId}`;
  const telegram =
    parsed.userId.startsWith("tg:") ||
    parsed.userId.startsWith("uid:tg:") ||
    blob.toLowerCase().includes("uid:tg:") ||
    isTelegramSaleNotes(String(row.description || ""));
  return {
    id: String(row.id),
    businessId: parsed.businessId,
    customerId: parsed.userId || String(row.customer_id || ""),
    name: parsed.name || String(row.customer_name || "Customer"),
    phone: parsed.phone,
    address: parsed.address,
    payment: parsed.payment,
    items,
    amount: Number(row.amount) || 0,
    date: String(row.date || ""),
    status: parsed.status,
    claimed,
    saleId: parsed.saleId,
    updatedAt: parsed.updatedAt || String(row.date || ""),
    source: telegram ? "telegram" : "",
  };
}

function asPayment(raw: string): PaymentMethod {
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (v === "mobile_money" || v === "momo" || v === "mobile") return "mobile_money";
  if (v === "cash" || v === "cod" || v === "cash_on_delivery") return "cash";
  if (v === "card") return "card";
  if (v === "transfer" || v === "bank") return "transfer";
  return "other";
}

function isPosLedgerSale(id: string): boolean {
  return id.startsWith("tx-");
}

/** Mini App historically wrote Telegram checkouts to `sales` (not shop- transactions). */
function isTelegramSaleNotes(notes: string): boolean {
  const n = notes.toLowerCase();
  return (
    n.includes("source=telegram") ||
    n.includes("channel: telegram") ||
    n.includes("telegram mini app") ||
    n.includes("@beannelbot")
  );
}

function salePaymentStatusToOrder(status: string): OrderStatus {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "completed" || s === "success") return "confirmed";
  if (s === "refunded") return "refunded";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "placed";
}

function contactFromSaleNotes(notes: string, fallbackName: string): {
  name: string;
  phone: string;
  address: string;
  userId: string;
  status?: OrderStatus;
} {
  if (!notes) return { name: fallbackName, phone: "", address: "", userId: "" };
  const env = parseOrderEnvelope(notes);
  if (env) {
    return { name: env.name, phone: env.phone, address: env.address, userId: env.userId, status: env.status };
  }
  try {
    const j = JSON.parse(notes) as Record<string, unknown>;
    if (j && typeof j === "object") {
      const st = String(j.status || j.fulfillment || "");
      return {
        name: String(j.name || j.customer_name || j.full_name || fallbackName),
        phone: String(j.phone || j.tel || j.contact || ""),
        address: String(j.address || j.delivery_address || j.delivery || ""),
        userId: String(j.telegram_user_id || j.tg_id || j.user_id || j.uid || ""),
        status: isOrderStatus(st) ? st : undefined,
      };
    }
  } catch {
    /* plain text */
  }
  const phoneMatch = notes.match(/\+?\d[\d\s()-]{8,}\d/);
  const addrMatch = notes.match(/(?:deliver(?:y| to)?|address)\s*[:\-]\s*(.+)/i);
  return {
    name: fallbackName,
    phone: phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "") : "",
    address: addrMatch ? addrMatch[1].trim() : "",
    userId: "",
  };
}

function mapSaleItems(raw: unknown): TransactionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item || {}) as Record<string, unknown>;
    const qty = Number(row.quantity) || 1;
    const unitSell = Number(row.unit_price ?? row.unitSellPrice) || 0;
    const unitBuy = Number(row.cost_price ?? row.unitBuyPrice) || 0;
    return {
      productId: String(row.product_id || row.productId || ""),
      productName: String(row.product_name || row.productName || "Item"),
      quantity: qty,
      unitBuyPrice: unitBuy,
      unitSellPrice: unitSell,
      totalSellPrice: Number(row.line_total ?? row.totalSellPrice) || unitSell * qty,
      totalBuyPrice: Number(row.line_cogs ?? row.totalBuyPrice) || unitBuy * qty,
    };
  });
}

function mapSaleOrder(row: Record<string, unknown>): ShopOrder | null {
  const id = String(row.id || "");
  if (!id || isPosLedgerSale(id)) return null;
  const notes = String(row.notes || "");
  const payRaw = String(row.payment_method || "");
  if (payRaw.toLowerCase() !== "telegram" && !notes.toLowerCase().includes("source=telegram")) return null;
  const name = String(row.customer_name || "Customer");
  const contact = contactFromSaleNotes(notes, name);
  const status: OrderStatus = contact.status || salePaymentStatusToOrder(String(row.payment_status || ""));
  return {
    id,
    businessId: String(row.business_id || ""),
    customerId: contact.userId || String(row.customer_id || ""),
    name: contact.name || name,
    phone: contact.phone,
    address: contact.address,
    payment: asPayment(String(row.payment_method || "other")),
    items: mapSaleItems(row.sale_items ?? row.items),
    amount: Number(row.total ?? row.amount) || 0,
    date: String(row.sale_date || row.created_at || ""),
    status,
    claimed: status !== "placed",
    saleId: id,
    updatedAt: String(row.updated_at || row.sale_date || row.created_at || ""),
    source: "telegram",
  };
}

const SALE_SELECT =
  "id,business_id,customer_id,reference_no,sale_date,total,payment_method,payment_status,customer_name,notes,updated_at,created_at,sale_items(product_id,product_name,quantity,unit_price,cost_price,line_total,line_cogs)";

async function fetchSaleRows(businessId?: string): Promise<Record<string, unknown>[]> {
  let q = supabase.from("sales").select(SALE_SELECT).order("sale_date", { ascending: false }).limit(200);
  if (businessId) q = q.eq("business_id", businessId);
  const { data, error } = await q;
  if (error) {
    const plain = await supabase
      .from("sales")
      .select("id,business_id,customer_id,reference_no,sale_date,total,payment_method,payment_status,customer_name,notes,updated_at,created_at")
      .order("sale_date", { ascending: false })
      .limit(200);
    if (plain.error) throw new Error(plain.error.message);
    const rows = (plain.data || []) as Record<string, unknown>[];
    const filtered = businessId ? rows.filter((r) => String(r.business_id || "") === businessId) : rows;
    const ids = filtered.map((r) => String(r.id));
    if (!ids.length) return filtered;
    const items = await supabase.from("sale_items").select("sale_id,product_id,product_name,quantity,unit_price,cost_price,line_total,line_cogs").in("sale_id", ids);
    const bySale = new Map<string, Record<string, unknown>[]>();
    for (const item of (items.data || []) as Record<string, unknown>[]) {
      const sid = String(item.sale_id || "");
      const list = bySale.get(sid) || [];
      list.push(item);
      bySale.set(sid, list);
    }
    return filtered.map((row) => ({ ...row, sale_items: bySale.get(String(row.id)) || [] }));
  }
  return (data || []) as Record<string, unknown>[];
}

export async function placeShopOrder(args: {
  businessId: string;
  customerName: string;
  phone: string;
  address: string;
  payment: "mobile_money" | "cash" | "other";
  items: BagItem[];
  userId?: string;
}): Promise<{ orderId: string }> {
  const name = sanitizeText(args.customerName, 80);
  const phone = args.phone.replace(/\D/g, "").slice(0, 15);
  const address = sanitizeText(args.address, 200);
  if (name.length < 2) throw new Error("Please leave your name.");
  if (phone.length < 9) throw new Error("Please leave a working phone number.");
  if (address.length < 4) throw new Error("Please leave a delivery area so the rider can find you.");
  if (!args.items.length) throw new Error("Your bag is empty.");
  if (args.items.length > 30) throw new Error("Your bag is too large.");
  if (args.items.some((i) => i.qty < 1 || i.qty > 20)) throw new Error("Quantity is not allowed.");
  if (!args.userId) throw new Error("Sign in to check out.");
  if (!args.businessId) throw new Error("The shop is not taking orders yet.");

  const payload = args.items.map((item) => ({ listingId: item.listingId, qty: item.qty }));
  const { data, error } = await supabase.rpc("place_shop_order", {
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_payment: args.payment,
    p_business_id: args.businessId,
    p_items: payload,
  });
  if (!error && data) return { orderId: String(data) };
  if (error && !/could not find|does not exist|PGRST202/i.test(error.message)) {
    throw new Error(error.message.replace(/^place_shop_order:\s*/i, "") || "Could not send the order.");
  }

  return placeShopOrderLegacy({ ...args, customerName: name, phone, address, userId: args.userId });
}

async function placeShopOrderLegacy(args: {
  businessId: string;
  customerName: string;
  phone: string;
  address: string;
  payment: "mobile_money" | "cash" | "other";
  items: BagItem[];
  userId: string;
}): Promise<{ orderId: string }> {

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

  const now = new Date().toISOString();
  for (const item of args.items) {
    const listing = byId.get(item.listingId)!;
    const nextStock = listing.stock - item.qty;
    const { error } = await supabase
      .from("products")
      .update({ stock_quantity: nextStock, updated_at: now })
      .eq("id", listing.listingId);
    if (error) throw new Error(`Could not hold stock for ${item.name}.`);
  }

  const orderId = newId("shop");
  const description = writeOrderEnvelope({
    businessId: args.businessId,
    name: args.customerName,
    phone: args.phone,
    payment: args.payment,
    address: args.address,
    userId: args.userId,
    status: "placed",
    updatedAt: now,
  });

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
    customer_name: args.customerName,
    customer_id: null,
    reference_no: args.userId ? `SHOP-${args.userId}` : "SHOP",
    items: lines,
    created_at: now,
  });
  if (error) throw new Error(`Could not send the order: ${error.message}`);
  return { orderId };
}

async function fetchShopRows(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .like("id", "shop-%")
    .order("date", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("shop orders", error.message);
    return [];
  }
  return (data || []) as Record<string, unknown>[];
}

export async function fetchMyShopOrders(userId: string): Promise<ShopOrder[]> {
  if (!userId) return [];
  const rows = await fetchShopRows();
  const fromTx = rows
    .map(mapShopOrder)
    .filter((row): row is ShopOrder => row != null && row.customerId === userId);
  let fromSales: ShopOrder[] = [];
  try {
    const sales = await fetchSaleRows();
    fromSales = sales
      .map(mapSaleOrder)
      .filter((row): row is ShopOrder => row != null && row.customerId === userId);
  } catch {
    fromSales = [];
  }
  return mergeOrders(fromTx, fromSales);
}

export async function fetchShopInbox(businessId: string): Promise<ShopOrder[]> {
  const rows = await fetchShopRows();
  const orders = rows
    .map(mapShopOrder)
    .filter((row): row is ShopOrder => row != null);
  const mine = businessId
    ? orders.filter((row) => !row.businessId || row.businessId === businessId)
    : orders;
  const fromTx = mine.length ? mine : orders;
  let fromSales: ShopOrder[] = [];
  try {
    const sales = await fetchSaleRows(businessId);
    fromSales = sales.map(mapSaleOrder).filter((row): row is ShopOrder => row != null);
    if (businessId) fromSales = fromSales.filter((row) => !row.businessId || row.businessId === businessId);
  } catch (err) {
    console.warn("sales inbox", err);
  }
  return mergeOrders(fromTx, fromSales);
}

function withinTwoMin(a: string, b: string): boolean {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return false;
  return Math.abs(da - db) <= 2 * 60 * 1000;
}

function firstProductKey(order: ShopOrder): string {
  const item = order.items[0];
  return String(item?.productId || item?.productName || "").toLowerCase();
}

function isTwin(shop: ShopOrder, sale: ShopOrder): boolean {
  if (shop.saleId && shop.saleId === sale.id) return true;
  if (sale.saleId && (sale.saleId === shop.id || sale.saleId === shop.saleId)) return true;
  if (shop.id === sale.id) return true;
  if (Math.abs(shop.amount - sale.amount) > 0.009) return false;
  if (!withinTwoMin(shop.date, sale.date)) return false;
  if (shop.customerId && sale.customerId && shop.customerId === sale.customerId) return true;
  const phoneA = shop.phone.replace(/\D/g, "");
  const phoneB = sale.phone.replace(/\D/g, "");
  return Boolean(phoneA && phoneB && phoneA === phoneB && firstProductKey(shop) === firstProductKey(sale));
}

function mergeOrders(shopTx: ShopOrder[], sales: ShopOrder[]): ShopOrder[] {
  const primary = shopTx.map((order) => {
    const twin = sales.some((sale) => isTwin(order, sale));
    return twin ? { ...order, source: "telegram" as const } : order;
  });
  const extra = sales.filter((sale) => !shopTx.some((order) => isTwin(order, sale)));
  return [...primary, ...extra]
    .filter((order) => order.source === "telegram" || order.payment !== "other")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchShopOrder(orderId: string): Promise<ShopOrder | null> {
  const { data, error } = await supabase.from("transactions").select("*").eq("id", orderId).limit(1);
  if (!error && data?.[0]) {
    const mapped = mapShopOrder(data[0] as Record<string, unknown>);
    if (mapped) return mapped;
  }
  const sale = await supabase.from("sales").select(SALE_SELECT).eq("id", orderId).limit(1);
  if (sale.error || !sale.data?.[0]) {
    const plain = await supabase.from("sales").select("*").eq("id", orderId).limit(1);
    if (plain.error || !plain.data?.[0]) return null;
    const items = await supabase.from("sale_items").select("*").eq("sale_id", orderId);
    return mapSaleOrder({ ...(plain.data[0] as Record<string, unknown>), sale_items: items.data || [] });
  }
  return mapSaleOrder(sale.data[0] as Record<string, unknown>);
}

export async function updateShopOrderStatus(orderId: string, status: OrderStatus): Promise<ShopOrder> {
  const current = await fetchShopOrder(orderId);
  if (!current) throw new Error("Order not found.");
  if (current.status === status) return current;
  if (!canTransition(current.status, status)) {
    throw new Error(`Cannot move this order from ${current.status} to ${status}.`);
  }
  if (orderId.startsWith("shop-")) {
    const { data, error } = await supabase.from("transactions").select("description").eq("id", orderId).limit(1);
    if (error || !data?.[0]) throw new Error("Could not update the order.");
    const description = patchOrderEnvelope(String(data[0].description || ""), { status });
    const { error: upd } = await supabase.from("transactions").update({ description }).eq("id", orderId);
    if (upd) throw new Error(upd.message);
    return { ...current, status, updatedAt: new Date().toISOString(), claimed: current.claimed || status !== "placed" };
  }

  const notes = writeOrderEnvelope({
    businessId: current.businessId,
    name: current.name,
    phone: current.phone,
    payment: current.payment,
    address: current.address,
    userId: current.customerId,
    status,
    saleId: current.id,
    updatedAt: new Date().toISOString(),
  });
  const paymentStatus = status === "refunded" ? "refunded" : status === "cancelled" ? "pending" : "paid";
  const { error: upd } = await supabase
    .from("sales")
    .update({ notes, payment_status: paymentStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (upd) throw new Error(upd.message);
  return { ...current, status, claimed: true, saleId: current.id, updatedAt: new Date().toISOString() };
}

export async function markShopOrderClaimed(orderId: string, saleId: string): Promise<void> {
  const { data, error } = await supabase.from("transactions").select("description").eq("id", orderId).limit(1);
  if (error || !data?.[0]) throw new Error("Could not confirm the order.");
  const description = patchOrderEnvelope(String(data[0].description || ""), {
    status: "confirmed",
    saleId,
  });
  const { error: upd } = await supabase.from("transactions").update({ description }).eq("id", orderId);
  if (upd) throw new Error(upd.message);
}

export async function cancelShopOrder(orderId: string): Promise<ShopOrder> {
  const current = await fetchShopOrder(orderId);
  if (!current) throw new Error("Order not found.");
  if (current.status === "cancelled" || current.status === "refunded" || current.status === "delivered") {
    throw new Error("This order can no longer be cancelled.");
  }
  if (current.status === "placed" && !current.claimed && current.id.startsWith("shop-")) {
    for (const item of current.items) {
      const listingId = listingIdFor(item.productId);
      const { data } = await supabase.from("products").select("stock_quantity").eq("id", listingId).limit(1);
      const stock = Number(data?.[0]?.stock_quantity) || 0;
      await supabase
        .from("products")
        .update({ stock_quantity: stock + item.quantity, updated_at: new Date().toISOString() })
        .eq("id", listingId);
    }
  }
  return updateShopOrderStatus(orderId, "cancelled");
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

export function subscribeShopOrders(onChange: () => void): () => void {
  try {
    const channel = supabase
      .channel("beannel-shop-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        const row = (payload.new || payload.old) as { id?: string } | null;
        if (String(row?.id || "").startsWith("shop-")) onChange();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        onChange();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  } catch {
    return () => undefined;
  }
}

export function subscribeShopListings(onChange: () => void): () => void {
  const channel = supabase
    .channel("beannel-shop-listings")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
      const row = (payload.new || payload.old) as { id?: string } | null;
      if (String(row?.id || "").startsWith("list-")) onChange();
    })
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
