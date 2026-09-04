import type {
  BusinessProfile,
  Category,
  Customer,
  Product,
  Transaction,
  TransactionItem,
} from "@/types";
import { supabase } from "@/lib/beannel/supabase";
import { newId } from "@/lib/apex/money";
import type { ApexSnapshot } from "@/lib/apex/db";
import { parseShopMeta } from "@/lib/beannel/shop-meta";

function fail(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

const PIN_PREFIX = "beannel_pin_";

export function loadLocalPin(businessId: string): Pick<BusinessProfile, "ownerPin" | "isPinLocked"> {
  if (typeof window === "undefined") return { ownerPin: "1234", isPinLocked: false };
  try {
    const raw = localStorage.getItem(PIN_PREFIX + businessId);
    if (!raw) return { ownerPin: "1234", isPinLocked: false };
    const parsed = JSON.parse(raw) as { ownerPin?: string; isPinLocked?: boolean };
    return {
      ownerPin: parsed.ownerPin || "1234",
      isPinLocked: Boolean(parsed.isPinLocked),
    };
  } catch {
    return { ownerPin: "1234", isPinLocked: false };
  }
}

export function saveLocalPin(
  businessId: string,
  pin: Pick<BusinessProfile, "ownerPin" | "isPinLocked">,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    PIN_PREFIX + businessId,
    JSON.stringify({ ownerPin: pin.ownerPin, isPinLocked: pin.isPinLocked }),
  );
}

function mapProduct(d: Record<string, unknown>): Product {
  const { meta, notes } = parseShopMeta(d.notes ? String(d.notes) : "");
  return {
    id: String(d.id),
    name: String(d.name || "Product"),
    sku: String(d.sku || ""),
    category: String(d.category || "Apparels"),
    buyPrice: Number(d.buy_price) || 0,
    sellPrice: Number(d.sell_price) || 0,
    stockQuantity: Number(d.stock_quantity) || 0,
    minStockThreshold: Number(d.min_stock_threshold) || 5,
    unit: String(d.unit || "pcs"),
    barcode: d.barcode ? String(d.barcode) : "",
    notes,
    createdAt: String(d.created_at || new Date().toISOString()),
    updatedAt: String(d.updated_at || new Date().toISOString()),
    size: meta.size || "",
    garmentType: meta.garmentType || "",
    imageUrl: meta.imageUrl || "",
    listed: meta.listed !== false,
  };
}

function mapCategory(c: Record<string, unknown>): Category {
  return {
    id: String(c.id),
    name: String(c.name),
    color: c.color ? String(c.color) : "#5B8DEF",
    businessId: c.business_id ? String(c.business_id) : undefined,
  };
}

function mapTransaction(t: Record<string, unknown>): Transaction {
  return {
    id: String(t.id),
    type: t.type as Transaction["type"],
    amount: Number(t.amount) || 0,
    cogs: t.cogs != null ? Number(t.cogs) : undefined,
    grossProfit: t.gross_profit != null ? Number(t.gross_profit) : undefined,
    netProfit: t.net_profit != null ? Number(t.net_profit) : undefined,
    date: String(t.date || new Date().toISOString()),
    description: String(t.description || ""),
    category: t.category ? String(t.category) : undefined,
    paymentMethod: (t.payment_method as Transaction["paymentMethod"]) || undefined,
    referenceNo: t.reference_no ? String(t.reference_no) : undefined,
    customerName: t.customer_name ? String(t.customer_name) : undefined,
    customerId: t.customer_id ? String(t.customer_id) : undefined,
    items: Array.isArray(t.items) ? (t.items as TransactionItem[]) : [],
    createdAt: String(t.created_at || new Date().toISOString()),
  };
}

function mapCustomer(c: Record<string, unknown>): Customer {
  return {
    id: String(c.id),
    name: String(c.name || "Customer"),
    phone: String(c.phone || ""),
    email: String(c.email || ""),
    loyaltyPoints: Number(c.loyalty_points) || 0,
    totalSpent: Number(c.total_spent) || 0,
    orderCount: Number(c.order_count) || 0,
    debtBalance: Number(c.debt_balance) || 0,
    tier: (c.tier as Customer["tier"]) || "Bronze",
    lastVisit: String(c.last_visit || "Just now"),
    notes: c.notes ? String(c.notes) : "",
    createdAt: String(c.created_at || new Date().toISOString()),
    updatedAt: String(c.updated_at || new Date().toISOString()),
  };
}

export const EMPTY_PROFILE: BusinessProfile = {
  businessName: "BEANNEL",
  ownerName: "Store Owner",
  currencySymbol: "$",
  ownerPin: "1234",
  isPinLocked: false,
  taxRate: 0,
  lowStockAlertEnabled: true,
  allowNegativeStock: false,
  receiptHeaderMsg: "Thank you for shopping with us!",
  whatsappNumber: "",
  shopTagline: "Clothes · Jewelry · Watches · Fashion",
};

export function emptySnapshot(profile: BusinessProfile = EMPTY_PROFILE): ApexSnapshot {
  return {
    products: [],
    categories: [],
    transactions: [],
    customers: [],
    profile,
  };
}

export async function loadWorkspace(businessId: string): Promise<ApexSnapshot> {
  const pin = loadLocalPin(businessId);

  const [bizRes, catRes, prodRes, txRes, custRes] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
    supabase.from("categories").select("*").eq("business_id", businessId).order("name"),
    supabase.from("products").select("*").eq("business_id", businessId).order("updated_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("*")
      .eq("business_id", businessId)
      .order("date", { ascending: false })
      .limit(2000),
    supabase.from("customers").select("*").eq("business_id", businessId).order("updated_at", { ascending: false }),
  ]);

  fail(bizRes.error, "Load business");
  fail(catRes.error, "Load categories");
  fail(prodRes.error, "Load products");
  fail(txRes.error, "Load ledger");
  fail(custRes.error, "Load customers");

  const biz = bizRes.data as Record<string, unknown> | null;
  const profile: BusinessProfile = {
    businessName: biz?.name ? String(biz.name) : "BEANNEL",
    ownerName: biz?.owner_name ? String(biz.owner_name) : "Store Owner",
    currencySymbol: biz?.currency_symbol ? String(biz.currency_symbol) : "$",
    ownerPin: pin.ownerPin,
    isPinLocked: pin.isPinLocked,
    taxRate: Number(biz?.tax_rate) || 0,
    lowStockAlertEnabled: biz?.low_stock_alert_enabled !== false,
    allowNegativeStock: Boolean(biz?.allow_negative_stock),
    receiptHeaderMsg: biz?.receipt_header_msg
      ? String(biz.receipt_header_msg)
      : "Thank you for shopping with us!",
  };

  return {
    products: (prodRes.data || []).map((row) => mapProduct(row as Record<string, unknown>)),
    categories: (catRes.data || []).map((row) => mapCategory(row as Record<string, unknown>)),
    transactions: (txRes.data || []).map((row) => mapTransaction(row as Record<string, unknown>)),
    customers: (custRes.data || []).map((row) => mapCustomer(row as Record<string, unknown>)),
    profile,
  };
}

async function upsertCategory(businessId: string, name: string, existing: Category[]): Promise<void> {
  const trimmed = name.trim() || "Apparels";
  const found = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  const id = found?.id || `cat-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${Date.now().toString(36)}`;
  const { error } = await supabase.from("categories").upsert(
    {
      id,
      business_id: businessId,
      name: trimmed,
      color: found?.color || "#C4A35A",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  fail(error, "Save category");
}

export async function persistProduct(
  businessId: string,
  product: Product,
  categories: Category[],
): Promise<void> {
  await upsertCategory(businessId, product.category, categories);
  const { error } = await supabase.from("products").upsert(
    {
      id: product.id,
      business_id: businessId,
      name: product.name,
      sku: product.sku,
      category: product.category,
      buy_price: product.buyPrice,
      sell_price: product.sellPrice,
      stock_quantity: product.stockQuantity,
      min_stock_threshold: product.minStockThreshold,
      unit: product.unit,
      barcode: product.barcode || "",
      notes: product.notes || "",
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    },
    { onConflict: "id" },
  );
  fail(error, "Save product");
}

export async function persistDeleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  fail(error, "Delete product");
}

export async function persistCustomer(businessId: string, customer: Customer): Promise<void> {
  const { error } = await supabase.from("customers").upsert(
    {
      id: customer.id,
      business_id: businessId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      loyalty_points: customer.loyaltyPoints,
      total_spent: customer.totalSpent,
      order_count: customer.orderCount,
      debt_balance: customer.debtBalance,
      tier: customer.tier,
      last_visit: customer.lastVisit,
      notes: customer.notes || "",
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    },
    { onConflict: "id" },
  );
  fail(error, "Save customer");
}

export async function persistDeleteCustomer(customerId: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  fail(error, "Delete customer");
}

export async function persistSettleDebt(customerId: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ debt_balance: 0, updated_at: new Date().toISOString() })
    .eq("id", customerId);
  fail(error, "Settle debt");
}

export async function persistProfile(businessId: string, profile: BusinessProfile): Promise<void> {
  saveLocalPin(businessId, profile);
  const { error } = await supabase
    .from("businesses")
    .update({
      name: profile.businessName,
      owner_name: profile.ownerName,
      currency_symbol: profile.currencySymbol,
      tax_rate: profile.taxRate,
      low_stock_alert_enabled: profile.lowStockAlertEnabled,
      allow_negative_stock: profile.allowNegativeStock,
      receipt_header_msg: profile.receiptHeaderMsg,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);
  fail(error, "Save business profile");
}

export async function persistDeleteTransaction(txId: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", txId);
  fail(error, "Delete transaction");
}

export async function persistSale(args: {
  businessId: string;
  userId: string;
  transaction: Transaction;
  items: TransactionItem[];
  products: Product[];
  changedCustomers: Customer[];
  discount: number;
  subtotal: number;
}): Promise<void> {
  const now = args.transaction.date;
  const txId = args.transaction.id;

  for (const customer of args.changedCustomers) {
    await persistCustomer(args.businessId, customer);
  }

  const saleInsert = await supabase.from("sales").insert({
    id: txId,
    business_id: args.businessId,
    customer_id: args.transaction.customerId || null,
    user_id: args.userId,
    reference_no: txId,
    sale_date: now,
    subtotal: args.subtotal,
    discount: args.discount,
    tax: 0,
    total: args.transaction.amount,
    cogs: args.transaction.cogs || 0,
    gross_profit: args.transaction.grossProfit || 0,
    payment_method: args.transaction.paymentMethod || "cash",
    payment_status: "paid",
    customer_name: args.transaction.customerName || "Walk-in Customer",
    notes: args.transaction.description || "",
    created_at: now,
    updated_at: now,
  });
  fail(saleInsert.error, "Record sale");

  if (args.items.length > 0) {
    const itemsInsert = await supabase.from("sale_items").insert(
      args.items.map((item) => ({
        sale_id: txId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitSellPrice,
        cost_price: item.unitBuyPrice,
        line_total: item.totalSellPrice,
        line_cogs: item.totalBuyPrice,
        created_at: now,
      })),
    );
    fail(itemsInsert.error, "Record sale items");
  }

  for (const item of args.items) {
    const prod = args.products.find((p) => p.id === item.productId);
    if (prod) {
      const stockUpdate = await supabase
        .from("products")
        .update({ stock_quantity: prod.stockQuantity, updated_at: now })
        .eq("id", prod.id);
      fail(stockUpdate.error, `Update stock for ${prod.name}`);
    }
    const mov = await supabase.from("stock_movements").insert({
      id: newId("mov"),
      business_id: args.businessId,
      product_id: item.productId,
      product_name: item.productName,
      type: "out",
      quantity: item.quantity,
      cost_per_unit: item.unitBuyPrice,
      reference_id: txId,
      reason: `Sale ${txId}`,
      date: now,
      created_at: now,
    });
    fail(mov.error, "Record stock movement");
  }

  const txInsert = await supabase.from("transactions").insert({
    id: txId,
    business_id: args.businessId,
    type: "sale",
    amount: args.transaction.amount,
    cogs: args.transaction.cogs || 0,
    gross_profit: args.transaction.grossProfit || 0,
    net_profit: args.transaction.netProfit || 0,
    date: now,
    description: args.transaction.description,
    payment_method: args.transaction.paymentMethod,
    customer_name: args.transaction.customerName,
    customer_id: args.transaction.customerId || "",
    related_sale_id: txId,
    items: args.transaction.items,
    created_at: now,
  });
  fail(txInsert.error, "Record sale in ledger");
}

export async function persistExpense(args: {
  businessId: string;
  userId: string;
  transaction: Transaction;
}): Promise<void> {
  const now = args.transaction.date;
  const exp = await supabase.from("expenses").insert({
    id: args.transaction.id,
    business_id: args.businessId,
    user_id: args.userId,
    category: args.transaction.category || "General Expense",
    amount: args.transaction.amount,
    description: args.transaction.description,
    payment_method: args.transaction.paymentMethod || "cash",
    date: now,
    reference_no: args.transaction.id,
    created_at: now,
    updated_at: now,
  });
  fail(exp.error, "Record expense");

  const tx = await supabase.from("transactions").insert({
    id: args.transaction.id,
    business_id: args.businessId,
    type: "expense",
    amount: args.transaction.amount,
    net_profit: args.transaction.netProfit,
    date: now,
    description: args.transaction.description,
    category: args.transaction.category,
    payment_method: args.transaction.paymentMethod,
    related_expense_id: args.transaction.id,
    created_at: now,
  });
  fail(tx.error, "Record expense in ledger");
}

export async function persistCapital(args: {
  businessId: string;
  userId: string;
  transaction: Transaction;
}): Promise<void> {
  const now = args.transaction.date;
  const cap = await supabase.from("owner_capital").insert({
    id: args.transaction.id,
    business_id: args.businessId,
    user_id: args.userId,
    type: "contribution",
    amount: args.transaction.amount,
    description: args.transaction.description,
    date: now,
    payment_method: args.transaction.paymentMethod || "transfer",
    created_at: now,
  });
  fail(cap.error, "Record capital");

  const tx = await supabase.from("transactions").insert({
    id: args.transaction.id,
    business_id: args.businessId,
    type: "capital",
    amount: args.transaction.amount,
    date: now,
    description: args.transaction.description,
    payment_method: args.transaction.paymentMethod,
    created_at: now,
  });
  fail(tx.error, "Record capital in ledger");
}

export async function persistStockRefill(args: {
  businessId: string;
  userId: string;
  transaction: Transaction;
  product: Product;
  quantityToAdd: number;
  costPerUnit: number;
}): Promise<void> {
  const now = args.transaction.date;
  const stock = await supabase
    .from("products")
    .update({
      stock_quantity: args.product.stockQuantity,
      buy_price: args.product.buyPrice,
      updated_at: now,
    })
    .eq("id", args.product.id);
  fail(stock.error, "Update stock quantity");

  const purchase = await supabase.from("purchases").insert({
    id: args.transaction.id,
    business_id: args.businessId,
    user_id: args.userId,
    reference_no: args.transaction.id,
    purchase_date: now,
    subtotal: args.transaction.amount,
    tax: 0,
    total: args.transaction.amount,
    payment_status: "paid",
    payment_method: "cash",
    notes: args.transaction.description,
    created_at: now,
    updated_at: now,
  });
  fail(purchase.error, "Record purchase");

  const item = await supabase.from("purchase_items").insert({
    purchase_id: args.transaction.id,
    product_id: args.product.id,
    product_name: args.product.name,
    quantity: args.quantityToAdd,
    unit_cost: args.costPerUnit,
    line_total: args.transaction.amount,
    created_at: now,
  });
  fail(item.error, "Record purchase item");

  const tx = await supabase.from("transactions").insert({
    id: args.transaction.id,
    business_id: args.businessId,
    type: "stock_refill",
    amount: args.transaction.amount,
    date: now,
    description: args.transaction.description,
    related_purchase_id: args.transaction.id,
    created_at: now,
  });
  fail(tx.error, "Record refill in ledger");

  const mov = await supabase.from("stock_movements").insert({
    id: newId("mov"),
    business_id: args.businessId,
    product_id: args.product.id,
    product_name: args.product.name,
    type: "in",
    quantity: args.quantityToAdd,
    cost_per_unit: args.costPerUnit,
    reason: "Stock refill",
    reference_id: args.transaction.id,
    date: now,
    created_at: now,
  });
  fail(mov.error, "Record refill movement");
}

export async function persistWipe(businessId: string): Promise<void> {
  const { wipeShopPublic } = await import("@/lib/beannel/shop");
  await wipeShopPublic(businessId);
  const tables = [
    "sales",
    "purchases",
    "expenses",
    "owner_capital",
    "stock_movements",
    "transactions",
    "products",
    "customers",
    "categories",
  ] as const;
  const results = await Promise.all(
    tables.map((table) => supabase.from(table).delete().eq("business_id", businessId)),
  );
  const failed = results.find((r) => r.error);
  fail(failed?.error ?? null, "Clear workspace");
}
