import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type {
  BusinessProfile,
  Customer,
  FinancialSummary,
  Product,
  Transaction,
  TransactionItem,
} from "@/types";
import {
  type ApexSnapshot,
  deleteCustomerOn,
  deleteProductOn,
  deleteTransactionOn,
  recordCapitalOn,
  recordExpenseOn,
  recordSaleOn,
  recordStockRefillOn,
  saveCustomerOn,
  saveProductOn,
  saveProfileOn,
  settleDebtOn,
  wipeBusiness,
} from "@/lib/apex/db";
import { computeSummary, filterTransactions } from "@/lib/apex/summary";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { isOfficeRole, OWNER_EMAIL } from "@/lib/beannel/account";
import { mergeCatalog } from "@/lib/beannel/catalog";
import type { OrderStatus, ShopOrder } from "@/lib/beannel/commerce";
import {
  cancelShopOrder as cancelShopOrderRemote,
  fetchShopInbox,
  fetchShopStorefront,
  markShopOrderClaimed,
  persistShopInfo,
  publishListing,
  subscribeShopOrders,
  unpublishListing,
  updateShopOrderStatus,
} from "@/lib/beannel/shop";
import {
  EMPTY_PROFILE,
  emptySnapshot,
  loadWorkspace,
  persistCapital,
  persistCustomer,
  persistDeleteCustomer,
  persistDeleteProduct,
  persistDeleteTransaction,
  persistExpense,
  persistProduct,
  persistProfile,
  persistSale,
  persistSettleDebt,
  persistStockRefill,
  persistWipe,
} from "@/lib/beannel/cloud";

export type PeriodPreset = "today" | "week" | "month" | "all";

interface ApexStoreValue {
  ready: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  products: Product[];
  categories: ApexSnapshot["categories"];
  transactions: Transaction[];
  customers: Customer[];
  profile: BusinessProfile;
  shopOrders: ShopOrder[];
  pendingShopCount: number;
  period: PeriodPreset;
  setPeriod: (p: PeriodPreset) => void;
  periodTransactions: Transaction[];
  summary: FinancialSummary;
  periodSummary: FinancialSummary;
  isOwnerUnlocked: boolean;
  setOwnerUnlocked: (v: boolean) => void;
  recordSale: (sale: {
    items: TransactionItem[];
    customerName?: string;
    customerId?: string;
    paymentMethod: Transaction["paymentMethod"];
    description?: string;
    discountAmount?: number;
  }) => Promise<Transaction>;
  recordExpense: (data: {
    amount: number;
    category: string;
    description: string;
    paymentMethod?: Transaction["paymentMethod"];
  }) => Promise<void>;
  recordCapital: (data: {
    amount: number;
    description: string;
    paymentMethod?: Transaction["paymentMethod"];
  }) => Promise<void>;
  recordStockRefill: (data: {
    productId: string;
    quantityToAdd: number;
    costPerUnit?: number;
  }) => Promise<void>;
  saveProduct: (p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveCustomer: (c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  settleDebt: (id: string) => Promise<void>;
  saveProfile: (p: Partial<BusinessProfile>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  wipeAll: () => Promise<void>;
  claimShopOrder: (orderId: string) => Promise<void>;
  advanceShopOrder: (orderId: string, status: OrderStatus) => Promise<void>;
  cancelShopOrder: (orderId: string) => Promise<void>;
}

const ApexStoreContext = createContext<ApexStoreValue | null>(null);

function changedCustomers(prev: Customer[], next: Customer[]): Customer[] {
  return next.filter((c) => {
    const old = prev.find((p) => p.id === c.id);
    if (!old) return true;
    return (
      old.loyaltyPoints !== c.loyaltyPoints ||
      old.totalSpent !== c.totalSpent ||
      old.orderCount !== c.orderCount ||
      old.debtBalance !== c.debtBalance ||
      old.name !== c.name
    );
  });
}

export function ApexStoreProvider({ children }: { children: ReactNode }) {
  const { user, businessId, role, isLoading: authLoading } = useBeannelAuth();
  const [snapshot, setSnapshot] = useState<ApexSnapshot>(emptySnapshot());
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [period, setPeriod] = useState<PeriodPreset>("week");
  const [isOwnerUnlocked, setOwnerUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const claimingRef = useRef(false);

  const applySaleFromOrder = useCallback(
    async (order: ShopOrder, biz: string, userId: string, current: ApexSnapshot) => {
      const items = order.items.map((item) => {
        const prod = current.products.find((p) => p.id === item.productId);
        const unitBuy = prod?.buyPrice || 0;
        return {
          ...item,
          unitBuyPrice: unitBuy,
          totalBuyPrice: unitBuy * item.quantity,
        };
      });
      const result = recordSaleOn(current, {
        items,
        customerName: order.name,
        paymentMethod: order.payment,
        description: `Online · ${order.name} · ${order.phone}${order.address ? ` · ${order.address}` : ""}`,
      });
      const subtotal = items.reduce((s, i) => s + i.totalSellPrice, 0);
      await persistSale({
        businessId: biz,
        userId,
        transaction: result.transaction,
        items,
        products: result.snapshot.products,
        changedCustomers: changedCustomers(current.customers, result.snapshot.customers),
        discount: 0,
        subtotal,
      });
      await markShopOrderClaimed(order.id, result.transaction.id);
      const touched = new Set(items.map((i) => i.productId));
      for (const id of touched) {
        const prod = result.snapshot.products.find((p) => p.id === id);
        if (prod) await publishListing(biz, prod).catch(() => undefined);
      }
      return result.snapshot;
    },
    [],
  );

  const reload = useCallback(async () => {
    if (!user) {
      setSnapshot(emptySnapshot());
      setShopOrders([]);
      setLoadError(null);
      setReady(true);
      setOwnerUnlocked(false);
      return;
    }
    if (!isOfficeRole(role) || !businessId) {
      setSnapshot(emptySnapshot());
      setShopOrders([]);
      setLoadError(null);
      setReady(true);
      setOwnerUnlocked(false);
      return;
    }
    setReady(false);
    setLoadError(null);
    try {
      const data = await loadWorkspace(businessId);
      const storefront = await fetchShopStorefront().catch(() => null);
      let next = data;
      const whatsapp = storefront?.businessId === businessId || storefront?.whatsapp ? storefront?.whatsapp : "";
      next = {
        ...next,
        profile: {
          ...next.profile,
          whatsappNumber: whatsapp || next.profile.whatsappNumber || "",
          shopTagline: storefront?.tagline || next.profile.shopTagline,
        },
      };
      await persistShopInfo(businessId, {
        name: next.profile.businessName,
        tagline: next.profile.shopTagline,
        currency: next.profile.currencySymbol,
        whatsapp: next.profile.whatsappNumber || "",
        ownerEmail: OWNER_EMAIL,
      }).catch(() => undefined);

      const inbox = await fetchShopInbox(businessId).catch(() => []);
      if (!claimingRef.current) {
        claimingRef.current = true;
        try {
          for (const order of inbox) {
            if (order.claimed || order.status !== "placed") continue;
            try {
              next = await applySaleFromOrder(order, businessId, user.id, next);
            } catch {
              /* leave unclaimed */
            }
          }
        } finally {
          claimingRef.current = false;
        }
      }

      await Promise.all(
        next.products
          .filter((p) => p.listed !== false && p.sellPrice > 0)
          .map((p) => publishListing(businessId, p).catch(() => undefined)),
      );
      const orders = await fetchShopInbox(businessId).catch(() => inbox);
      setShopOrders(orders);
      snapshotRef.current = next;
      setSnapshot(next);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load workspace.");
      snapshotRef.current = emptySnapshot();
      setSnapshot(emptySnapshot());
      setShopOrders([]);
    } finally {
      setReady(true);
    }
  }, [user, businessId, role, applySaleFromOrder]);

  useEffect(() => {
    if (authLoading) {
      setReady(false);
      return;
    }
    void reload();
  }, [authLoading, reload]);

  useEffect(() => {
    if (!user || !businessId || !isOfficeRole(role)) return;
    let silent = false;
    const unsub = subscribeShopOrders(() => {
      if (silent) return;
      silent = true;
      void fetchShopInbox(businessId)
        .then((orders) => {
          setShopOrders(orders);
          const fresh = orders.filter((o) => o.status === "placed" && !o.claimed);
          if (fresh.length) {
            toast.message(`${fresh.length} new shop order${fresh.length === 1 ? "" : "s"}`);
            void reload();
          }
        })
        .finally(() => {
          silent = false;
        });
    });
    return unsub;
  }, [user, businessId, reload]);

  const requireSession = () => {
    if (!user || !businessId) throw new Error("Sign in required.");
    return { userId: user.id, businessId };
  };

  const products = snapshot.products;
  const categories = useMemo(() => mergeCatalog(snapshot.categories), [snapshot.categories]);
  const transactions = snapshot.transactions;
  const customers = snapshot.customers;
  const profile = snapshot.profile;
  const pendingShopCount = useMemo(
    () => shopOrders.filter((o) => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "refunded").length,
    [shopOrders],
  );

  const periodTransactions = useMemo(
    () => filterTransactions(transactions, period),
    [transactions, period],
  );
  const summary = useMemo(() => computeSummary(transactions, products), [transactions, products]);
  const periodSummary = useMemo(
    () => computeSummary(periodTransactions, products),
    [periodTransactions, products],
  );

  const recordSale = useCallback(
    async (sale: Parameters<ApexStoreValue["recordSale"]>[0]) => {
      const { userId, businessId: biz } = requireSession();
      const current = snapshotRef.current;
      const result = recordSaleOn(current, sale);
      const subtotal = sale.items.reduce((s, i) => s + i.totalSellPrice, 0);
      await persistSale({
        businessId: biz,
        userId,
        transaction: result.transaction,
        items: sale.items,
        products: result.snapshot.products,
        changedCustomers: changedCustomers(current.customers, result.snapshot.customers),
        discount: sale.discountAmount || 0,
        subtotal,
      });
      snapshotRef.current = result.snapshot;
      setSnapshot(result.snapshot);
      return result.transaction;
    },
    [user, businessId],
  );

  const recordExpense = useCallback(
    async (data: Parameters<ApexStoreValue["recordExpense"]>[0]) => {
      const { userId, businessId: biz } = requireSession();
      const next = recordExpenseOn(snapshotRef.current, data);
      await persistExpense({
        businessId: biz,
        userId,
        transaction: next.transactions[0],
      });
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const recordCapital = useCallback(
    async (data: Parameters<ApexStoreValue["recordCapital"]>[0]) => {
      const { userId, businessId: biz } = requireSession();
      const next = recordCapitalOn(snapshotRef.current, data);
      await persistCapital({
        businessId: biz,
        userId,
        transaction: next.transactions[0],
      });
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const recordStockRefill = useCallback(
    async (data: Parameters<ApexStoreValue["recordStockRefill"]>[0]) => {
      const { userId, businessId: biz } = requireSession();
      const current = snapshotRef.current;
      const next = recordStockRefillOn(current, data);
      const product = next.products.find((p) => p.id === data.productId);
      if (!product) throw new Error("Product not found.");
      await persistStockRefill({
        businessId: biz,
        userId,
        transaction: next.transactions[0],
        product,
        quantityToAdd: data.quantityToAdd,
        costPerUnit: data.costPerUnit || product.buyPrice,
      });
      await publishListing(biz, product).catch(() => undefined);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const saveProduct = useCallback(
    async (p: Partial<Product>) => {
      const { businessId: biz } = requireSession();
      const next = saveProductOn(snapshotRef.current, p);
      const saved = next.products.find((x) => x.id === (p.id || next.products[0]?.id));
      if (!saved) throw new Error("Product was not saved.");
      await persistProduct(biz, saved, next.categories);
      await publishListing(biz, saved).catch(() => undefined);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      requireSession();
      await persistDeleteProduct(id);
      await unpublishListing(id).catch(() => undefined);
      const next = deleteProductOn(snapshotRef.current, id);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const saveCustomer = useCallback(
    async (c: Partial<Customer>) => {
      const { businessId: biz } = requireSession();
      const next = saveCustomerOn(snapshotRef.current, c);
      const saved = next.customers.find((x) => x.id === (c.id || next.customers[0]?.id));
      if (!saved) throw new Error("Customer was not saved.");
      await persistCustomer(biz, saved);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      requireSession();
      await persistDeleteCustomer(id);
      const next = deleteCustomerOn(snapshotRef.current, id);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const settleDebt = useCallback(
    async (id: string) => {
      requireSession();
      await persistSettleDebt(id);
      const next = settleDebtOn(snapshotRef.current, id);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const saveProfile = useCallback(
    async (p: Partial<BusinessProfile>) => {
      const { businessId: biz } = requireSession();
      const next = saveProfileOn(snapshotRef.current, p);
      await persistProfile(biz, next.profile);
      await persistShopInfo(biz, {
        name: next.profile.businessName,
        tagline: next.profile.shopTagline,
        currency: next.profile.currencySymbol,
        whatsapp: next.profile.whatsappNumber || "",
      }).catch(() => undefined);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      requireSession();
      await persistDeleteTransaction(id);
      const next = deleteTransactionOn(snapshotRef.current, id);
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [user, businessId],
  );

  const wipeAll = useCallback(async () => {
    const { businessId: biz } = requireSession();
    await persistWipe(biz);
    const next = wipeBusiness(snapshotRef.current.profile);
    snapshotRef.current = next;
    setSnapshot(next);
    setShopOrders([]);
  }, [user, businessId]);

  const claimShopOrder = useCallback(
    async (orderId: string) => {
      const { userId, businessId: biz } = requireSession();
      const order = shopOrders.find((o) => o.id === orderId);
      if (!order) throw new Error("Order not found.");
      if (order.claimed && order.status !== "placed") return;
      const next = await applySaleFromOrder(order, biz, userId, snapshotRef.current);
      snapshotRef.current = next;
      setSnapshot(next);
      const orders = await fetchShopInbox(biz);
      setShopOrders(orders);
    },
    [user, businessId, shopOrders, applySaleFromOrder],
  );

  const advanceShopOrder = useCallback(
    async (orderId: string, status: OrderStatus) => {
      requireSession();
      if (status === "confirmed") {
        await claimShopOrder(orderId);
        return;
      }
      const updated = await updateShopOrderStatus(orderId, status);
      setShopOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    },
    [user, businessId, claimShopOrder],
  );

  const cancelShopOrder = useCallback(
    async (orderId: string) => {
      requireSession();
      const updated = await cancelShopOrderRemote(orderId);
      setShopOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    },
    [user, businessId],
  );

  const value: ApexStoreValue = {
    ready,
    loadError,
    reload,
    products,
    categories,
    transactions,
    customers,
    profile: profile.businessName ? profile : { ...EMPTY_PROFILE, ...profile },
    shopOrders,
    pendingShopCount,
    period,
    setPeriod,
    periodTransactions,
    summary,
    periodSummary,
    isOwnerUnlocked,
    setOwnerUnlocked,
    recordSale,
    recordExpense,
    recordCapital,
    recordStockRefill,
    saveProduct,
    deleteProduct,
    saveCustomer,
    deleteCustomer,
    settleDebt,
    saveProfile,
    deleteTransaction,
    wipeAll,
    claimShopOrder,
    advanceShopOrder,
    cancelShopOrder,
  };

  return <ApexStoreContext.Provider value={value}>{children}</ApexStoreContext.Provider>;
}

export function useApex() {
  const ctx = useContext(ApexStoreContext);
  if (!ctx) throw new Error("useApex must be used within ApexStoreProvider");
  return ctx;
}
