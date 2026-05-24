import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

const depositSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  currency: z.string().min(1, "Currency is required"),
});

const withdrawSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number"),
  walletAddress: z.string().min(10, "Enter a valid wallet address"),
});

type DepositForm = z.infer<typeof depositSchema>;
type WithdrawForm = z.infer<typeof withdrawSchema>;

interface DepositResponse {
  balance: number;
  transactionId: string;
}

interface WithdrawResponse {
  balance: number;
  transactionId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DepositWithdrawModal = ({ open, onOpenChange }: Props) => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const [activeTab, setActiveTab] = useState("deposit");

  const depositForm = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: "", currency: "USDC" },
  });

  const withdrawForm = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { amount: "", walletAddress: user?.walletAddress ?? "" },
  });

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const depositMutation = useMutation({
    mutationFn: (data: DepositForm) =>
      api.post<DepositResponse>("/api/balance/deposit", { amount: Number(data.amount), currency: data.currency }, { headers: authHeaders }),
    onSuccess: (result) => {
      if (result?.balance !== undefined) {
        updateBalance(result.balance);
      }
      toast.success("Deposit successful!", {
        description: `$${depositForm.getValues("amount")} USDC has been added to your balance.`,
      });
      depositForm.reset({ amount: "", currency: "USDC" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Deposit failed", { description: err.message });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: WithdrawForm) =>
      api.post<WithdrawResponse>("/api/balance/withdraw", { amount: Number(data.amount), walletAddress: data.walletAddress }, { headers: authHeaders }),
    onSuccess: (result) => {
      if (result?.balance !== undefined) {
        updateBalance(result.balance);
      }
      toast.success("Withdrawal initiated!", {
        description: "Your withdrawal is being processed. Funds arrive within 1-3 minutes.",
      });
      withdrawForm.reset({ amount: "", walletAddress: user?.walletAddress ?? "" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Withdrawal failed", { description: err.message });
    },
  });

  const balance = user?.balance ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 border-0"
        style={{
          background: "#0d0d14",
          border: "1px solid rgba(245,158,11,0.2)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.7)",
        }}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-white font-display">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <Wallet className="h-4 w-4" style={{ color: "#f59e0b" }} />
            </div>
            Funds
          </DialogTitle>
        </DialogHeader>

        {/* Current balance display */}
        <div className="px-6 pt-4">
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}
          >
            <span className="text-sm text-gray-400">Current Balance</span>
            <span className="font-display text-xl font-bold" style={{ color: "#f59e0b" }}>
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <div className="px-6">
            <TabsList
              className="w-full h-10 p-1"
              style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              <TabsTrigger
                value="deposit"
                className="flex-1 gap-2 text-sm data-[state=active]:text-white data-[state=inactive]:text-gray-500"
                style={{ "--tw-ring-color": "transparent" } as React.CSSProperties}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                Deposit
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="flex-1 gap-2 text-sm data-[state=active]:text-white data-[state=inactive]:text-gray-500"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Withdraw
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Deposit Tab */}
          <TabsContent value="deposit" className="mt-0">
            <form
              onSubmit={depositForm.handleSubmit((data) => depositMutation.mutate(data))}
              className="p-6 pt-4 space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <Input
                    {...depositForm.register("amount")}
                    placeholder="0.00"
                    className="pl-7 text-white placeholder:text-gray-600"
                    style={{
                      background: "rgba(10,10,15,0.8)",
                      border: "1px solid rgba(245,158,11,0.15)",
                    }}
                  />
                </div>
                {depositForm.formState.errors.amount && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {depositForm.formState.errors.amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Currency</Label>
                <Select
                  value={depositForm.watch("currency")}
                  onValueChange={(v) => depositForm.setValue("currency", v)}
                >
                  <SelectTrigger
                    className="text-white"
                    style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(245,158,11,0.15)" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#13131f", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <SelectItem value="USDC" className="text-white">USDC (USD Coin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick amounts */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Quick Select</Label>
                <div className="grid grid-cols-4 gap-2">
                  {["50", "100", "250", "500"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => depositForm.setValue("amount", amt)}
                      className="py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        background: depositForm.watch("amount") === amt ? "rgba(245,158,11,0.2)" : "rgba(10,10,15,0.8)",
                        border: depositForm.watch("amount") === amt ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(245,158,11,0.1)",
                        color: depositForm.watch("amount") === amt ? "#f59e0b" : "#6b7280",
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm gap-2"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#0a0a0f",
                }}
                disabled={depositMutation.isPending}
              >
                <ArrowDownLeft className="h-4 w-4" />
                {depositMutation.isPending ? "Processing..." : "Deposit Funds"}
              </Button>
            </form>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw" className="mt-0">
            <form
              onSubmit={withdrawForm.handleSubmit((data) => withdrawMutation.mutate(data))}
              className="p-6 pt-4 space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <Input
                    {...withdrawForm.register("amount")}
                    placeholder="0.00"
                    className="pl-7 text-white placeholder:text-gray-600"
                    style={{
                      background: "rgba(10,10,15,0.8)",
                      border: "1px solid rgba(245,158,11,0.15)",
                    }}
                  />
                </div>
                {withdrawForm.formState.errors.amount && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {withdrawForm.formState.errors.amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Wallet Address</Label>
                <Input
                  {...withdrawForm.register("walletAddress")}
                  placeholder="0x..."
                  className="text-white placeholder:text-gray-600 font-mono text-xs"
                  style={{
                    background: "rgba(10,10,15,0.8)",
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}
                />
                {withdrawForm.formState.errors.walletAddress && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {withdrawForm.formState.errors.walletAddress.message}
                  </p>
                )}
              </div>

              {/* Warning */}
              <div
                className="flex gap-2.5 p-3 rounded-lg text-xs"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                <div style={{ color: "#b45309" }}>
                  <p className="font-semibold text-amber-400 mb-0.5">Processing time</p>
                  <p>Withdrawals are processed within 1–3 minutes. Double-check your wallet address — transactions cannot be reversed.</p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm gap-2"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
                disabled={withdrawMutation.isPending || balance === 0}
              >
                <ArrowUpRight className="h-4 w-4" />
                {withdrawMutation.isPending ? "Processing..." : "Withdraw Funds"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DepositWithdrawModal;
