"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { ApiClientError } from "@/lib/api-client";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function UsernameDialog() {
  const { needsUsername, setUsername } = useAuth();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmed = value.trim();
      if (!USERNAME_REGEX.test(trimmed)) {
        setError("3–20 characters: letters, numbers, and underscores only");
        return;
      }

      setSubmitting(true);
      try {
        await setUsername(trimmed);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [setUsername, value],
  );

  if (!needsUsername) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <form
        className="glass-panel mx-4 flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-outline-variant/30 p-6 shadow-2xl"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Choose your username
          </h2>
          <p className="text-sm text-on-surface-variant">
            This is permanent and visible on the leaderboard.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            autoComplete="off"
            autoFocus
            className="w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={submitting}
            maxLength={20}
            minLength={3}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="e.g. CricketKing_99"
            type="text"
            value={value}
          />
          {error && (
            <p className="text-xs font-medium text-error">{error}</p>
          )}
          <p className="text-[11px] text-on-surface-variant/60">
            3–20 characters · letters, numbers, underscores
          </p>
        </div>

        <button
          className="pitch-gradient w-full rounded-lg px-4 py-2.5 text-sm font-bold text-on-primary transition-opacity disabled:opacity-50"
          disabled={submitting || value.trim().length < 3}
          type="submit"
        >
          {submitting ? "Setting..." : "Lock In Username"}
        </button>
      </form>
    </div>
  );
}
