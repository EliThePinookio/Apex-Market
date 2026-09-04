import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  BarChart3,
  LayoutDashboard,
  Lock,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useApex } from "@/lib/apex/store";
import { money } from "@/lib/apex/money";

interface Props {
  open: boolean;
  onClose: () => void;
  onQuick: () => void;
  onLockToggle: () => void;
}

export function CommandPalette({ open, onClose, onQuick, onLockToggle }: Props) {
  const { products, customers, profile, isOwnerUnlocked } = useApex();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    void navigate({ to });
  };

  return (
    <div className="sheet-scrim items-start pt-[12vh] px-4" onClick={onClose}>
      <Command
        className="glass w-full max-w-xl overflow-hidden rounded-[24px] shadow-[var(--shadow-4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Command.Input
            ref={inputRef}
            placeholder="Search products, customers, or jump…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle"
          />
          <kbd className="text-[10px] text-fg-subtle">ESC</kbd>
        </div>
        <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-fg-muted">
            Nothing matches.
          </Command.Empty>
          <Command.Group heading="Actions" className="text-[10px] uppercase tracking-wider text-fg-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            <Item
              icon={Plus}
              label="New sale, expense, capital or refill"
              onSelect={() => {
                onClose();
                onQuick();
              }}
            />
            {profile.isPinLocked && (
              <Item
                icon={Lock}
                label={isOwnerUnlocked ? "Lock owner mode" : "Unlock owner mode"}
                onSelect={() => {
                  onClose();
                  onLockToggle();
                }}
              />
            )}
          </Command.Group>
          <Command.Group heading="Go to" className="text-[10px] uppercase tracking-wider text-fg-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            <Item icon={LayoutDashboard} label="Dashboard" onSelect={() => go("/")} />
            <Item icon={ShoppingCart} label="Open register" onSelect={() => go("/pos")} />
            <Item icon={Package} label="Inventory" onSelect={() => go("/inventory")} />
            <Item icon={Receipt} label="Ledger" onSelect={() => go("/ledger")} />
            <Item icon={Users} label="Customers" onSelect={() => go("/customers")} />
            <Item icon={BarChart3} label="Advisor" onSelect={() => go("/advisor")} />
            <Item icon={Settings} label="Settings" onSelect={() => go("/settings")} />
          </Command.Group>
          <Command.Group heading="Products" className="text-[10px] uppercase tracking-wider text-fg-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {products.slice(0, 40).map((p) => (
              <Command.Item
                key={p.id}
                value={`${p.name} ${p.sku} ${p.barcode || ""} ${p.category}`}
                onSelect={() => {
                  onClose();
                  void navigate({ to: "/pos", search: { sku: p.sku } });
                }}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[14px] text-sm data-[selected=true]:bg-bg-subtle cursor-pointer"
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-[11px] text-fg-subtle">
                    {p.sku} · {p.stockQuantity} {p.unit}
                  </span>
                </span>
                <span className="tabular text-xs">{money(p.sellPrice, profile.currencySymbol)}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Customers" className="text-[10px] uppercase tracking-wider text-fg-subtle [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {customers.map((c) => (
              <Command.Item
                key={c.id}
                value={`${c.name} ${c.phone} ${c.email}`}
                onSelect={() => {
                  onClose();
                  void navigate({ to: "/customers", search: { q: c.name } });
                }}
                className="flex items-center justify-between px-3 py-2.5 rounded-[14px] text-sm data-[selected=true]:bg-bg-subtle cursor-pointer"
              >
                <span>{c.name}</span>
                <span className="text-[11px] text-fg-subtle">{c.tier}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

function Item({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: typeof Plus;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-sm data-[selected=true]:bg-bg-subtle cursor-pointer"
    >
      <Icon className="size-4 text-fg-muted" />
      {label}
    </Command.Item>
  );
}
