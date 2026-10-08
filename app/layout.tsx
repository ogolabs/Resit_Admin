import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "@/components/AdminShell";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "Resit Mission Control — Platform Operations & Telemetry",
  description: "Internal operations, merchant supervision, and relayer monitoring suite.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <QueryProvider>
          <AdminShell>{children}</AdminShell>
        </QueryProvider>
      </body>
    </html>
  );
}
