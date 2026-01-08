"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { UserProvider } from "@/components/context/UserContext";
import { ProductDataProvider } from "@/components/context/ProductDataContext";
import { ChatCacheProvider } from "@/components/context/ChatCacheContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ProductDataProvider>
            <ChatCacheProvider>{children}</ChatCacheProvider>
          </ProductDataProvider>
        </UserProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
