import type { User } from "@supabase/supabase-js";
import type { AppUserRole, UserProfile } from "@/types";

export type AccountKind = "customer" | "staff";

/** The only Gmail that can open the manager's office. */
export const OWNER_EMAIL = "oelijah054@gmail.com";

export function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function isOwnerEmail(email?: string | null): boolean {
  return normalizeEmail(email) === OWNER_EMAIL;
}

export function isOfficeRole(role: AppUserRole | null | undefined): boolean {
  return role === "owner" || role === "manager" || role === "cashier" || role === "viewer";
}

export function canAccessOffice(
  profile?: UserProfile | null,
  email?: string | null,
): boolean {
  return isOwnerEmail(email || profile?.email);
}

export function kindFromProfile(
  profile: UserProfile | null | undefined,
  email?: string | null,
): AccountKind {
  return canAccessOffice(profile, email) ? "staff" : "customer";
}

export function kindFromUser(
  user: User | null | undefined,
  profile?: UserProfile | null,
): AccountKind {
  if (isOwnerEmail(user?.email || profile?.email)) return "staff";
  return "customer";
}

export function isCustomerRole(role: AppUserRole, user?: User | null): boolean {
  if (isOwnerEmail(user?.email)) return false;
  return !isOfficeRole(role);
}

export function isStaffRole(role: AppUserRole, user?: User | null): boolean {
  return !isCustomerRole(role, user);
}

export function isOfficePath(pathname: string): boolean {
  return (
    pathname === "/manage" ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/ledger") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/advisor") ||
    pathname.startsWith("/settings")
  );
}

export function afterLoginPath(kind: AccountKind, next?: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    if (kind === "customer" && isOfficePath(next)) return "/";
    return next;
  }
  return kind === "staff" ? "/manage" : "/";
}
