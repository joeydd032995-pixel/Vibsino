import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { MOCK_BETS } from "@/lib/games";

interface BetEntry {
  user: string;
  game: string;
  amount: number;
  multiplier: string;
  win: boolean;
  payout: number;
  id: number;
}

const LiveFeed = () => {
  const [entries, setEntries] = useState<BetEntry[]>(
    MOCK_BETS.map((b, i) => ({ ...b, id: i }))
  );
  const counterRef = useRef(MOCK_BETS.length);

  useEffect(() => {
    const interval = setInterval(() => {
      const base = MOCK_BETS[Math.floor(Math.random() * MOCK_BETS.length)];
      const newEntry: BetEntry = {
        ...base,
        amount: parseFloat((Math.random() * 500 + 1).toFixed(2)),
        win: Math.random() > 0.45,
        id: counterRef.current++,
      };
      newEntry.payout = newEntry.win ? newEntry.amount * parseFloat(newEntry.multiplier) : 0;

      setEntries((prev) => [newEntry, ...prev.slice(0, 19)]);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
          style={{
            background: entry.win
              ? "rgba(16, 185, 129, 0.05)"
              : "rgba(239, 68, 68, 0.05)",
            border: `1px solid ${entry.win ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)"}`,
            animation: "fadeInDown 0.3s ease forwards",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 live-pulse"
              style={{ background: entry.win ? "#10b981" : "#ef4444" }}
            />
            <span className="text-gray-300 truncate font-medium">{entry.user}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-gray-500">{entry.game}</span>
            <span style={{ color: "#f59e0b" }}>${entry.amount.toFixed(2)}</span>
            {entry.win ? (
              <div className="flex items-center gap-0.5" style={{ color: "#10b981" }}>
                <TrendingUp className="h-3 w-3" />
                <span>+${entry.payout.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-0.5" style={{ color: "#ef4444" }}>
                <TrendingDown className="h-3 w-3" />
                <span>Loss</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveFeed;
