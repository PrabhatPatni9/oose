"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";

const REF_STORAGE = "hsbms_referral_code";

type Role = "User" | "Provider" | "Admin";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref?.trim()) {
      sessionStorage.setItem(REF_STORAGE, ref.trim());
    }
  }, []);

  async function routeAfterAuth(supabase: ReturnType<typeof getSupabase>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Account created — confirm your email if required, then sign in.");
      return;
    }
    const { data: row } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    const dbRole = (row?.role as string | undefined) ?? "user";
    if (dbRole === "admin") router.push("/admin");
    else if (dbRole === "provider") router.push("/provider");
    else router.push("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const referredBy =
      typeof window !== "undefined" ? sessionStorage.getItem(REF_STORAGE)?.trim() || undefined : undefined;

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role.toLowerCase(),
            name: email.split("@")[0],
            ...(referredBy ? { referred_by: referredBy } : {}),
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      await routeAfterAuth(supabase);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      await routeAfterAuth(supabase);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex items-center bg-white dark:bg-background-dark p-4 pb-2 justify-between">
          <button className="text-slate-900 dark:text-slate-100" onClick={() => router.back()}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
            Welcome back
          </h2>
          <div className="w-6" />
        </div>

        <div className="flex flex-col items-center px-6 pt-10 pb-6">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "48px" }}>
              home_repair_service
            </span>
          </div>
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-[32px] font-bold leading-tight text-center">
            HSBMS
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal pt-2 text-center">
            Long-term household service management
          </p>
        </div>

        {/* Role Tabs */}
        <div className="px-6 py-4">
          <div className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {(["User", "Provider", "Admin"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold leading-normal transition-all ${
                  role === r
                    ? "bg-white dark:bg-slate-700 shadow-sm text-primary"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 pt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
              Email or Mobile
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <button type="button" className="text-xs font-semibold text-primary">Forgot?</button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                lock
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl cursor-pointer"
              >
                {showPassword ? "visibility_off" : "visibility"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <div className="flex flex-col gap-3 pt-4 pb-10">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{loading ? "Please wait..." : isSignUp ? "Sign Up" : "Login"}</span>
              {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold py-4 rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
              {isSignUp ? "Already have an account? Login" : "Sign Up"}
            </button>
          </div>
        </form>

        <div className="mt-auto">
          <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark px-4 pb-8 pt-2">
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
              <div className="flex h-10 items-center justify-center">
                <span className="material-symbols-outlined">home</span>
              </div>
              <span className="text-[10px] font-medium">Home</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
              <div className="flex h-10 items-center justify-center">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <span className="text-[10px] font-medium">Bookings</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-1 text-primary">
              <div className="flex h-10 items-center justify-center">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  person
                </span>
              </div>
              <span className="text-[10px] font-medium">Account</span>
            </div>
          </div>
        </div>
      </MobileFrame>
    </div>
  );
}
