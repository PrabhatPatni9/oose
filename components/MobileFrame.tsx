export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] mx-auto flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-x-hidden border-x border-slate-200 dark:border-slate-800">
      {children}
    </div>
  );
}
