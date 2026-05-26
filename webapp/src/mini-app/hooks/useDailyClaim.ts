import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

interface DailyClaimResult {
  claimed: string;
  newBalance: string;
  nextClaimAt: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

export function useDailyClaim(nextClaimAt: string | null) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState("");

  // Update countdown every second
  useEffect(() => {
    if (!nextClaimAt) {
      setCountdown("");
      return;
    }

    const update = () => {
      const ms = new Date(nextClaimAt).getTime() - Date.now();
      setCountdown(ms > 0 ? formatCountdown(ms) : "");
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextClaimAt]);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<DailyClaimResult>(
        "/api/demo/daily-claim",
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["virtualBalance"] });
      toast.success(`Claimed ${data.claimed} VIBES! 🎉`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Claim failed");
    },
  });

  const canClaim = !nextClaimAt || Date.now() >= new Date(nextClaimAt).getTime();

  return {
    claim: mutation.mutate,
    isClaimLoading: mutation.isPending,
    canClaim,
    countdown,
    lastClaimed: mutation.data?.claimed,
  };
}
