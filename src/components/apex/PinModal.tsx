import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApex } from "@/lib/apex/store";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PinModal({ open, onClose, onSuccess }: Props) {
  const { profile } = useApex();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
    }
  }, [open]);

  const submit = () => {
    if (pin === (profile.ownerPin || "1234")) {
      onSuccess();
      onClose();
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Owner PIN" subtitle="Required for advisor and settings.">
      <div className="space-y-4">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="field h-12 text-center tracking-[0.45em] text-lg"
          aria-label="Owner PIN"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit}>
            Unlock
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
