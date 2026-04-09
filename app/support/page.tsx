"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";

export default function SupportPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabase();
    await supabase.from("issued_reports").insert({
      description,
      status: "open",
    });
    setLoading(false);
    setSubmitted(true);
  }

  const timeline = [
    { icon: "check", iconClass: "bg-emerald-500 text-white", label: "Issue Raised", sub: "Today, 10:45 AM" },
    { icon: "person", iconClass: "bg-primary text-white", label: "Assigned to Support Specialist", sub: "Today, 11:20 AM • Agent Mike R.", active: true },
    { icon: "", iconClass: "bg-slate-200 dark:bg-slate-800 text-slate-400", label: "Investigation in Progress", sub: "Estimated within 2 hours", pending: true },
    { icon: "", iconClass: "bg-slate-200 dark:bg-slate-800 text-slate-400", label: "Resolution & Final Report", sub: "Awaiting outcome", pending: true },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex h-auto min-h-screen flex-col bg-white dark:bg-background-dark overflow-x-hidden">
          {/* Top App Bar */}
          <div className="sticky top-0 z-10 flex items-center bg-white dark:bg-background-dark p-4 border-b border-slate-200 dark:border-slate-800 justify-between">
            <button
              onClick={() => router.back()}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
              Support Ticket #8421
            </h2>
          </div>

          <div className="flex flex-col pb-24">
            {/* Service Info Card */}
            <div className="px-4 pt-6 pb-2">
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col gap-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Service Reference</p>
                <p className="text-slate-900 dark:text-white font-bold text-lg">Deep Kitchen Cleaning</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Completed on Oct 24, 2023 • Pro: Sarah Jenkins</p>
              </div>
            </div>

            {/* Issue Form */}
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight px-4 pb-2 pt-6">
              Issue Details
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-3">
              <label className="flex flex-col w-full">
                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal pb-2">
                  What&apos;s the problem?
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none overflow-hidden rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-32 placeholder:text-slate-400 p-4 text-base font-normal leading-normal"
                  placeholder="Please describe the issue in detail..."
                />
              </label>
            </form>

            {/* Upload */}
            <div className="flex flex-col p-4">
              <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-6 py-10">
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-4xl">add_a_photo</span>
                  <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight tracking-tight text-center">Upload Photos</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal text-center max-w-[240px]">
                    Show us the specific problem area to help our team resolve it faster.
                  </p>
                </div>
                <button className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-wide shadow-lg shadow-primary/20">
                  <span className="truncate">Select Files</span>
                </button>
              </div>
            </div>

            {/* Timeline */}
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight px-4 pb-4 pt-6">
              Tracking Status
            </h3>
            <div className="px-6 py-2">
              <div className="relative flex flex-col gap-8">
                <div className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-0.5 bg-slate-200 dark:bg-slate-800" />
                {timeline.map((step, i) => (
                  <div key={i} className="relative flex gap-4">
                    <div className={`z-10 flex size-6 items-center justify-center rounded-full ${step.iconClass} ring-4 ring-white dark:ring-background-dark`}>
                      {step.icon ? (
                        <span className={`material-symbols-outlined text-[16px] font-bold ${step.active ? "animate-pulse" : ""}`}>
                          {step.icon}
                        </span>
                      ) : (
                        <div className="size-2 rounded-full bg-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <p className={`text-sm font-bold ${step.pending ? "text-slate-400 dark:text-slate-600" : step.active ? "text-primary" : "text-slate-900 dark:text-slate-100"}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs ${step.pending ? "text-slate-400 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"}`}>
                        {step.sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-8 border-t border-slate-200 dark:border-slate-800">
            {submitted ? (
              <div className="w-full h-14 flex items-center justify-center bg-green-100 text-green-700 font-bold rounded-xl">
                Issue Submitted Successfully!
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !description.trim()}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Issue Report"}
              </button>
            )}
          </div>
        </div>
      </MobileFrame>
    </div>
  );
}
