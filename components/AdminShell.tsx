"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Server,
  Building2,
  FileSpreadsheet,
  AlertOctagon,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Radio,
} from "lucide-react";

interface AdminShellProps {
  children: React.ReactNode;
}

interface AdminSession {
  email: string;
  role: string;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = (await res.json()) as { authenticated: boolean; email?: string; role?: string };
          if (data.authenticated && data.email) {
            setSession({ email: data.email, role: data.role || "superadmin" });
          }
        }
      } catch {
        // Fallback silently if session fetch errors
      }
    }
    loadSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    { label: "Executive Pulse", href: "/", icon: Activity },
    { label: "Infrastructure", href: "/infrastructure", icon: Server },
    { label: "Merchant Directory", href: "/merchants", icon: Building2 },
    { label: "Universal Ledger", href: "/records", icon: FileSpreadsheet },
    { label: "Incidents & Errors", href: "/incidents", icon: AlertOctagon },
  ];

  const isCurrentActive = (href: string) => {
    if (href === "/" && (pathname === "/" || pathname === "/dashboard")) return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-white">Resit Admin</span>
            <span className="block text-[10px] text-slate-400">Mission Control</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Desktop Sidebar & Mobile Drawer */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-50 transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5">
          {/* Logo Brand */}
          <div className="hidden md:flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm tracking-tight text-white truncate">Resit Mission Control</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-slate-400">Ledger Online</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isCurrentActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Session Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="mb-3 px-1">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-mono text-emerald-400 font-medium">Electroneum</span>
            </div>
            <p className="text-xs text-slate-300 font-medium truncate">
              {session?.email || "admin@resit.co"}
            </p>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              {session?.role || "Operator"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-slate-950 flex flex-col min-h-screen">
        {/* Top Status Bar */}
        <div className="border-b border-slate-800 bg-slate-900/40 px-4 sm:px-8 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Environment:</span>
            <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono text-[11px]">
              Production / Telemetry
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Relayer: Ready</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>DB: Connected</span>
            </div>
          </div>
        </div>

        {/* Page Inner Content */}
        <div className="p-4 sm:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
