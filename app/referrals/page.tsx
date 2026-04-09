"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";

export default function ReferralsPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText("HSBMS-FRIEND-2024").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const providers = [
    {
      name: "Alex's Expert Plumbing",
      sub: "Master Plumber • 12 years exp.",
      rating: "4.9",
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRd_ZQ8KNeWxWzy_7UdFVtQHnolGVHJ9IUxq_XOM5Jry-hq777TVOa1J3Dg_ZYCU0QA1JT5TCuXbkzeGbdKshSuHVmyQoFCDZG80eAY6SkMJIFZnGda1ZXT7GUHCpmlDKhcO-kuy5iYIew4juUkL7kaLW0L37kvUx5qjWERwS6xMNLJRsTpZueJNAWjApvtSqkj5vGtJ8toAae0bOsqNU2Y4rHwZlmystMvwMBI4ccuJQtwOOBP7ze916GdswEvDeUYv0_5r7_RGtH",
      rec: "Recommended by Sarah & 2 others",
    },
    {
      name: "EcoClean Solutions",
      sub: "Eco-Friendly Home Cleaning",
      rating: "5.0",
      img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIbnVuxgwM61Y_ljiQD-1rl1DxBB6hOR1PtW0d9WaLXhamRRpKrD_DN2I10J8Ch1hbi2wApSQeq-23hcluHyp5Y7uUD_lQzfQTqAfRc-Cf89FKUwQfhxVxO52VeBKymDP4fdaZoxdIqxZ9aqolfZxPe6slvcPCKgTTWRxFg1VHIqqFH6TG5DDQ30p7CJh9KDLO7UwCSEGF2JAggSW25LK9q8TB24DazqQUbG08rqR0uWdOh8Z8dvHQAEQn1Ny8n3X5f3nC8amy2zDs",
      rec: "Recommended by Michael",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex h-auto min-h-screen flex-col bg-background-light dark:bg-background-dark overflow-x-hidden pb-24">
          {/* Header */}
          <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
            <button
              onClick={() => router.back()}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center"
            >
              <span className="material-symbols-outlined">arrow_back_ios</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
              Referrals &amp; Trust
            </h2>
            <div className="flex w-10 items-center justify-end">
              <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100">
                <span className="material-symbols-outlined">share</span>
              </button>
            </div>
          </div>

          {/* Hero Section */}
          <div className="p-4">
            <div className="flex flex-col items-stretch justify-start rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 border border-primary/5">
              <div
                className="w-full bg-center bg-no-repeat aspect-[16/9] bg-cover relative"
                style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuA6T94_gJ45ybNodcl-3u5qZqBBIeIKqKCqqrlZLLMjM2uqbpTo51rdChBSlhNu1SqnHr3X-B-cmdHr_h2S2CTfFkdKcgJvCb3LIjdLS3UTYWEaYAzM_KehSWI9sSFvUbkWbDs5koWX-fGlCq_XyT1M9KLCL3q2cWQoEnjBn0DeWZbDbyuFvixPT5UYWafcKvk_9LEGb4FcRTk4SceGzjtf4cSCfX_sCJwnSRnTz4Jaas_Rlu83rcl1GkPLf_6mRPVld45GiBboumpF")` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <h3 className="text-2xl font-bold mb-1">Give $50, Get $50</h3>
                    <p className="text-sm opacity-90">When your friends book their first house cleaning or repair.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-dashed border-primary/30">
                    <span className="text-primary font-mono font-bold tracking-wider">HSBMS-FRIEND-2024</span>
                    <button
                      onClick={copyCode}
                      className="text-primary text-sm font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">person_add</span>
                    Invite Friends
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-4 py-2">
            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-4">Your Referral Status</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: "12", label: "Invited", color: "text-slate-900 dark:text-slate-100" },
                { val: "4", label: "Booked", color: "text-primary" },
                { val: "$200", label: "Earned", color: "text-green-500" },
              ].map(({ val, label, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-primary/5 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trusted Providers */}
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Trusted Providers</h2>
              <button className="text-primary text-sm font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">add_circle</span> Recommend
              </button>
            </div>
            <div className="space-y-4">
              {providers.map((p) => (
                <div key={p.name} className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-primary/5 shadow-sm">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="w-16 h-16 rounded-lg object-cover" src={p.img} alt={p.name} />
                    <div className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-full border-2 border-white">
                      <span className="material-symbols-outlined text-[10px] font-bold">verified</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{p.name}</h4>
                        <p className="text-xs text-slate-500">{p.sub}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 px-1.5 py-0.5 rounded text-xs font-bold">
                        <span className="material-symbols-outlined text-[12px]">star</span> {p.rating}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-[10px] text-slate-400">{p.rec}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="px-4 py-2">
            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-full h-fit">celebration</span>
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>David Miller</strong> joined via your link! You&apos;ve earned a <strong>$50 credit</strong>.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-full h-fit">recommend</span>
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <strong>Jessica</strong> recommended <strong>Pure Air HVAC</strong>.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <BottomNav variant="user" active="profile" />
      </MobileFrame>
    </div>
  );
}
