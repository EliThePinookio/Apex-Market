import { useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { money } from "@/lib/apex/money";
import { bagTotal, clearBag, useBag } from "@/lib/beannel/cart";
import {
  fetchShopStorefront,
  orderMessage,
  placeShopOrder,
  whatsappHref,
  type ShopStorefront,
} from "@/lib/beannel/shop";

type Pay = "mobile_money" | "cash" | "other";

export function ShopCheckout() {
  const items = useBag();
  const navigate = useNavigate();
  const [store, setStore] = useState<ShopStorefront | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pay, setPay] = useState<Pay>("mobile_money");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void fetchShopStorefront().then(setStore).catch(() => undefined);
  }, []);

  const cur = store?.currency || "GH₵";
  const total = bagTotal();
  const payLabel = pay === "mobile_money" ? "Mobile money" : pay === "cash" ? "Cash on delivery" : "WhatsApp";

  const submit = async (viaWhatsapp: boolean) => {
    if (!items.length) return;
    setBusy(true);
    try {
      const businessId = store?.businessId || "";
      if (!businessId) throw new Error("The house is not taking orders yet. Message us on WhatsApp.");
      await placeShopOrder({
        businessId,
        customerName: name,
        phone,
        address,
        payment: viaWhatsapp ? "other" : pay,
        items,
      });
      if (viaWhatsapp || pay === "other") {
        const text = orderMessage({
          store: store?.name || "BEANNEL",
          name,
          phone,
          address,
          items,
          total: money(total, cur),
          pay: viaWhatsapp ? "WhatsApp" : payLabel,
        });
        window.open(whatsappHref(store?.whatsapp || "", text), "_blank", "noopener");
      }
      clearBag();
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="shop-body py-20 text-center space-y-3">
        <p className="shop-kicker">BEANNEL</p>
        <h1 className="display-title text-[2rem]">Order received</h1>
        <p className="text-[15px] text-fg-muted max-w-sm mx-auto">
          It is already in the house inventory. We will confirm on your phone
          {store?.whatsapp ? " or WhatsApp" : ""}.
        </p>
        <Button className="mt-4" onClick={() => void navigate({ to: "/shop" })}>
          Keep browsing
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shop-body py-20 text-center space-y-4">
        <p className="display-title text-[1.75rem]">Nothing to check out</p>
        <Button onClick={() => void navigate({ to: "/shop" })}>Browse the house</Button>
      </div>
    );
  }

  return (
    <div className="shop-body shop-checkout-wrap">
      <h1 className="display-title text-[2rem] mb-1">Checkout</h1>
      <p className="text-[15px] text-fg-muted mb-5">Your order lands in BEANNEL stock as soon as you send it.</p>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
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
            {(
              [
                ["mobile_money", "MoMo"],
                ["cash", "Cash on delivery"],
                ["other", "WhatsApp"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className="tag-chip" data-active={pay === id} onClick={() => setPay(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="shop-total">
          <span>
            {items.reduce((s, i) => s + i.qty, 0)} piece{items.length === 1 ? "" : "s"}
          </span>
          <span className="tabular font-semibold">{money(total, cur)}</span>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Place order"}
        </Button>
        {store?.whatsapp ? (
          <button
            type="button"
            className="shop-wa w-full"
            disabled={busy}
            onClick={() => void submit(true)}
          >
            <MessageCircle className="size-4" />
            Send on WhatsApp
          </button>
        ) : null}
      </form>
    </div>
  );
}
