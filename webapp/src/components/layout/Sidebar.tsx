import { Link, useLocation } from "react-router-dom";
import { Home, User, Trophy, Zap, X, ShieldCheck, LayoutDashboard } from "lucide-react";
import { GAMES } from "@/lib/games";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const BASE_NAV = [
  { icon: Home, label: "Lobby", path: "/lobby", adminOnly: false },
  { icon: Trophy, label: "Leaderboard", path: "/leaderboard", adminOnly: false },
  { icon: ShieldCheck, label: "Verify", path: "/verify", adminOnly: false },
  { icon: User, label: "Profile", path: "/profile", adminOnly: false },
  { icon: LayoutDashboard, label: "Admin", path: "/admin", adminOnly: true },
];

const Sidebar = ({ open = true, onClose }: SidebarProps) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const navItems = BASE_NAV.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed md:relative z-50 md:z-auto flex flex-col h-full w-60 flex-shrink-0 transition-transform duration-300",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "#0a0a0f",
          borderRight: "1px solid rgba(245, 158, 11, 0.1)",
        }}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 md:hidden">
          <span className="font-display text-sm font-bold" style={{ color: "#f59e0b" }}>
            MENU
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-3 pt-4 md:pt-6 pb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 px-3 mb-2">
            Navigation
          </p>
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                )}
                style={
                  active
                    ? {
                        background: "rgba(245, 158, 11, 0.12)",
                        borderLeft: "2px solid #f59e0b",
                        color: "#f59e0b",
                      }
                    : {}
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-3 my-2" style={{ borderTop: "1px solid rgba(245,158,11,0.08)" }} />

        {/* Games list */}
        <nav className="px-3 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 px-3 mb-2">
            Games
          </p>
          {GAMES.map((game) => {
            const active = location.pathname === `/games/${game.id}`;
            return (
              <Link
                key={game.id}
                to={`/games/${game.id}`}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-all duration-200",
                  active
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                )}
                style={active ? { background: "rgba(245, 158, 11, 0.08)", color: "#f59e0b" } : {}}
              >
                <span className="text-base w-5 text-center">{game.icon}</span>
                <span className="font-medium">{game.name}</span>
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full live-pulse"
                  style={{ background: "#10b981" }}
                />
              </Link>
            );
          })}
        </nav>

        {/* Bottom: version */}
        <div className="p-4">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.1)" }}
          >
            <Zap className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
            <div>
              <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>Provably Fair</p>
              <p className="text-xs text-gray-600">All games verified</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
