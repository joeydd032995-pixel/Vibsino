import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BalanceDisplay from "@/components/casino/BalanceDisplay";
import NotificationBell from "@/components/casino/NotificationBell";
import { useAuthStore } from "@/stores/useAuthStore";
import { useState } from "react";
import DepositWithdrawModal from "@/components/casino/DepositWithdrawModal";

interface NavbarProps {
  onMenuClick?: () => void;
}

const Navbar = ({ onMenuClick }: NavbarProps) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [depositOpen, setDepositOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <header
        className="h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-30"
        style={{
          background: "rgba(10, 10, 15, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(245, 158, 11, 0.1)",
        }}
      >
        {/* Left: logo + mobile menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/lobby" className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              V
            </div>
            <span className="font-display text-sm font-bold hidden sm:block" style={{ color: "#f59e0b" }}>
              VIBECODE
            </span>
            <span className="font-display text-sm text-gray-400 hidden sm:block">CASINO</span>
          </Link>
        </div>

        {/* Right: balance + notifications + user menu */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Balance + Deposit button */}
          <div className="flex items-center gap-2">
            <BalanceDisplay />
            <Button
              size="sm"
              className="h-7 px-2 gap-1 text-xs font-semibold hidden sm:flex"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#0a0a0f",
              }}
              onClick={() => setDepositOpen(true)}
            >
              <Plus className="h-3 w-3" />
              Deposit
            </Button>
          </div>

          {/* Notification bell */}
          <NotificationBell />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-2 text-gray-300 hover:text-white"
                style={{ border: "1px solid rgba(245, 158, 11, 0.2)" }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                  style={{ background: "linear-gradient(135deg, #f59e0b44, #d9770644)", color: "#f59e0b" }}
                >
                  {user?.username?.[0] ?? "?"}
                </div>
                <span className="hidden sm:block text-xs">{user?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44"
              style={{ background: "#13131f", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDepositOpen(true)}
                className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white sm:hidden"
              >
                <Plus className="h-4 w-4" />
                Deposit / Withdraw
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: "rgba(245,158,11,0.1)" }} />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer"
                style={{ color: "#ef4444" }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <DepositWithdrawModal open={depositOpen} onOpenChange={setDepositOpen} />
    </>
  );
};

export default Navbar;
