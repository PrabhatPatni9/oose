"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";

interface ProviderCard {
  id: number;
  skills: string;
  rating: number;
  users: { name: string; email: string } | null;
}

interface ReferralRow {
  id: number;
  created_at: string;
  referee_id: string | null;
}

export default function ReferralsPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [bookedCount, setBookedCount] = useState(0);
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }
    const { data: me } = await supabase.from("users").select("referral_code").eq("id", auth.user.id).maybeSingle();
    const code =
      (me?.referral_code as string | null) ||
      `HSBMS-${auth.user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    setInviteCode(code);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setInviteLink(`${origin}/login?ref=${encodeURIComponent(code)}`);

    const { data: refData } = await supabase
      .from("referrals")
      .select("id, created_at, referee_id")
      .eq("referrer_id", auth.user.id)
      .order("created_at", { ascending: false });
    const list = (refData as ReferralRow[] | null) ?? [];
    setRows(list);

    const { data: bookedRpc, error: bookedErr } = await supabase.rpc("referral_booked_referee_count", {
      p_referrer: auth.user.id,
    });
    if (bookedErr) {
      setBookedCount(0);
    } else {
      setBookedCount(typeof bookedRpc === "number" ? bookedRpc : 0);
    }

    const { data: prov } = await supabase
      .from("service_providers")
      .select("id, skills, rating, users(name, email)")
      .order("rating", { ascending: false })
      .limit(12);
    setProviders((prov as ProviderCard[] | null) ?? []);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const invited = rows.length;
  const earned = useMemo(() => bookedCount * 50, [bookedCount]);

  function copyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function shareInvite() {
    const payload = {
      title: "Join HSBMS",
      text: `Use my referral code ${inviteCode} — we both get $50 credit when you book.`,
      url: inviteLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setShareStatus("Shared!");
      } else {
        copyLink();
        setShareStatus("Link copied (share not available on this device).");
      }
    } catch {
      copyLink();
    }
    setTimeout(() => setShareStatus(null), 3000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex min-h-screen flex-col bg-background-light dark:bg-background-dark overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined">arrow_back_ios</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
              Referrals &amp; trust
            </h2>
            <button
              type="button"
              onClick={shareInvite}
              className="flex size-10 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
              aria-label="Share invite"
            >
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>

          {shareStatus && <p className="text-center text-xs text-primary py-2 px-4">{shareStatus}</p>}

          <div className="p-4">
            <div className="flex flex-col items-stretch justify-start rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 border border-primary/5">
              <div
                className="w-full bg-center bg-no-repeat aspect-[16/9] bg-cover relative"
                style={{
                  backgroundImage:
                    'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80")',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-1">Give $50, Get $50</h3>
                    <p className="text-sm opacity-90">Friends sign up with your link or code, book once, you both earn.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-500">
                  Share your link — on signup we store <code className="text-primary">ref</code> and create a referral row when they register.
                </p>
                <div className="flex flex-col gap-2 p-3 bg-primary/5 rounded-xl border border-dashed border-primary/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-primary font-mono font-bold tracking-wider text-sm break-all">{inviteCode}</span>
                    <button type="button" onClick={copyCode} className="text-primary text-sm font-bold flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="text-left text-xs text-slate-600 dark:text-slate-400 underline break-all"
                  >
                    {inviteLink || "…"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={shareInvite}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  Invite friends
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-2">
            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-4">Your referral status</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: String(invited), label: "Invited", color: "text-slate-900 dark:text-slate-100" },
                { val: String(bookedCount), label: "Booked", color: "text-primary" },
                { val: `$${earned}`, label: "Earned", color: "text-green-500" },
              ].map(({ val, label, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-primary/5 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-4">
            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-3">Activity</h2>
            <div className="space-y-3">
              {rows.length === 0 && (
                <p className="text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  No invites yet. Share your link to start tracking.
                </p>
              )}
              {rows.map((r) => (
                <div key={r.id} className="flex gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-full h-fit shrink-0">
                    {r.referee_id ? "check_circle" : "mail"}
                  </span>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {r.referee_id ? (
                        <>
                          <strong>Friend joined</strong> — appears in Invited. &quot;Booked&quot; counts friends who completed a service booking.
                        </>
                      ) : (
                        <>
                          <strong>Invite pending</strong> — waiting for friend to create an account.
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Trusted providers</h2>
              <button
                type="button"
                onClick={() => router.push("/booking")}
                className="text-primary text-sm font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span> Book
              </button>
            </div>
            <div className="space-y-4">
              {providers.length === 0 && (
                <p className="text-sm text-slate-500">No providers listed yet.</p>
              )}
              {providers.map((p) => (
                <div key={p.id} className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-primary/5 shadow-sm">
                  <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-3xl">engineering</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{p.users?.name ?? "Provider"}</h4>
                        <p className="text-xs text-slate-500 truncate">{p.skills}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 px-1.5 py-0.5 rounded text-xs font-bold shrink-0">
                        <span className="material-symbols-outlined text-[12px]">star</span> {(Number(p.rating) || 0).toFixed(1)}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 truncate">{p.users?.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <BottomNav variant="user" active="profile" />
      </MobileFrame>
    </div>
  );
}
