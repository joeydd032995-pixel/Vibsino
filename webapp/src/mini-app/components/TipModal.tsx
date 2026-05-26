import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Zap, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { useTelegram } from "../context/TelegramContext";
import { toast } from "sonner";

const TipFormSchema = z.object({
  recipientUsername: z.string().min(3).max(20),
  amount: z.string().regex(/^\d+$/, "Must be a number"),
  message: z.string().max(140).optional(),
});

type TipFormValues = z.infer<typeof TipFormSchema>;

interface TipModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultRecipient?: string;
  currentBalance: string;
}

function fmtVibes(s: string): string {
  try {
    const n = BigInt(s);
    return (n / 1000n).toLocaleString("en-US");
  } catch {
    return "0";
  }
}

export default function TipModal({
  open,
  onOpenChange,
  defaultRecipient = "",
  currentBalance,
}: TipModalProps) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();
  const [activeTab, setActiveTab] = useState<"tip" | "boosts">("tip");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<TipFormValues>({
    resolver: zodResolver(TipFormSchema),
    defaultValues: { recipientUsername: defaultRecipient, amount: "1000" },
  });

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const onTipSubmit = async (values: TipFormValues) => {
    haptic.impact();
    try {
      await api.post(
        "/api/monetization/tip",
        values,
        { headers: authHeaders }
      );
      queryClient.invalidateQueries({ queryKey: ["virtualBalance"] });
      haptic.success();
      toast.success(`Sent ${fmtVibes(values.amount)} VIBES to ${values.recipientUsername}! 🎁`);
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      haptic.error();
      toast.error(err instanceof Error ? err.message : "Tip failed");
    }
  };

  const purchaseBoost = async (boostType: "vip" | "doubleDaily") => {
    haptic.impact();
    try {
      const data = await api.post<{ boostType: string; expiresAt: string; newBalance: string }>(
        "/api/monetization/purchase-boost",
        { boostType },
        { headers: authHeaders }
      );
      queryClient.invalidateQueries({ queryKey: ["virtualBalance"] });
      haptic.success();
      toast.success(
        `${boostType === "vip" ? "VIP" : "Double Daily"} activated until ${new Date(data.expiresAt).toLocaleDateString()}! 🌟`
      );
    } catch (err: unknown) {
      haptic.error();
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Tips &amp; Boosts 💸</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 bg-white/5 rounded-xl p-1">
          {(["tip", "boosts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? "bg-amber-500 text-black"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab === "tip" ? "🎁 Send Tip" : "⚡ Boosts"}
            </button>
          ))}
        </div>

        {activeTab === "tip" ? (
          <form onSubmit={handleSubmit(onTipSubmit)} className="space-y-4">
            <div>
              <Label className="text-gray-300">Recipient Username</Label>
              <Input
                {...register("recipientUsername")}
                placeholder="username"
                className="bg-white/5 border-white/10 text-white mt-1"
              />
              {errors.recipientUsername ? (
                <p className="text-red-400 text-xs mt-1">{errors.recipientUsername.message}</p>
              ) : null}
            </div>

            <div>
              <Label className="text-gray-300">
                Amount (VIBES){" "}
                <span className="text-gray-500">· Balance: {fmtVibes(currentBalance)}</span>
              </Label>
              <Input
                {...register("amount")}
                type="number"
                placeholder="1000"
                min="1000"
                className="bg-white/5 border-white/10 text-white mt-1"
              />
              {errors.amount ? (
                <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>
              ) : null}
              <div className="flex gap-2 mt-2">
                {["1000", "5000", "10000"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setValue("amount", v)}
                    className="flex-1 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                  >
                    {fmtVibes(v)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Message (optional)</Label>
              <Input
                {...register("message")}
                placeholder="Good game! 🎰"
                className="bg-white/5 border-white/10 text-white mt-1"
                maxLength={140}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold h-11"
            >
              {isSubmitting ? "Sending..." : (
                <><Send className="w-4 h-4 mr-2" />Send VIBES</>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              Spend VIBES to unlock premium perks
            </p>

            {[
              {
                type: "vip" as const,
                icon: <Star className="w-5 h-5 text-amber-400" />,
                title: "VIP Status",
                desc: "30 days of VIP badge + exclusive perks",
                cost: "50,000 VIBES",
              },
              {
                type: "doubleDaily" as const,
                icon: <Zap className="w-5 h-5 text-blue-400" />,
                title: "Double Daily",
                desc: "7 days of 2x daily VIBES claims",
                cost: "10,000 VIBES",
              },
            ].map((boost) => (
              <motion.div
                key={boost.type}
                className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3"
                whileTap={{ scale: 0.98 }}
              >
                <div className="p-2 bg-white/10 rounded-xl">{boost.icon}</div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{boost.title}</p>
                  <p className="text-gray-400 text-xs">{boost.desc}</p>
                  <p className="text-amber-400 text-xs font-bold mt-0.5">{boost.cost}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => purchaseBoost(boost.type)}
                  className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs px-3"
                >
                  Buy
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
