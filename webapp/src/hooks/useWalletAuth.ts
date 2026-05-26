import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

interface User {
  id: string;
  username: string;
  email: string | null;
  walletAddress: string | null;
  walletChain: string | null;
  balance: number;
  role: string;
  createdAt: string;
}

interface WalletLoginResponse {
  token: string;
  user: User;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        signMessage: (
          message: Uint8Array,
          encoding: string
        ) => Promise<{ signature: Uint8Array }>;
      };
    };
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      signMessage: (
        message: Uint8Array,
        encoding: string
      ) => Promise<{ signature: Uint8Array }>;
    };
  }
}

export function useWalletAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);

  async function connectMetaMask(): Promise<void> {
    const eth = window.ethereum;
    if (!eth) {
      throw new Error(
        "MetaMask is not installed. Please install the MetaMask browser extension and try again."
      );
    }

    // 1. Request accounts
    const accounts = (await eth.request({
      method: "eth_requestAccounts",
    })) as string[];
    const address = accounts[0];
    if (!address) throw new Error("No account selected in MetaMask.");

    // 2. Get nonce from backend
    const { nonce } = await api.post<{ nonce: string }>(
      "/api/auth/wallet-nonce",
      { address }
    );

    // 3. Sign the nonce
    const signature = (await eth.request({
      method: "personal_sign",
      params: [nonce, address],
    })) as string;

    // 4. Login / auto-register
    const result = await api.post<WalletLoginResponse>("/api/auth/wallet-login", {
      address,
      signature,
      message: nonce,
      chain: "ethereum",
    });

    setAuth(result.user, result.token);
  }

  async function connectPhantom(): Promise<void> {
    const phantom = window.phantom?.solana ?? window.solana;
    if (!phantom?.isPhantom) {
      throw new Error(
        "Phantom is not installed. Please install the Phantom browser extension and try again."
      );
    }

    // 1. Connect wallet
    const { publicKey } = await phantom.connect();
    const address = publicKey.toString();

    // 2. Get nonce
    const { nonce } = await api.post<{ nonce: string }>(
      "/api/auth/wallet-nonce",
      { address }
    );

    // 3. Sign nonce
    const encoded = new TextEncoder().encode(nonce);
    const { signature: sigBytes } = await phantom.signMessage(encoded, "utf8");
    // Convert Uint8Array signature to hex string for backend
    const signatureHex = Array.from(sigBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 4. Login / auto-register
    const result = await api.post<WalletLoginResponse>("/api/auth/wallet-login", {
      address,
      signature: signatureHex,
      message: nonce,
      chain: "solana",
    });

    setAuth(result.user, result.token);
  }

  return { connectMetaMask, connectPhantom };
}
