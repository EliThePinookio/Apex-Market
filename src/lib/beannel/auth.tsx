import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppUserRole, UserProfile } from "@/types";
import { canAccessOffice, isOwnerEmail, OWNER_EMAIL, type AccountKind } from "@/lib/beannel/account";
import { fetchShopStorefront } from "@/lib/beannel/shop";
import { isSupabaseConfigured, supabase } from "@/lib/beannel/supabase";

interface BeannelAuthValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  businessId: string | null;
  role: AppUserRole;
  isLoading: boolean;
  isConfigured: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    businessName?: string,
    kind?: AccountKind,
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const BeannelAuthContext = createContext<BeannelAuthValue | null>(null);

function mapExistingProfile(currentUser: User, existing: Record<string, unknown>): UserProfile {
  const owner = isOwnerEmail(currentUser.email);
  return {
    id: String(existing.id),
    email: String(existing.email || currentUser.email || ""),
    fullName:
      (existing.full_name ? String(existing.full_name) : "") ||
      currentUser.user_metadata?.full_name ||
      (owner ? "Store Owner" : "Customer"),
    businessId: owner ? String(existing.business_id || currentUser.id) : undefined,
    role: owner ? "owner" : "customer",
    createdAt: String(existing.created_at || new Date().toISOString()),
  };
}

function shopperProfile(currentUser: User): UserProfile {
  return {
    id: currentUser.id,
    email: currentUser.email || "",
    fullName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Customer",
    businessId: undefined,
    role: "customer",
    createdAt: new Date().toISOString(),
  };
}

async function provisionOwnerWorkspace(currentUser: User, existingBizId?: string): Promise<UserProfile> {
  const bId = existingBizId || currentUser.id;
  const fName =
    currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Store Owner";
  const now = new Date().toISOString();

  const { data: biz } = await supabase.from("businesses").select("id").eq("id", bId).maybeSingle();
  if (!biz) {
    const { error: bizErr } = await supabase.from("businesses").insert({
      id: bId,
      name: "BEANNEL",
      owner_name: fName,
      currency_symbol: "GH₵",
      tax_rate: 0,
      low_stock_alert_enabled: true,
      allow_negative_stock: false,
      receipt_header_msg: "Thank you for shopping with us!",
      owner_id: currentUser.id,
      created_at: now,
      updated_at: now,
    });
    if (bizErr && !bizErr.message.toLowerCase().includes("duplicate")) {
      /* keep going — profile may still attach to an existing row */
    }
  }

  const { error: insErr } = await supabase.from("profiles").upsert(
    {
      id: currentUser.id,
      email: currentUser.email || OWNER_EMAIL,
      full_name: fName,
      business_id: bId,
      role: "owner",
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
    /* in-memory owner profile still returned */
  }

  return {
    id: currentUser.id,
    email: currentUser.email || OWNER_EMAIL,
    fullName: fName,
    businessId: bId,
    role: "owner",
    createdAt: now,
  };
}

async function ensureWorkspace(currentUser: User): Promise<UserProfile> {
  if (!isOwnerEmail(currentUser.email)) {
    return shopperProfile(currentUser);
  }

  const { data: existing, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();
  if (profErr) throw new Error(profErr.message);

  if (existing?.business_id) {
    return mapExistingProfile(currentUser, existing as Record<string, unknown>);
  }

  const store = await fetchShopStorefront().catch(() => null);
  return provisionOwnerWorkspace(currentUser, existing?.business_id ? String(existing.business_id) : store?.businessId);
}

export function BeannelAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [role, setRole] = useState<AppUserRole>("customer");
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const applyProfile = (p: UserProfile) => {
    setProfile(p);
    setBusinessId(canAccessOffice(p, p.email) ? p.businessId || p.id : null);
    setRole(p.role);
  };

  const loadProfile = useCallback(async (currentUser: User) => {
    const p = await ensureWorkspace(currentUser);
    applyProfile(p);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConfigError("BEANNEL cannot reach the business database.");
      setIsLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) setConfigError(error.message);
        if (data.session?.user) {
          setIsLoading(true);
          setSession(data.session);
          setUser(data.session.user);
          await loadProfile(data.session.user);
        }
      } catch (err) {
        if (mounted) {
          setConfigError(err instanceof Error ? err.message : "Could not contact the database.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!mounted) return;
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.user) {
        try {
          await loadProfile(next.user);
        } catch (err) {
          setConfigError(err instanceof Error ? err.message : "Could not load workspace.");
        }
      } else {
        setProfile(null);
        setBusinessId(null);
        setRole("customer");
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<BeannelAuthValue>(
    () => ({
      user,
      session,
      profile,
      businessId,
      role,
      isLoading,
      isConfigured: isSupabaseConfigured,
      configError,
      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) return { success: false, error: error.message };
          if (!data.user) return { success: false, error: "Sign-in did not return a user." };
          setUser(data.user);
          setSession(data.session);
          await loadProfile(data.user);
          return { success: true };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : "Sign-in failed.",
          };
        }
      },
      signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/login`,
            queryParams: { prompt: "select_account" },
          },
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },
      signUp: async (email, password, fullName, _businessName, _kind = "customer") => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName?.trim() || "Customer",
                account_kind: "customer",
              },
            },
          });
          if (error) return { success: false, error: error.message };
          if (data.session && data.user) {
            setUser(data.user);
            setSession(data.session);
            await loadProfile(data.user);
            return { success: true, message: "Account created. You are signed in." };
          }
          return {
            success: true,
            message: "Account created. Confirm the email we sent, then sign in.",
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : "Could not create account.",
          };
        }
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setBusinessId(null);
        setRole("customer");
      },
    }),
    [user, session, profile, businessId, role, isLoading, configError, loadProfile],
  );

  return <BeannelAuthContext.Provider value={value}>{children}</BeannelAuthContext.Provider>;
}

export function useBeannelAuth() {
  const ctx = useContext(BeannelAuthContext);
  if (!ctx) throw new Error("useBeannelAuth must be used within BeannelAuthProvider");
  return ctx;
}
