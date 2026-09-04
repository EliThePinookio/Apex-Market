import type { User } from "@supabase/supabase-js";
import type { AppUserRole } from "@/types";

export type AccountKind = "customer" | "staff";

export function kindFromUser(user: User | null | undefined): AccountKind {
  const meta = user?.user_metadata?.account_kind;
  if (meta === "customer") return "customer";
  if (meta === "staff") return "staff";
  return "staff";
}

export function isCustomerRole(role: AppUserRole, user?: User | null): boolean {
  if (kindFromUser(user) === "customer") return true;
  return role === "customer";
}

export function isStaffRole(role: AppUserRole, user?: User | null): boolean {
  return !isCustomerRole(role, user);
}

export function afterLoginPath(kind: AccountKind, next?: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return kind === "customer" ? "/" : "/manage";
}
