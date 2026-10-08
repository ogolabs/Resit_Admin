"use client";

import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAdminQueryClient } from "@/lib/query-config";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createAdminQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
