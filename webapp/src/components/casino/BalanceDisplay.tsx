import { Wallet } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

interface BalanceDisplayProps {
  className?: string;
  showIcon?: boolean;
}

const BalanceDisplay = ({ className = "", showIcon = true }: BalanceDisplayProps) => {
  const user = useAuthStore((s) => s.user);
  const balance = user?.balance ?? 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Wallet className="h-4 w-4 text-gold-DEFAULT" style={{ color: "#f59e0b" }} />}
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-gray-400">Balance</span>
        <span
          className="font-semibold text-sm font-body counter-number"
          style={{ color: "#f59e0b" }}
        >
          ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

export default BalanceDisplay;
