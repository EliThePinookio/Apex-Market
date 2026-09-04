import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApex } from "@/lib/apex/store";

const LOCK_KEY = "beannel_pin_lock";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function readLock(): { fails: number; until: number } {
  try {
    const raw = sessionStorage.getItem(LOCK_KEY);
    if (!raw) return { fails: 0, until: 0 };
    const parsed = JSON.parse(raw) as { fails?: number; until?: number };
    return { fails: parsed.fails || 0, until: parsed.until || 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}

export function PinModal({ open, onClose, onSuccess }: Props) {
  const { profile } = useApex();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [lock, setLock] = useState(readLock);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setLock(readLock());
    }
  }, [open]);

  const locked = lock.until > Date.now();

  const submit = () => {
    if (locked) {
      const wait = Math.max(1, Math.ceil((lock.until - Date.now()) / 1000));
      setError(`Too many tries. Wait ${wait}s.`);
      return;
    }
    const expected = (profile.ownerPin || "").trim();
    if (!expected) {
      setError("Set an owner PIN in Settings first.");
      return;
    }
    if (pin === expected) {
      sessionStorage.removeItem(LOCK_KEY);
      setLock({ fails: 0, until: 0 });
      onSuccess();
      onClose();
      return;
    }
    const fails = lock.fails + 1;
    const until = fails >= 5 ? Date.now() + 120_000 : 0;
    const next = { fails, until };
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(next));
    setLock(next);
    setError(until ? "Locked for 2 minutes." : "Incorrect PIN");
    setPin("");
  };

  return (
    <Sheet open={open} onClose={onClose} title="Owner PIN" subtitle="Required for advisor and settings.">
      <div className="space-y-4">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="field h-12 text-center tracking-[0.45em] text-lg"
          aria-label="Owner PIN"
          autoComplete="off"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit} disabled={locked}>
            Unlock
          </Button>
        </div>
      </div>
    </Sheet>
  );
}