import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Group, GroupLabel, GroupRow } from "@/components/ui/group";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useApex } from "@/lib/apex/store";
import { useBeannelAuth } from "@/lib/beannel/auth";
import { readOpenRouterKey, writeOpenRouterKey } from "@/lib/beannel/keys";

const WIPE_PHRASE = "WIPE";
const HOLD_MS = 2000;

export function SettingsView() {
  const { profile, saveProfile, wipeAll } = useApex();
  const { user, signOut } = useBeannelAuth();
  const [form, setForm] = useState(profile);
  const [openrouter, setOpenrouter] = useState(() => readOpenRouterKey());
  const [busy, setBusy] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await saveProfile(form);
      writeOpenRouterKey(openrouter);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="office-page max-w-xl">
      <PageHeader compact title="Settings" subtitle="Workspace identity, operations, and data." />

      <section>
        <GroupLabel>Account</GroupLabel>
        <Group footer="Only oelijah054@gmail.com can open this admin. Every other email stays in the shop.">
          <GroupRow>
            <span>Signed in</span>
            <span className="group-value truncate">{user?.email || "unknown"}</span>
          </GroupRow>
          <GroupRow onClick={() => void signOut()} destructive>
            Sign Out
            <ChevronRight className="size-4 text-fg-subtle ml-auto" />
          </GroupRow>
        </Group>
      </section>

      <section>
        <GroupLabel>Store</GroupLabel>
        <Group>
          <GroupRow>
            <span className="shrink-0">Name</span>
            <input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="group-input"
            />
          </GroupRow>
          <GroupRow>
            <span className="shrink-0">Owner</span>
            <input
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              className="group-input"
            />
          </GroupRow>
          <GroupRow>
            <span className="shrink-0">Currency</span>
            <input
              value={form.currencySymbol}
              onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
              className="group-input"
              maxLength={4}
            />
          </GroupRow>
          <GroupRow>
            <span className="shrink-0">Receipt</span>
            <input
              value={form.receiptHeaderMsg || ""}
              onChange={(e) => setForm({ ...form, receiptHeaderMsg: e.target.value })}
              className="group-input"
              placeholder="Footer line"
            />
          </GroupRow>
        </Group>
      </section>

      <section>
        <GroupLabel>Customer shop</GroupLabel>
        <Group footer="The public shop browses this inventory. Orders land here as sales and take stock down.">
          <GroupRow>
            <span className="shrink-0">WhatsApp</span>
            <input
              value={form.whatsappNumber || ""}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="group-input"
              placeholder="0XX XXX XXXX"
              inputMode="tel"
            />
          </GroupRow>
          <GroupRow>
            <span className="shrink-0">Tagline</span>
            <input
              value={form.shopTagline || ""}
              onChange={(e) => setForm({ ...form, shopTagline: e.target.value })}
              className="group-input"
              placeholder="Clothes · Jewelry · Watches"
            />
          </GroupRow>
        </Group>
      </section>

      <section>
        <GroupLabel>Operations</GroupLabel>
        <Group>
          <Switch
            label="Low-stock alerts"
            checked={form.lowStockAlertEnabled}
            onChange={(v) => setForm({ ...form, lowStockAlertEnabled: v })}
          />
          <Switch
            label="Allow negative stock"
            checked={form.allowNegativeStock}
            onChange={(v) => setForm({ ...form, allowNegativeStock: v })}
          />
          <Switch
            label="Require owner PIN"
            checked={form.isPinLocked}
            onChange={(v) => setForm({ ...form, isPinLocked: v })}
          />
          {form.isPinLocked && (
            <GroupRow>
              <span className="shrink-0">PIN</span>
              <input
                type="password"
                value={form.ownerPin}
                onChange={(e) => setForm({ ...form, ownerPin: e.target.value })}
                className="group-input"
                placeholder="Device only"
              />
            </GroupRow>
          )}
        </Group>
        <p className="group-footer">PIN is stored on this device only. Advisor and settings stay locked until it is entered.</p>
      </section>

      <section>
        <GroupLabel>Advisor</GroupLabel>
        <Group footer="Optional OpenRouter key for Ask Beannel. Leave blank to use the server key when available.">
          <GroupRow>
            <span className="shrink-0">API key</span>
            <input
              type="password"
              value={openrouter}
              onChange={(e) => setOpenrouter(e.target.value)}
              className="group-input"
              placeholder="sk-or-…"
              autoComplete="off"
            />
          </GroupRow>
        </Group>
      </section>

      <Button onClick={() => void save()} disabled={busy} className="w-full" size="lg">
        Save settings
      </Button>

      <section>
        <GroupLabel>Data</GroupLabel>
        <Group footer="A tap will not erase anything. Wipe asks for your PIN, the word WIPE, then a two-second hold.">
          <GroupRow destructive onClick={() => setWipeOpen(true)}>
            Wipe workspace
            <ChevronRight className="size-4 text-fg-subtle ml-auto" />
          </GroupRow>
        </Group>
      </section>

      <WipeConfirm
        open={wipeOpen}
        expectedPin={profile.ownerPin || "1234"}
        onClose={() => setWipeOpen(false)}
        onWipe={wipeAll}
      />
    </div>
  );
}

function WipeConfirm({
  open,
  expectedPin,
  onClose,
  onWipe,
}: {
  open: boolean;
  expectedPin: string;
  onClose: () => void;
  onWipe: () => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pin, setPin] = useState("");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [wiping, setWiping] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pinRef = useRef<HTMLInputElement>(null);

  const locked = lockedUntil > now;
  const waitSec = locked ? Math.max(1, Math.ceil((lockedUntil - now) / 1000)) : 0;

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setPin("");
    setPhrase("");
    setError("");
    setFails(0);
    setLockedUntil(0);
    setWiping(false);
    const t = window.setTimeout(() => pinRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!locked) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [locked]);

  const close = () => {
    if (wiping) return;
    onClose();
  };

  const checkPin = () => {
    if (locked || wiping) return;
    if (pin !== expectedPin) {
      const next = fails + 1;
      setFails(next);
      setPin("");
      if (next >= 3) {
        setLockedUntil(Date.now() + 8000);
        setError("Too many tries. Wait a moment, then enter the PIN again.");
      } else {
        setError("Incorrect PIN");
      }
      return;
    }
    setError("");
    setStep(2);
  };

  const checkPhrase = () => {
    if (phrase.trim().toUpperCase() !== WIPE_PHRASE) {
      setError(`Type ${WIPE_PHRASE} exactly to continue.`);
      return;
    }
    setError("");
    setStep(3);
  };

  const runWipe = async () => {
    if (wiping) return;
    setWiping(true);
    setError("");
    try {
      await onWipe();
      toast("Workspace cleared");
      onClose();
    } catch (err) {
      setWiping(false);
      setError(err instanceof Error ? err.message : "Wipe failed");
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Erase this workspace?"
      subtitle="Products, customers and ledger rows are deleted from your live account. The store profile stays. A pocket tap cannot finish this."
    >
      <div className="space-y-4">
        <p className="text-[12px] uppercase tracking-[0.14em] text-fg-subtle font-semibold">
          Step {step} of 3
        </p>

        {step === 1 && (
          <>
            <p className="text-[15px] text-fg-muted leading-relaxed">Enter the owner PIN to continue.</p>
            <input
              ref={pinRef}
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              disabled={locked || wiping}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkPin()}
              className="field h-12 text-center tracking-[0.45em] text-lg"
              aria-label="Owner PIN"
            />
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[15px] text-fg-muted leading-relaxed">
              Type <span className="font-semibold text-fg">{WIPE_PHRASE}</span> to confirm you mean it.
            </p>
            <input
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkPhrase()}
              className="field h-12 text-center tracking-[0.28em] text-lg uppercase"
              aria-label="Confirmation phrase"
              placeholder={WIPE_PHRASE}
            />
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-[15px] text-fg-muted leading-relaxed">
              Press and hold the button for two seconds. Letting go cancels.
            </p>
            <HoldToErase enabled={!wiping} busy={wiping} onFire={() => void runWipe()} />
          </>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        {locked && <p className="text-sm text-fg-muted">Try again in {waitSec}s.</p>}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={close} disabled={wiping}>
            Cancel
          </Button>
          {step === 1 && (
            <Button className="flex-1" onClick={checkPin} disabled={locked || wiping || pin.length === 0}>
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button className="flex-1" onClick={checkPhrase} disabled={phrase.trim().length === 0}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function HoldToErase({
  enabled,
  busy,
  onFire,
}: {
  enabled: boolean;
  busy: boolean;
  onFire: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const startAt = useRef(0);
  const fired = useRef(false);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    if (!fired.current) setProgress(0);
  };

  const tick = (now: number) => {
    const next = Math.min(1, (now - startAt.current) / HOLD_MS);
    setProgress(next);
    if (next >= 1) {
      fired.current = true;
      onFire();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!enabled || busy) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    fired.current = false;
    startAt.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <button
      type="button"
      className="hold-erase"
      disabled={!enabled || busy}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-erase-fill" style={{ transform: `scaleX(${progress})` }} />
      <span className="relative">{busy ? "Erasing…" : "Hold to erase everything"}</span>
    </button>
  );
}
