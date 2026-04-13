"use client";

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useAuth } from "@/components/auth-provider";

export function FinalCtaWalletAction() {
  const { address, isAuthenticated } = useAuth();

  return (
    <ConnectWalletButton
      authenticatedLabel={
        isAuthenticated && address
          ? `LINKED ${address.slice(0, 6)}...${address.slice(-4)}`
          : "WALLET LINKED"
      }
      className="mt-12 rounded-full bg-primary px-12 py-6 font-headline text-2xl font-black text-on-primary shadow-2xl transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
      idleLabel="CONNECT YOUR WALLET"
      linkedLabel="LINK WALLET"
      wrongNetworkLabel="SWITCH TO WIREFLUID"
    />
  );
}
