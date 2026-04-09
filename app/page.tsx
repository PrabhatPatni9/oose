"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col h-screen w-screen items-center justify-between p-12 bg-primary overflow-hidden font-display">
      {/* iOS Status Bar Spacer */}
      <div className="h-10" />

      {/* Center Logo */}
      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="relative flex items-center justify-center bg-white/10 p-10 rounded-full backdrop-blur-sm border border-white/20">
          <div className="relative w-32 h-32 flex items-center justify-center text-white">
            <span
              className="material-symbols-outlined select-none"
              style={{
                fontSize: "96px",
                fontVariationSettings: "'FILL' 1, 'wght' 200, 'GRAD' 0, 'opsz' 48",
              }}
            >
              home
            </span>
            <div className="absolute inset-0 flex items-center justify-center pt-4">
              <span
                className="material-symbols-outlined text-primary bg-white rounded-full p-1"
                style={{
                  fontSize: "36px",
                  fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24",
                }}
              >
                settings
              </span>
            </div>
          </div>
        </div>
        <h1 className="mt-8 text-white text-4xl font-bold tracking-widest">HSBMS</h1>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center text-center space-y-2">
        <p className="text-white/90 text-lg font-light tracking-wide italic">
          Your Personal Home Service Manager
        </p>
        <div className="mt-6 flex space-x-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full opacity-100 animate-pulse" />
          <div className="w-1.5 h-1.5 bg-white rounded-full opacity-40" />
          <div className="w-1.5 h-1.5 bg-white rounded-full opacity-20" />
        </div>
      </div>

      {/* iOS Home Indicator */}
      <div className="mt-8 h-1 w-32 bg-white/30 rounded-full" />
    </div>
  );
}
