"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { prefetchAuthenticated, prefetchPublic } from "@/lib/queries";

// Mount on the landing page and the (app) layout so that every
// authenticated page's data is warming in the background. Public
// endpoints (leaderboards, prize catalog) prefetch unconditionally;
// user-scoped endpoints prefetch once a wallet session exists.
// When the user navigates into /dashboard, /prizes, /trophies,
// /leaderboard, the useQuery hooks on those pages hit a populated
// cache and render instantly, while react-query fires a background
// refetch if the data is stale.
export function AppPrefetcher() {
  const queryClient = useQueryClient();
  const { address, token, isAuthenticated } = useAuth();

  useEffect(() => {
    void prefetchPublic(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated || !address || !token) return;
    void prefetchAuthenticated(queryClient, { wallet: address, token });
  }, [address, isAuthenticated, queryClient, token]);

  return null;
}
