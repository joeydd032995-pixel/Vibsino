/**
 * Subscribes to all global socket events (crash, chat, notifications).
 * Mount this once at a high level (e.g. inside a game layout or App).
 */
import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import { useCrashStore, type CrashBetDisplay } from "@/stores/useCrashStore";
import { useChatStore, type ChatMessage } from "@/stores/useChatStore";
import { toast } from "sonner";

export function useSocketListeners(socket: Socket | null) {
  // Select only stable action references to avoid re-registering on every state update
  const hydrateRound = useCrashStore((s) => s.hydrateRound);
  const setWaitingState = useCrashStore((s) => s.setWaitingState);
  const setBettingState = useCrashStore((s) => s.setBettingState);
  const setFlyingState = useCrashStore((s) => s.setFlyingState);
  const setMultiplier = useCrashStore((s) => s.setMultiplier);
  const addBet = useCrashStore((s) => s.addBet);
  const markCashedOut = useCrashStore((s) => s.markCashedOut);
  const setCrashedState = useCrashStore((s) => s.setCrashedState);
  const addMessage = useChatStore((s) => s.addMessage);
  const setHistory = useChatStore((s) => s.setHistory);

  useEffect(() => {
    if (!socket) return;

    // ── Crash events ──────────────────────────────────────────────────────
    const onCrashState = (data: {
      status: "waiting" | "betting" | "flying" | "crashed";
      serverSeedHash: string | null;
      bets: CrashBetDisplay[];
      currentMultiplier: number;
      elapsed: number;
      roundId: string;
      bettingEndsAt?: number | null;
    }) => {
      hydrateRound(data);
    };

    const onCrashWaiting = (data: {
      prevCrashPoint: number | null;
      prevServerSeed: string | null;
    }) => {
      setWaitingState(data.prevCrashPoint, data.prevServerSeed);
    };

    const onCrashBetting = (data: {
      roundId: string;
      serverSeedHash: string;
      bettingEndsAt: number;
    }) => {
      setBettingState(data.roundId, data.serverSeedHash, data.bettingEndsAt);
    };

    const onCrashFlying = () => {
      setFlyingState();
    };

    const onCrashTick = (data: { multiplier: number; elapsed: number }) => {
      setMultiplier(data.multiplier, data.elapsed);
    };

    const onCrashBetPlaced = (data: {
      userId: string;
      username: string;
      amount: number;
      autoCashout: number;
    }) => {
      addBet({
        ...data,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
      });
    };

    const onCrashCashout = (data: {
      userId: string;
      username: string;
      multiplier: number;
      payout: number;
    }) => {
      markCashedOut(data.userId, data.multiplier, data.payout);
    };

    const onCrashCrashed = (data: {
      crashPoint: number;
      serverSeed: string;
      serverSeedHash: string;
      bets: CrashBetDisplay[];
    }) => {
      setCrashedState(
        data.crashPoint,
        data.serverSeed,
        data.serverSeedHash,
        data.bets
      );
    };

    // ── Chat events ───────────────────────────────────────────────────────
    const onChatMessage = (msg: ChatMessage) => {
      addMessage(msg);
    };

    const onChatHistory = (data: { room: string; messages: ChatMessage[] }) => {
      setHistory(data.room, data.messages);
    };

    // ── Notification events ───────────────────────────────────────────────
    const onNotification = (data: {
      type: string;
      title: string;
      message: string;
    }) => {
      toast.success(data.title, { description: data.message });
    };

    socket.on("crash:state", onCrashState);
    socket.on("crash:waiting", onCrashWaiting);
    socket.on("crash:betting", onCrashBetting);
    socket.on("crash:flying", onCrashFlying);
    socket.on("crash:tick", onCrashTick);
    socket.on("crash:bet_placed", onCrashBetPlaced);
    socket.on("crash:cashout", onCrashCashout);
    socket.on("crash:crashed", onCrashCrashed);
    socket.on("chat:message", onChatMessage);
    socket.on("chat:history", onChatHistory);
    socket.on("notification", onNotification);

    return () => {
      socket.off("crash:state", onCrashState);
      socket.off("crash:waiting", onCrashWaiting);
      socket.off("crash:betting", onCrashBetting);
      socket.off("crash:flying", onCrashFlying);
      socket.off("crash:tick", onCrashTick);
      socket.off("crash:bet_placed", onCrashBetPlaced);
      socket.off("crash:cashout", onCrashCashout);
      socket.off("crash:crashed", onCrashCrashed);
      socket.off("chat:message", onChatMessage);
      socket.off("chat:history", onChatHistory);
      socket.off("notification", onNotification);
    };
  }, [
    socket,
    hydrateRound,
    setWaitingState,
    setBettingState,
    setFlyingState,
    setMultiplier,
    addBet,
    markCashedOut,
    setCrashedState,
    addMessage,
    setHistory,
  ]);
}
