import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

export interface VirtualBalanceData {
  amount: string;
  currency: string;
  lastDailyClaim: string | null;
  canClaim: boolean;
  nextClaimAt: string | null;
}

export function useVirtualBalance() {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: ["virtualBalance"],
    queryFn: () =>
      api.get<VirtualBalanceData>("/api/demo/balance", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    enabled: !!token,
    staleTime: 5_000,
    refetchInterval: 30_000,
  });

  return {
    balance: query.data?.amount ?? "0",
    currency: query.data?.currency ?? "VIBES",
    lastDailyClaim: query.data?.lastDailyClaim ?? null,
    canClaim: query.data?.canClaim ?? false,
    nextClaimAt: query.data?.nextClaimAt ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
