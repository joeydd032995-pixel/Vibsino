import { ethers } from "ethers";

export function generateNonce(): string {
  return `Sign this message to authenticate with Vibecode Casino.\nNonce: ${Date.now()}-${Math.random().toString(36).substring(2)}`;
}

export async function verifyEthereumSignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

export async function verifySolanaSignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const nacl = await import("tweetnacl");
    const bs58 = await import("bs58");
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.default.decode(signature);
    const publicKeyBytes = bs58.default.decode(publicKey);
    return nacl.default.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch {
    return false;
  }
}
