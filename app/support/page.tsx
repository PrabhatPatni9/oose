"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileFrame from "@/components/MobileFrame";
import { getSupabase } from "@/lib/supabase";

interface LastService {
  name: string;
  completed: string;
}

export default function SupportPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [ticketStatus, setTicketStatus] = useState<string>("open");
  const [files, setFiles] = useState<FileList | null>(null);
  const [ref, setRef] = useState<LastService | null>(null);

  useEffect(() => {
    async function loadRef() {
      const supabase = getSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: hist } = await supabase
        .from("service_history")
        .select("completion_date, bookings(services(name))")
        .order("completion_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      const h = hist as {
        completion_date: string;
        bookings: { services: { name: string } | null } | null;
      } | null;
      if (h?.completion_date) {
        setRef({
          name: h.bookings?.services?.name ?? "Recent service",
          completed: new Date(h.completion_date).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
        });
      }
    }
    loadRef();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    const supabase = getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      router.push("/login");
      return;
    }
    const attachmentNote =
      files && files.length > 0 ? `\n[Attachments: ${files.length} file(s) selected — upload pipeline can be wired to Storage.]` : "";
    const { data, error } = await supabase
      .from("issued_reports")
      .insert({
        description: `${description.trim()}${attachmentNote}`,
        status: "open",
      })
      .select("id, status")
      .single();
    setLoading(false);
    if (error) {
      return;
    }
    setTicketId(data?.id ?? null);
    setTicketStatus(data?.status ?? "open");
    setSubmitted(true);
  }

  const timeline = submitted
    ? [
        {
          done: true,
          icon: "check",
          iconClass: "bg-emerald-500 text-white",
          label: "Issue raised",
          sub: `Ticket #${ticketId ?? "—"} logged`,
        },
        {
          done: ticketStatus !== "open",
          icon: "person",
          iconClass: ticketStatus === "open" ? "bg-slate-300 dark:bg-slate-600 text-white" : "bg-primary text-white",
          label: "Support assignment",
          sub: ticketStatus === "open" ? "Waiting for agent pickup" : "Assigned — team notified",
          active: ticketStatus === "open",
        },
        {
          done: ticketStatus === "resolved",
          icon: "",
          iconClass: "bg-slate-200 dark:bg-slate-800 text-slate-400",
          label: "Investigation",
          sub: ticketStatus === "in_progress" ? "In progress" : "Pending",
          pending: ticketStatus === "open",
        },
        {
          done: ticketStatus === "resolved",
          icon: "",
          iconClass: "bg-slate-200 dark:bg-slate-800 text-slate-400",
          label: "Resolution",
          sub: ticketStatus === "resolved" ? "Closed" : "Awaiting resolution",
          pending: ticketStatus !== "resolved",
        },
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <MobileFrame>
        <div className="flex min-h-screen flex-col bg-white dark:bg-background-dark overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          <div className="sticky top-0 z-10 flex items-center bg-white dark:bg-background-dark p-4 border-b border-slate-200 dark:border-slate-800 justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
              {submitted ? `Ticket #${ticketId ?? "—"}` : "Report an issue"}
            </h2>
          </div>

          <div className="flex flex-col flex-1">
            <div className="px-4 pt-5 pb-2">
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col gap-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Service reference</p>
                <p className="text-slate-900 dark:text-white font-bold text-lg">{ref?.name ?? "No completed visits yet"}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {ref ? `Last completed ${ref.completed}` : "Book a service to attach history automatically."}
                </p>
              </div>
            </div>

            {!submitted && (
              <>
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold px-4 pb-2 pt-4">Issue details</h3>
                <form id="support-form" onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-2">
                  <label className="flex flex-col w-full">
                    <span className="text-slate-700 dark:text-slate-300 text-sm font-medium pb-2">What&apos;s the problem?</span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full resize-y min-h-[8rem] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 placeholder:text-slate-400 p-4 text-base"
                      placeholder="Describe what went wrong, when it happened, and any booking IDs if you have them."
                      required
                    />
                  </label>
                </form>

                <div className="flex flex-col p-4">
                  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-6 py-8">
                    <span className="material-symbols-outlined text-primary text-4xl">add_a_photo</span>
                    <p className="text-slate-900 dark:text-slate-100 text-base font-bold text-center">Upload photos</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs text-center max-w-[260px]">
                      Optional — helps us diagnose faster. Files are noted on your ticket (Storage hook-up next).
                    </p>
                    <label className="flex min-w-[140px] cursor-pointer items-center justify-center rounded-xl h-11 px-6 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold">
                      <span className="truncate">{files?.length ? `${files.length} file(s)` : "Choose files"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => setFiles(e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              </>
            )}

            {submitted && (
              <div className="px-4 py-4">
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold pb-3">Tracking status</h3>
                <div className="relative flex flex-col gap-6 pl-1">
                  <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />
                  {timeline.map((step, i) => (
                    <div key={i} className="relative flex gap-4">
                      <div
                        className={`z-10 flex size-7 items-center justify-center rounded-full ${step.iconClass} ring-4 ring-white dark:ring-background-dark shrink-0`}
                      >
                        {step.icon ? (
                          <span className="material-symbols-outlined text-[16px] font-bold">{step.icon}</span>
                        ) : (
                          <div className="size-2 rounded-full bg-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <p
                          className={`text-sm font-bold ${
                            step.pending ? "text-slate-400 dark:text-slate-600" : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{step.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="mt-6 w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200"
                >
                  Back to home
                </button>
              </div>
            )}
          </div>

          {!submitted && (
            <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-20 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                form="support-form"
                disabled={loading || !description.trim()}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit issue report"}
              </button>
            </div>
          )}
        </div>
      </MobileFrame>
    </div>
  );
}
