import { createContext, useContext } from "react";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface HapticFeedback {
  /** Light tap feedback for selections */
  tap: () => void;
  /** Confirm or success action */
  success: () => void;
  /** Error or warning action */
  error: () => void;
  /** Medium impact for bets/significant actions */
  impact: () => void;
}

export interface TelegramContextValue {
  /** Whether the app is running inside Telegram Mini App */
  isMiniApp: boolean;
  /** Telegram user data from initDataUnsafe */
  twaUser: TelegramUser | null;
  /** Color scheme from Telegram theme */
  colorScheme: "dark" | "light";
  /** Haptic feedback utilities */
  haptic: HapticFeedback;
  /** Expand the mini app to full screen */
  expand: () => void;
  /** Signal to Telegram the app is ready */
  ready: () => void;
  /** Close the mini app */
  close: () => void;
  /** Set the Telegram BackButton handler (pass null to remove) */
  setBackButtonHandler: (fn: (() => void) | null) => void;
}

export const TelegramContext = createContext<TelegramContextValue | null>(null);

export function useTelegram(): TelegramContextValue {
  const ctx = useContext(TelegramContext);
  if (!ctx) {
    // Return safe fallback when used outside TelegramProvider (web browser context)
    return {
      isMiniApp: false,
      twaUser: null,
      colorScheme: "dark",
      haptic: {
        tap: () => {},
        success: () => {},
        error: () => {},
        impact: () => {},
      },
      expand: () => {},
      ready: () => {},
      close: () => {},
      setBackButtonHandler: () => {},
    };
  }
  return ctx;
}
