import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  TelegramContext,
  TelegramContextValue,
  TelegramUser,
} from "./context/TelegramContext";

// Type-safe Telegram WebApp interface
interface TelegramWebApp {
  ready(): void;
  expand(): void;
  close(): void;
  isExpanded: boolean;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
  };
  BackButton: {
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
    offClick(fn: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: "light" | "medium" | "heavy" | "rigid" | "soft"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
    selectionChanged(): void;
  };
}

function getTWA(): TelegramWebApp | null {
  return (
    (
      window as unknown as {
        Telegram?: { WebApp: TelegramWebApp };
      }
    ).Telegram?.WebApp ?? null
  );
}

interface TelegramProviderProps {
  children: React.ReactNode;
}

export default function TelegramProvider({ children }: TelegramProviderProps) {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [twaUser, setTwaUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");
  const backHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const twa = getTWA();
    if (!twa) return;

    // Detect Telegram Mini App context
    const isInTelegram =
      typeof twa.isExpanded !== "undefined" && twa.platform !== "unknown";
    setIsMiniApp(isInTelegram);

    if (isInTelegram) {
      // Signal app is ready
      twa.ready();
      // Expand to full height
      twa.expand();
      // Set color scheme
      setColorScheme(twa.colorScheme ?? "dark");
      // Extract user info
      setTwaUser(twa.initDataUnsafe?.user ?? null);
      setInitData(twa.initData);

      // Apply Telegram theme CSS variables
      const tp = twa.themeParams;
      const root = document.documentElement;
      if (tp.bg_color) root.style.setProperty("--tg-theme-bg-color", tp.bg_color);
      if (tp.text_color) root.style.setProperty("--tg-theme-text-color", tp.text_color);
      if (tp.hint_color) root.style.setProperty("--tg-theme-hint-color", tp.hint_color);
      if (tp.link_color) root.style.setProperty("--tg-theme-link-color", tp.link_color);
      if (tp.button_color) root.style.setProperty("--tg-theme-button-color", tp.button_color);
      if (tp.button_text_color) root.style.setProperty("--tg-theme-button-text-color", tp.button_text_color);
      if (tp.secondary_bg_color) root.style.setProperty("--tg-theme-secondary-bg-color", tp.secondary_bg_color);

      // Add mini-app class for CSS overrides
      document.body.classList.add("tg-mini-app");
    }

    return () => {
      document.body.classList.remove("tg-mini-app");
    };
  }, []);

  // Back button lifecycle management
  const setBackButtonHandler = useCallback(
    (fn: (() => void) | null) => {
      const twa = getTWA();
      if (!twa || !isMiniApp) return;

      // Remove old handler
      if (backHandlerRef.current) {
        twa.BackButton.offClick(backHandlerRef.current);
      }

      if (fn) {
        backHandlerRef.current = fn;
        twa.BackButton.show();
        twa.BackButton.onClick(fn);
      } else {
        backHandlerRef.current = null;
        twa.BackButton.hide();
      }
    },
    [isMiniApp]
  );

  const haptic: TelegramContextValue["haptic"] = {
    tap: () => {
      try {
        getTWA()?.HapticFeedback.selectionChanged();
      } catch {
        /* noop in browser */
      }
    },
    success: () => {
      try {
        getTWA()?.HapticFeedback.notificationOccurred("success");
      } catch {
        /* noop */
      }
    },
    error: () => {
      try {
        getTWA()?.HapticFeedback.notificationOccurred("error");
      } catch {
        /* noop */
      }
    },
    impact: () => {
      try {
        getTWA()?.HapticFeedback.impactOccurred("medium");
      } catch {
        /* noop */
      }
    },
  };

  const value: TelegramContextValue = {
    isMiniApp,
    twaUser,
    initData,
    colorScheme,
    haptic,
    expand: () => getTWA()?.expand(),
    ready: () => getTWA()?.ready(),
    close: () => getTWA()?.close(),
    setBackButtonHandler,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}
