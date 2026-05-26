import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

interface BalanceDisplayProps {
  className?: string;
  showIcon?: boolean;
}

const BalanceDisplay = ({ className = "", showIcon = true }: BalanceDisplayProps) => {
  const user = useAuthStore((s) => s.user);
  const balance = user?.balance ?? 0;
  const prevBalance = useRef(balance);
  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null);

  useEffect(() => {
    if (balance !== prevBalance.current) {
      setFlashColor(balance > prevBalance.current ? "green" : "red");
      prevBalance.current = balance;
      const t = setTimeout(() => setFlashColor(null), 900);
      return () => clearTimeout(t);
    }
  }, [balance]);

  const textColor =
    flashColor === "green" ? "#10b981"
    : flashColor === "red" ? "#ef4444"
    : "#f59e0b";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Wallet className="h-4 w-4" style={{ color: "#f59e0b" }} />}
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-gray-400">Balance</span>
        <motion.span
          className="font-semibold text-sm font-body counter-number"
          animate={{ color: textColor }}
          transition={{ duration: 0.35 }}
          style={{ color: textColor }}
        >
          ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </motion.span>
      </div>
    </div>
  );
};

export default BalanceDisplay;
