import { useSearch } from "@tanstack/react-router";
import { ChevronRight, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Group } from "@/components/ui/group";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Sheet } from "@/components/ui/sheet";
import { money } from "@/lib/apex/money";
import { useApex } from "@/lib/apex/store";
import { cn } from "@/lib/cn";
import type { Customer } from "@/types";

export function CustomersView() {
  const { customers, transactions, profile, saveCustomer, deleteCustomer, settleDebt } = useApex();
  const search = useSearch({ strict: false }) as { q?: string };
  const [q, setQ] = useState(search?.q || "");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", debt: "" });
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const list = useMemo(() => {
    const query = q.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(query),
    );
  }, [customers, q]);

  const history = selected
    ? transactions.filter(
        (t) =>
          t.type === "sale" &&
          (t.customerId === selected.id || t.customerName === selected.name),
      )
    : [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} in this workspace`}
        actions={<Button onClick={() => setAdding(true)}>Add customer</Button>}
      />

      <SearchField
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, phone, email"
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          body="Add one here, or name them at checkout. Loyalty and spend build from live sales."
          action={<Button onClick={() => setAdding(true)}>Add customer</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-[1fr_340px] gap-4">
          <Group indent="avatar">
            {list.length === 0 && (
              <div className="group-row text-fg-muted text-[15px]">No customers match this search.</div>
            )}
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className={cn("group-row", selected?.id === c.id && "bg-bg-subtle")}
              >
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium truncate">{c.name}</p>
                  <p className="text-[13px] text-fg-subtle">
                    {c.tier} · {c.orderCount} orders
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-[15px] font-medium">{money(c.totalSpent, profile.currencySymbol)}</p>
                  {c.debtBalance > 0 && (
                    <p className="text-[12px] text-danger">{money(c.debtBalance, profile.currencySymbol)} due</p>
                  )}
                </div>
                <ChevronRight className="size-4 text-fg-subtle md:hidden" />
              </button>
            ))}
          </Group>

          <aside className="hidden md:block panel p-6 min-h-[240px]">
            <CustomerDetail
              selected={selected}
              history={history}
              profile={profile}
              onSettle={async () => {
                if (!selected) return;
                try {
                  await settleDebt(selected.id);
                  setSelected({ ...selected, debtBalance: 0 });
                  toast("Debt cleared");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not settle debt");
                }
              }}
              onDelete={async () => {
                if (!selected) return;
                if (!confirm(`Delete ${selected.name}?`)) return;
                try {
                  await deleteCustomer(selected.id);
                  setSelected(null);
                  toast("Customer deleted");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Delete failed");
                }
              }}
            />
          </aside>
        </div>
      )}

      <Sheet open={mobile && Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <CustomerDetail
              selected={selected}
              history={history}
              profile={profile}
              onSettle={async () => {
                try {
                  await settleDebt(selected.id);
                  setSelected({ ...selected, debtBalance: 0 });
                  toast("Debt cleared");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not settle debt");
                }
              }}
              onDelete={async () => {
                if (!confirm(`Delete ${selected.name}?`)) return;
                try {
                  await deleteCustomer(selected.id);
                  setSelected(null);
                  toast("Customer deleted");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Delete failed");
                }
              }}
            />
          )}
      </Sheet>

      <Sheet open={adding} onClose={() => setAdding(false)} title="New customer">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await saveCustomer({
                name: form.name,
                phone: form.phone,
                email: form.email,
                debtBalance: Number(form.debt) || 0,
                loyaltyPoints: 50,
              });
              toast.success("Customer added");
              setAdding(false);
              setForm({ name: "", phone: "", email: "", debt: "" });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save customer");
            }
          }}
        >
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="field" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field" />
          <input placeholder="Opening debt" value={form.debt} onChange={(e) => setForm({ ...form, debt: e.target.value })} className="field" />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function CustomerDetail({
  selected,
  history,
  profile,
  onSettle,
  onDelete,
}: {
  selected: Customer | null;
  history: { id: string; date: string; amount: number }[];
  profile: { currencySymbol: string };
  onSettle: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  if (!selected) return <p className="text-[15px] text-fg-muted">Select a customer to see history.</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={selected.name} className="size-12 text-sm" />
        <div className="min-w-0">
          <h2 className="text-[1.25rem] font-semibold tracking-tight truncate">{selected.name}</h2>
          <p className="text-[13px] text-fg-muted truncate">
            {selected.phone}
            {selected.email ? ` · ${selected.email}` : ""}
          </p>
        </div>
      </div>
      <p className="text-[15px]">
        Loyalty {selected.loyaltyPoints} pts · {selected.tier}
      </p>
      {selected.debtBalance > 0 && (
        <Button size="sm" variant="secondary" onClick={() => void onSettle()}>
          Settle debt
        </Button>
      )}
      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-[13px] text-fg-subtle">Recent purchases</p>
        {history.slice(0, 8).map((t) => (
          <p key={t.id} className="text-[15px] flex justify-between">
            <span className="text-fg-muted">{new Date(t.date).toLocaleDateString()}</span>
            <span className="tabular">{money(t.amount, profile.currencySymbol)}</span>
          </p>
        ))}
        {history.length === 0 && <p className="text-[15px] text-fg-muted">No linked sales yet.</p>}
      </div>
      <Button variant="danger" size="sm" onClick={() => void onDelete()}>
        Delete
      </Button>
    </div>
  );
}
