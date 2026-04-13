"use client";

import { type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";

interface ConnectWalletButtonProps {
  authenticatedLabel?: string;
  className: string;
  idleLabel?: string;
  icon?: ReactNode;
  linkedLabel?: string;
  wrongNetworkLabel?: string;
}

function labelForStatus(
  status: ReturnType<typeof useAuth>["status"],
  labels: {
    authenticatedLabel: string;
    idleLabel: string;
    linkedLabel: string;
    wrongNetworkLabel: string;
  },
): string {
  switch (status) {
    case "connecting":
      return "Opening wallet...";
    case "switching":
      return "Switching to WireFluid...";
    case "signing":
      return "Sign message...";
    case "authenticating":
      return "Linking wallet...";
    case "wrong-network":
      return labels.wrongNetworkLabel;
    case "connected":
      return labels.linkedLabel;
    case "authenticated":
      return labels.authenticatedLabel;
    case "disconnected":
    default:
      return labels.idleLabel;
  }
}

export function ConnectWalletButton({
  authenticatedLabel = "Wallet Linked",
  className,
  idleLabel = "Connect Wallet",
  icon,
  linkedLabel = "Link Wallet",
  wrongNetworkLabel = "Switch to WireFluid",
}: ConnectWalletButtonProps) {
  const { connectAndAuthenticate, isAuthenticated, isBusy, status } = useAuth();

  const label = labelForStatus(status, {
    authenticatedLabel,
    idleLabel,
    linkedLabel,
    wrongNetworkLabel,
  });

  return (
    <button
      className={className}
      disabled={isBusy || isAuthenticated}
      onClick={() => {
        void connectAndAuthenticate();
      }}
      type="button"
    >
      <span>{label}</span>
      {icon}
    </button>
  );
}
