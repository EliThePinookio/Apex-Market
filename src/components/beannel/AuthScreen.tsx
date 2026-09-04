import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark, Wordmark } from "@/components/ui/brand-mark";
import { Group } from "@/components/ui/group";
import { useBeannelAuth } from "@/lib/beannel/auth";

type Mode = "signin" | "signup" | "forgot";

export function AuthScreen() {
  const { signIn, signInWithGoogle, signUp, resetPassword } = useBeannelAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const hash = window.location.hash;
    const search = window.location.search;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : search);
    const desc = params.get("error_description") || params.get("error");
    if (desc) {
      setError(decodeURIComponent(desc.replace(/\+/g, " ")));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("beannel_theme", next ? "dark" : "light");
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode === "forgot") {
      setBusy(true);
      const res = await resetPassword(email);
      setBusy(false);
      if (res.success) setSuccess("Password reset instructions sent. Check your inbox.");
      else setError(res.error || "Could not send reset email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setBusy(true);
      const res = await signUp(email, password, fullName, businessName);
      setBusy(false);
      if (res.success) setSuccess(res.message || "Account created.");
      else setError(res.error || "Could not create account.");
      return;
    }
    setBusy(true);
    try {
      const res = await signIn(email, password);
      if (!res.success) setError(res.error || "Invalid email or password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    const res = await signInWithGoogle();
    if (!res.success) {
      setError(res.error || "Google sign-in failed.");
      setGoogleBusy(false);
    }
  };

  return (
    <div className="auth-stage">
      <aside className="auth-hero" aria-hidden>
        <img src="/brand/lifestyle.jpg" alt="" className="auth-hero-light" />
        <img src="/brand/lockup.jpg" alt="" className="auth-hero-dark" />
      </aside>
      <section className="auth-panel">
        <button
          type="button"
          onClick={toggleTheme}
          className="auth-theme size-11 rounded-full grid place-items-center text-fg-muted hover:text-fg hover:bg-bg-subtle"
          aria-label={dark ? "Switch to light" : "Switch to dark"}
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <div className="auth-panel-inner page-enter">
          <div className="auth-lockup">
            <BrandMark />
            <div className="min-w-0">
              <h1>
                <Wordmark />
              </h1>
              <p className="brand-tagline mt-1.5">Clothes · Jewellery · Watches · Fashion</p>
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="tag-row justify-center mb-4">
              <button type="button" className="tag-chip" data-active={mode === "signin"} onClick={() => switchMode("signin")}>
                Sign in
              </button>
              <button type="button" className="tag-chip" data-active={mode === "signup"} onClick={() => switchMode("signup")}>
                Create account
              </button>
            </div>
          )}

          <div className="mb-3">
            <h2 className="text-[1.25rem] font-semibold tracking-tight">
              {mode === "signin" && "Welcome back"}
              {mode === "signup" && "Register your store"}
              {mode === "forgot" && "Reset password"}
            </h2>
            <p className="text-[13px] text-fg-muted mt-0.5 leading-snug">
              {mode === "signin" && "Email and password for your BEANNEL account."}
              {mode === "signup" && "New workspaces start empty."}
              {mode === "forgot" && "We will send a recovery link to this email."}
            </p>
          </div>

          {error && (
            <div className="flex gap-2.5 text-[15px] text-danger bg-danger/8 rounded-[14px] p-3 mb-4">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex gap-2.5 text-[15px] text-success bg-success/8 rounded-[14px] p-3 mb-4">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <Group indent="icon">
              {mode === "signup" && (
                <>
                  <label className="group-row">
                    <User className="size-4 text-fg-subtle shrink-0" />
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="field"
                      placeholder="Full name"
                    />
                  </label>
                  <label className="group-row">
                    <Building2 className="size-4 text-fg-subtle shrink-0" />
                    <input
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="field"
                      placeholder="Store name"
                    />
                  </label>
                </>
              )}
              <label className="group-row">
                <Mail className="size-4 text-fg-subtle shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  placeholder="Email"
                  autoComplete="email"
                />
              </label>
              {mode !== "forgot" && (
                <label className="group-row">
                  <Lock className="size-4 text-fg-subtle shrink-0" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                    placeholder="Password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </label>
              )}
              {mode === "signup" && (
                <label className="group-row">
                  <KeyRound className="size-4 text-fg-subtle shrink-0" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field"
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />
                </label>
              )}
            </Group>

            {mode === "signin" && (
              <div className="flex justify-end -mt-1">
                <button type="button" onClick={() => switchMode("forgot")} className="text-[13px] text-accent font-medium px-1 min-h-11">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" && "Sign in"}
              {mode === "signup" && "Create account"}
              {mode === "forgot" && "Send reset link"}
            </Button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-x-0 h-px bg-border" />
                <span className="relative bg-bg px-3 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                  or
                </span>
              </div>
              <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy || googleBusy} onClick={onGoogle}>
                {googleBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                )}
                Continue with Google
              </Button>
            </>
          )}

          {mode === "forgot" && (
            <button type="button" onClick={() => switchMode("signin")} className="text-[15px] text-accent font-medium mt-4 min-h-11">
              Back to sign in
            </button>
          )}

          <p className="flex items-center justify-center gap-2 text-[12px] text-fg-subtle pt-3">
            <ShieldCheck className="size-3.5 text-accent" />
            Live accounts. Your data stays on your workspace.
          </p>
        </div>
      </section>
    </div>
  );
}
