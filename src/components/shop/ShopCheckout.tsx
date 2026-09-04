import { useNavigate, useSearch } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { money } from "@/lib/apex/money";
import { bagTotal, clearBag, useBag, type BagItem } from "@/lib/beannel/cart";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { readPaystackSecret } from "@/lib/beannel/keys";
import { startPaystackCheckout, verifyPaystackCheckout } from "@/lib/beannel/paystack";
import {
  fetchShopStorefront,
  orderMessage,
  placeShopOrder,
  whatsappHref,
  type ShopStorefront,
} from "@/lib/beannel/shop";

type Pay = "mobile_money" | "cash";
const DRAFT_KEY = "beannel_checkout_draft";

type Draft = {
  name: string;
  phone: string;
  address: string;
  payment: Pay;
  items: BagItem[];
};

function saveDraft(draft: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function ShopCheckout() {
  const items = useBag();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { reference?: string; trxref?: string };
  const { user, profile } = useBeannelAuth();
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [name, setName] = useState(profile?.fullName || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pay, setPay] = useState<Pay>("mobile_money");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) {
      void navigate({ to: "/login", search: { as: "customer", next: "/checkout" } });
    }
  }, [user, navigate]);

  useEffect(() => {
    void fetchShopStorefront().then(setStore).catch(() => undefined);
  }, []);

  useEffect(() => {
    const reference = search.reference || search.trxref;
    if (!reference || !user || orderId) return;
    const draft = readDraft();
    if (!draft) {
      toast.error("Could not find the order to finish after Paystack.");
      return;
    }
    let cancelled = false;
    (async () => {
      setBusy(true);
      setStatus("Confirming Paystack…");
      try {
        const verified = await verifyPaystackCheckout({
          data: { reference, secretKey: readPaystackSecret() },
        });
        if (!verified.ok) throw new Error(verified.error);
        const businessId = (await fetchShopStorefront()).businessId;
        if (!businessId) throw new Error("The shop is not taking orders yet.");
        const result = await placeShopOrder({
          businessId,
          customerName: draft.name,
          phone: draft.phone,
          address: draft.address,
          payment: "mobile_money",
          items: draft.items,
          userId: user.id,
        });
        if (cancelled) return;
        clearBag();
        clearDraft();
        setOrderId(result.orderId);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Paystack confirmation failed");
      } finally {
        if (!cancelled) {
          setBusy(false);
          setStatus("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search.reference, search.trxref, user, orderId]);

  const cur = store?.currency || "GH₵";
  const total = bagTotal();

  const place = async (payment: Pay, bag: BagItem[]) => {
    const businessId = store?.businessId || "";
    if (!businessId) throw new Error("The shop is not taking orders yet. Message us on WhatsApp.");
    if (!user) throw new Error("Sign in to check out.");
    return placeShopOrder({
      businessId,
      customerName: name,
      phone,
      address,
      payment,
      items: bag,
      userId: user.id,
    });
  };

  const submit = async () => {
    if (!items.length || !user) return;
    setBusy(true);
    try {
      if (pay === "mobile_money") {
        saveDraft({ name, phone, address, payment: pay, items });
        setStatus("Opening Paystack…");
        const started = await startPaystackCheckout({
          data: {
            email: user.email || `${phone}@pay.beannel.app`,
            amount: total,
            callbackUrl: `${window.location.origin}/checkout`,
            secretKey: readPaystackSecret(),
            metadata: { name, phone },
          },
        });
        if (!started.ok) throw new Error(started.error);
        window.location.assign(started.url);
        return;
      }
      const result = await place("cash", items);
      clearBag();
      clearDraft();
      setOrderId(result.orderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const sendWhatsapp = async () => {
    if (!items.length || !user) return;
    setBusy(true);
    try {
      const result = await place("cash", items);
      const text = orderMessage({
        store: store?.name || "BEANNEL",
        name,
        phone,
        address,
        items,
        total: money(total, cur),
        pay: "Cash on delivery",
      });
      window.open(whatsappHref(store?.whatsapp || "", text), "_blank", "noopener");
      clearBag();
      setOrderId(result.orderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send on WhatsApp");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  if (orderId) {
    return (
      <div className="shop-body shop-checkout-wrap">
        <p className="shop-kicker">BEANNEL</p>
        <h1 className="display-title text-[2rem] mt-1">Order received</h1>
        <p className="text-[15px] text-fg-muted mt-2 mb-5">
          The store has the ticket. It stays as “Order placed” until someone in the office confirms it. Track it from your account.
        </p>
        <Button className="w-full" onClick={() => void navigate({ to: "/track/$orderId", params: { orderId } })}>
          Track order
        </Button>
      </div>
    );
  }

  if (items.length === 0 && !(search.reference || search.trxref)) {
    return (
      <div className="shop-body shop-checkout-wrap">
        <p className="display-title text-[1.75rem] mb-5">Nothing to check out</p>
        <Button className="w-full" onClick={() => void navigate({ to: "/" })}>Browse the shop</Button>
      </div>
    );
  }

  return (
    <div className="shop-body shop-checkout-wrap">
      <h1 className="display-title text-[2rem] mb-1">Checkout</h1>
      <p className="text-[15px] text-fg-muted mb-5">
        Signed in as {user.email}. MoMo and card go through Paystack. Cash is collected on delivery.
      </p>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Your name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className="field" autoComplete="name" />
        </Field>
        <Field label="Phone">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="field"
            inputMode="tel"
            placeholder="0XX XXX XXXX"
            autoComplete="tel"
          />
        </Field>
        <Field label="Delivery area">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="field"
            placeholder="Neighbourhood, city"
            autoComplete="street-address"
          />
        </Field>
        <div>
          <p className="text-[13px] font-medium text-fg-muted mb-1.5">Pay</p>
          <div className="tag-row">
            <button type="button" className="tag-chip" data-active={pay === "mobile_money"} onClick={() => setPay("mobile_money")}>
              Paystack · MoMo
            </button>
            <button type="button" className="tag-chip" data-active={pay === "cash"} onClick={() => setPay("cash")}>
              Cash on delivery
            </button>
          </div>
        </div>

        <div className="shop-total">
          <span>
            {items.reduce((s, i) => s + i.qty, 0)} piece{items.length === 1 ? "" : "s"}
          </span>
          <span className="tabular font-semibold">{money(total, cur)}</span>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? status || "Sending…" : pay === "mobile_money" ? "Pay with Paystack" : "Place order"}
        </Button>
        {store?.whatsapp ? (
          <button type="button" className="shop-wa w-full" disabled={busy} onClick={() => void sendWhatsapp()}>
            <MessageCircle className="size-4" />
            Message the store on WhatsApp
          </button>
        ) : null}
      </form>
    </div>
  );
}
