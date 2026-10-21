import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "@/components/AdminShell";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "SellerPadi Mission Control — Platform Operations & Telemetry",
  description: "Internal operations, merchant supervision, and relayer monitoring suite.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: "/logo-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
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
