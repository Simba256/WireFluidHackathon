"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SiweMessage } from "siwe";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { WIREFLUID_CHAIN_ID } from "@boundaryline/shared";
import { apiFetch, ApiClientError } from "@/lib/api-client";

const SESSION_STORAGE_KEY = "boundaryline.session";

type PendingState =
  | "idle"
  | "connecting"
  | "switching"
  | "signing"
  | "authenticating";

type DerivedStatus =
  | "disconnected"
  | "connected"
  | "wrong-network"
  | "authenticated"
  | Exclude<PendingState, "idle">;

interface SessionState {
  token: string;
  wallet: string;
}

interface VerifyResponse {
  token: string;
  user: {
    wallet: string;
    createdAt: string;
  };
}

interface NonceResponse {
  nonce: string;
}

interface AuthContextValue {
  address: string | null;
  error: string | null;
  hasSession: boolean;
  isAuthenticated: boolean;
  isBusy: boolean;
  isConnected: boolean;
  isWrongNetwork: boolean;
  status: DerivedStatus;
  connectAndAuthenticate: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeWallet(wallet: string): string {
  return wallet.toLowerCase();
}

function formatAuthError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (!(error instanceof Error)) {
    return "Failed to link wallet";
  }

  const lower = error.message.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("rejected the request")
  ) {
    return "Wallet action was rejected";
  }

  if (
    lower.includes("connector not found") ||
    lower.includes("provider not found")
  ) {
    return "No injected wallet found. Install MetaMask or another EVM wallet.";
  }

  if (lower.includes("switch chain not supported")) {
    return "Your wallet cannot switch networks automatically. Add WireFluid Testnet manually.";
  }

  return error.message || "Failed to link wallet";
}

function readStoredSession(): SessionState | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (typeof parsed.token !== "string" || typeof parsed.wallet !== "string") {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return {
      token: parsed.token,
      wallet: normalizeWallet(parsed.wallet),
    };
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: SessionState | null): void {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();

  const [session, setSession] = useState<SessionState | null>(null);
  const [pendingState, setPendingState] = useState<PendingState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(readStoredSession());
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    writeStoredSession(null);
  }, []);

  const persistSession = useCallback((nextSession: SessionState) => {
    setSession(nextSession);
    writeStoredSession(nextSession);
  }, []);

  const normalizedAddress = address ? normalizeWallet(address) : null;
  const hasSession = Boolean(session);
  const isSessionWalletMatch = Boolean(
    session && normalizedAddress && session.wallet === normalizedAddress,
  );
  const isWrongNetwork = isConnected && chainId !== WIREFLUID_CHAIN_ID;
  const isAuthenticated = Boolean(
    isConnected && session && isSessionWalletMatch,
  );
  const isBusy = pendingState !== "idle";

  useEffect(() => {
    if (session && normalizedAddress && session.wallet !== normalizedAddress) {
      clearSession();
    }
  }, [clearSession, normalizedAddress, session]);

  const connectAndAuthenticate = useCallback(async () => {
    setError(null);

    try {
      let nextAddress = address ?? null;
      let nextNormalizedAddress = normalizedAddress;
      let nextChainId = chainId;

      if (!isConnected) {
        const connector = connectors[0];
        if (!connector) {
          throw new Error("Connector not found");
        }

        setPendingState("connecting");
        const result = await connectAsync({ connector });
        nextAddress = result.accounts[0] ?? null;
        nextNormalizedAddress = nextAddress
          ? normalizeWallet(nextAddress)
          : null;
        nextChainId = result.chainId;
      }

      if (!nextAddress || !nextNormalizedAddress) {
        throw new Error("Wallet address unavailable");
      }

      if (nextChainId !== WIREFLUID_CHAIN_ID) {
        if (!switchChainAsync) {
          throw new Error("Switch chain not supported");
        }

        setPendingState("switching");
        const switched = await switchChainAsync({
          chainId: WIREFLUID_CHAIN_ID,
        });
        nextChainId = switched.id;
      }

      if (nextChainId !== WIREFLUID_CHAIN_ID) {
        throw new Error("Wrong network selected");
      }

      setPendingState("signing");
      const { nonce } = await apiFetch<NonceResponse>("/api/auth/nonce");
      const message = new SiweMessage({
        address: nextAddress,
        chainId: WIREFLUID_CHAIN_ID,
        domain: window.location.host,
        nonce,
        statement: "Sign in to BoundaryLine to link your wallet.",
        uri: window.location.origin,
        version: "1",
      }).prepareMessage();

      const signature = await signMessageAsync({ message });

      setPendingState("authenticating");
      const verified = await apiFetch<VerifyResponse>("/api/auth/verify", {
        json: { message, signature },
        method: "POST",
      });

      persistSession({
        token: verified.token,
        wallet: normalizeWallet(verified.user.wallet),
      });
      setPendingState("idle");
    } catch (err) {
      setPendingState("idle");
      setError(formatAuthError(err));
      throw err;
    }
  }, [
    address,
    chainId,
    connectAsync,
    connectors,
    isConnected,
    normalizedAddress,
    persistSession,
    signMessageAsync,
    switchChainAsync,
  ]);

  const logout = useCallback(async () => {
    setError(null);

    try {
      if (session?.token) {
        await apiFetch<void>("/api/auth/logout", {
          method: "POST",
          token: session.token,
        });
      }
    } catch {
      // Best effort: local logout should still succeed even if the API call fails.
    }

    clearSession();

    if (isConnected) {
      try {
        await disconnectAsync();
      } catch {
        // Local session state is already cleared.
      }
    }
  }, [clearSession, disconnectAsync, isConnected, session?.token]);

  const status: DerivedStatus = useMemo(() => {
    if (pendingState !== "idle") {
      return pendingState;
    }

    if (!isConnected) {
      return "disconnected";
    }

    if (isWrongNetwork) {
      return "wrong-network";
    }

    if (isAuthenticated) {
      return "authenticated";
    }

    return "connected";
  }, [isAuthenticated, isConnected, isWrongNetwork, pendingState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      address: normalizedAddress,
      error,
      hasSession,
      isAuthenticated,
      isBusy,
      isConnected,
      isWrongNetwork,
      status,
      connectAndAuthenticate,
      logout,
    }),
    [
      connectAndAuthenticate,
      error,
      hasSession,
      isAuthenticated,
      isBusy,
      isConnected,
      isWrongNetwork,
      logout,
      normalizedAddress,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
