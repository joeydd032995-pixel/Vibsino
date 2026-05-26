import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Lobby from "./pages/Lobby";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Verify from "./pages/Verify";
import Leaderboard from "./pages/Leaderboard";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Coinflip from "./pages/games/Coinflip";
import Crash from "./pages/games/Crash";
import Roulette from "./pages/games/Roulette";
import Mines from "./pages/games/Mines";
import Slots from "./pages/games/Slots";
import Jackpot from "./pages/games/Jackpot";
import Poker from "./pages/games/Poker";
import ProvablyFairVerify from "./pages/games/ProvablyFairVerify";
import MiniApp from "./mini-app/index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/lobby"
            element={
              <ProtectedRoute>
                <Lobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/verify" element={<Verify />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/provably-fair" element={<ProvablyFairVerify />} />
          <Route path="/games/coinflip" element={<ProtectedRoute><Coinflip /></ProtectedRoute>} />
          <Route path="/games/crash" element={<ProtectedRoute><Crash /></ProtectedRoute>} />
          <Route path="/games/roulette" element={<ProtectedRoute><Roulette /></ProtectedRoute>} />
          <Route path="/games/mines" element={<ProtectedRoute><Mines /></ProtectedRoute>} />
          <Route path="/games/slots" element={<ProtectedRoute><Slots /></ProtectedRoute>} />
          <Route path="/games/jackpot" element={<ProtectedRoute><Jackpot /></ProtectedRoute>} />
          <Route path="/games/poker" element={<ProtectedRoute><Poker /></ProtectedRoute>} />
          {/* Mini App — handles its own auth internally, no ProtectedRoute wrapper */}
          <Route path="/mini-app" element={<MiniApp />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
