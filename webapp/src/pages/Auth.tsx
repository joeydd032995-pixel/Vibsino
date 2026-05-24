import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Wallet, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";

const loginSchema = z.object({
  username: z.string().min(2, "Username required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "At least 3 characters").max(20, "Max 20 characters"),
  email: z.string().email("Valid email required").or(z.literal("")).optional(),
  password: z.string().min(6, "At least 6 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const WALLET_OPTIONS = [
  { id: "metamask", name: "MetaMask", icon: "🦊", desc: "Browser Extension", chain: "Ethereum" },
  { id: "phantom", name: "Phantom", icon: "👻", desc: "Browser Extension", chain: "Solana" },
  { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", desc: "Mobile / Extension", chain: "Multi-chain" },
  { id: "walletconnect", name: "WalletConnect", icon: "🔗", desc: "QR Code Scan", chain: "Multi-chain" },
];

const LoginTab = () => {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    // Mock login for Phase 1 — replace with real API call in Phase 2
    await new Promise((r) => setTimeout(r, 800));
    setAuth(
      {
        id: "mock-1",
        username: data.username,
        email: null,
        walletAddress: null,
        walletChain: null,
        balance: 1000,
        role: "user",
        createdAt: new Date().toISOString(),
      },
      "mock-token"
    );
    navigate("/lobby");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            {...register("username")}
            placeholder="your_username"
            className="pl-10 bg-casino-surface border-casino-border text-white placeholder:text-gray-600 focus:border-yellow-500/50"
            style={{ background: "#0f0f1a", borderColor: errors.username ? "#ef4444" : "rgba(245,158,11,0.2)" }}
          />
        </div>
        {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10 pr-10"
            style={{ background: "#0f0f1a", borderColor: errors.password ? "#ef4444" : "rgba(245,158,11,0.2)", color: "white" }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 font-semibold gap-2 mt-2"
        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f" }}
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
        {!isSubmitting && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  );
};

const RegisterTab = () => {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    await new Promise((r) => setTimeout(r, 800));
    setAuth(
      {
        id: "mock-2",
        username: data.username,
        email: data.email ?? null,
        walletAddress: null,
        walletChain: null,
        balance: 100, // welcome bonus
        role: "user",
        createdAt: new Date().toISOString(),
      },
      "mock-token"
    );
    navigate("/lobby");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2">
      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Username <span style={{ color: "#ef4444" }}>*</span></Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            {...register("username")}
            placeholder="choose_username"
            className="pl-10"
            style={{ background: "#0f0f1a", borderColor: errors.username ? "#ef4444" : "rgba(245,158,11,0.2)", color: "white" }}
          />
        </div>
        {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Email <span className="text-gray-600">(optional)</span></Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="pl-10"
            style={{ background: "#0f0f1a", borderColor: "rgba(245,158,11,0.2)", color: "white" }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Password <span style={{ color: "#ef4444" }}>*</span></Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10 pr-10"
            style={{ background: "#0f0f1a", borderColor: errors.password ? "#ef4444" : "rgba(245,158,11,0.2)", color: "white" }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-gray-300 text-sm">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            {...register("confirm")}
            type="password"
            placeholder="••••••••"
            className="pl-10"
            style={{ background: "#0f0f1a", borderColor: errors.confirm ? "#ef4444" : "rgba(245,158,11,0.2)", color: "white" }}
          />
        </div>
        {errors.confirm && <p className="text-xs text-red-400">{errors.confirm.message}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 font-semibold gap-2 mt-1"
        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f" }}
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
        {!isSubmitting && <ArrowRight className="h-4 w-4" />}
      </Button>

      <p className="text-xs text-gray-600 text-center">
        Get $100 welcome bonus on registration
      </p>
    </form>
  );
};

const WalletTab = () => {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = (walletId: string) => {
    setConnecting(walletId);
    setTimeout(() => setConnecting(null), 1500);
  };

  return (
    <div className="pt-2 space-y-3">
      <p className="text-sm text-gray-400 text-center">
        Connect your Web3 wallet to play with crypto assets.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {WALLET_OPTIONS.map((w) => (
          <button
            key={w.id}
            onClick={() => handleConnect(w.id)}
            disabled={connecting !== null}
            className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
            style={{
              background: connecting === w.id ? "rgba(245,158,11,0.1)" : "rgba(19,19,31,0.8)",
              border: `1px solid ${connecting === w.id ? "rgba(245,158,11,0.4)" : "rgba(245,158,11,0.15)"}`,
            }}
            onMouseEnter={(e) => {
              if (!connecting) {
                e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)";
                e.currentTarget.style.background = "rgba(245,158,11,0.06)";
              }
            }}
            onMouseLeave={(e) => {
              if (connecting !== w.id) {
                e.currentTarget.style.borderColor = "rgba(245,158,11,0.15)";
                e.currentTarget.style.background = "rgba(19,19,31,0.8)";
              }
            }}
          >
            <span className="text-2xl">{w.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-white text-sm">{w.name}</p>
              <p className="text-xs text-gray-500">{w.desc} · {w.chain}</p>
            </div>
            <div className="text-xs" style={{ color: "#f59e0b" }}>
              {connecting === w.id ? "Connecting..." : <Wallet className="h-4 w-4" />}
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600 text-center pt-2">
        Wallet signing available in Phase 2. UI preview only.
      </p>
    </div>
  );
};

const Auth = () => {
  return (
    <div className="min-h-screen casino-bg flex items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 60%)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 60%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-1">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mb-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f" }}
            >
              V
            </div>
            <span className="font-display text-2xl font-bold" style={{ color: "#f59e0b" }}>VIBECODE</span>
            <span className="font-display text-sm text-gray-500 tracking-widest">CASINO</span>
          </Link>
        </div>

        {/* Auth card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(13, 13, 20, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.05)",
          }}
        >
          <Tabs defaultValue="login">
            <TabsList
              className="grid w-full grid-cols-3 mb-6 h-9"
              style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              <TabsTrigger
                value="login"
                className="text-xs data-[state=active]:text-black font-medium"
                style={{"--tw-ring-color": "#f59e0b"} as React.CSSProperties}
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="text-xs font-medium">
                Register
              </TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs font-medium">
                Wallet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginTab />
            </TabsContent>
            <TabsContent value="register">
              <RegisterTab />
            </TabsContent>
            <TabsContent value="wallet">
              <WalletTab />
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          By continuing you agree to our{" "}
          <Link to="#" className="text-gray-500 hover:text-gray-400">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
