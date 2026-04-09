"use client";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import BottomNav from "@/components/BottomNav";

const lineItems = [
  { label: "Base Service Cost", sub: "Fixed rate", amount: "$50.00" },
  { label: "Duration-based Charge", sub: "3 Hours @ $10/hr", amount: "$30.00" },
  { label: "Add-ons Subtotal", sub: "Eco-friendly products", amount: "$15.00" },
  { label: "Taxes", sub: "VAT 8.5%", amount: "$8.50" },
];

export default function PricingPage() {
  const router = useRouter();
  const scheduledLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex h-full min-h-screen flex-col bg-white dark:bg-background-dark overflow-x-hidden border-x border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-4 justify-between border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => router.back()}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
              Pricing Breakdown
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 px-5 py-6">
            {/* Service Info */}
            <div className="mb-8 flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="size-12 rounded-lg bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined">cleaning_services</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Deep House Cleaning</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled for {scheduledLabel}</p>
              </div>
            </div>

            <h2 className="text-slate-900 dark:text-white text-[20px] font-bold leading-tight tracking-tight mb-4">
              Service Summary
            </h2>

            {/* Itemized List */}
            <div className="space-y-1">
              {lineItems.map(({ label, sub, amount }) => (
                <div key={label} className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{label}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{sub}</span>
                  </div>
                  <p className="text-slate-900 dark:text-white text-base font-semibold text-right">{amount}</p>
                </div>
              ))}
            </div>

            {/* Transparency Notice */}
            <div className="mt-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex gap-3">
              <span className="material-symbols-outlined text-primary text-xl">info</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This breakdown includes all applicable fees. No hidden charges will be added after service completion.
                You will be notified of any additional work before it begins.
              </p>
            </div>
          </div>

          {/* Bottom Total */}
          <div className="mt-auto border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-background-dark p-6 pb-2">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Total Amount</p>
                <h1 className="text-4xl font-extrabold text-primary leading-none">$103.50</h1>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Price Guaranteed
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
            >
              Confirm &amp; Pay
            </button>
          </div>

          <BottomNav variant="user" active="pricing" />
        </div>
      </MobileFrame>
    </div>
  );
}
