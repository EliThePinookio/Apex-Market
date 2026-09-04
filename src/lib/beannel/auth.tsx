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
import { isSupabaseConfigured, supabase } from "@/lib/beannel/supabase";
import { kindFromUser, type AccountKind } from "@/lib/beannel/account";

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

async function ensureWorkspace(currentUser: User): Promise<UserProfile> {
  const { data: existing, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (profErr) throw new Error(profErr.message);

  if (existing) {
    const kind = kindFromUser(currentUser);
    const bId = existing.business_id || (kind === "customer" ? undefined : currentUser.id);
    return {
      id: existing.id,
      email: existing.email || currentUser.email || "",
      fullName: existing.full_name || currentUser.user_metadata?.full_name || "Customer",
      businessId: bId,
      role: kind === "customer" ? "customer" : ((existing.role as AppUserRole) || "owner"),
      createdAt: existing.created_at || new Date().toISOString(),
    };
  }

  const kind = kindFromUser(currentUser);
  if (kind === "customer") {
    return {
      id: currentUser.id,
      email: currentUser.email || "",
      fullName: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Customer",
      businessId: undefined,
      role: "customer",
      createdAt: new Date().toISOString(),
    };
  }

  const bId = currentUser.id;
  const bName = currentUser.user_metadata?.business_name || "BEANNEL";
  const fName =
    currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Store Owner";
  const now = new Date().toISOString();

  const { data: biz } = await supabase.from("businesses").select("id").eq("id", bId).maybeSingle();
  if (!biz) {
    const { error: bizErr } = await supabase.from("businesses").insert({
      id: bId,
      name: bName,
      owner_name: fName,
      currency_symbol: "$",
      tax_rate: 0,
      low_stock_alert_enabled: true,
      allow_negative_stock: false,
      receipt_header_msg: "Thank you for shopping with us!",
      owner_id: currentUser.id,
      created_at: now,
      updated_at: now,
    });
    if (bizErr && !bizErr.message.toLowerCase().includes("duplicate")) {
      throw new Error(bizErr.message);
    }
  }

  const { error: insErr } = await supabase.from("profiles").insert({
    id: currentUser.id,
    email: currentUser.email || "",
    full_name: fName,
    business_id: bId,
    role: "owner",
    created_at: now,
    updated_at: now,
  });
  if (insErr && !insErr.message.toLowerCase().includes("duplicate")) {
    throw new Error(insErr.message);
  }

  return {
    id: currentUser.id,
    email: currentUser.email || "",
    fullName: fName,
    businessId: bId,
    role: "owner",
    createdAt: now,
  };
}

export function BeannelAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [role, setRole] = useState<AppUserRole>("owner");
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const applyProfile = (p: UserProfile) => {
    setProfile(p);
    setBusinessId(p.businessId || (p.role === "customer" ? null : p.id));
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
        setRole("owner");
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
        const asCustomer = new URLSearchParams(window.location.search).get("as") !== "staff";
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/login?as=${asCustomer ? "customer" : "staff"}`,
            queryParams: asCustomer ? { prompt: "select_account" } : undefined,
          },
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },
      signUp: async (email, password, fullName, businessName, kind = "staff") => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName?.trim() || (kind === "customer" ? "Customer" : "Store Owner"),
                business_name: businessName?.trim() || "BEANNEL",
                account_kind: kind,
              },
            },
          });
          if (error) return { success: false, error: error.message };
          if (data.user && !data.user.user_metadata?.account_kind) {
            await supabase.auth.updateUser({ data: { account_kind: kind } });
          }
          if (data.session && data.user) {
            setUser({
              ...data.user,
              user_metadata: { ...data.user.user_metadata, account_kind: kind },
            });
            setSession(data.session);
            await loadProfile({
              ...data.user,
              user_metadata: { ...data.user.user_metadata, account_kind: kind },
            });
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
