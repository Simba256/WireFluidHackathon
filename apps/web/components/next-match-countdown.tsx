"use client";

import { useEffect, useState } from "react";

const MATCH_SCHEDULE = [
  "2026-04-16T09:30:00.000Z",
  "2026-04-16T14:00:00.000Z",
  "2026-04-17T14:00:00.000Z",
  "2026-04-18T14:00:00.000Z",
].map((iso) => new Date(iso).getTime());

function pickNextMatch(now: number): number | null {
  for (const ts of MATCH_SCHEDULE) {
    if (ts > now) return ts;
  }
  return null;
}

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function NextMatchCountdown() {
  const [label, setLabel] = useState<string>("--:--:--");

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const next = pickNextMatch(now);
      if (next == null) {
        setLabel("LIVE NOW");
        return;
      }
      setLabel(format(next - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="text-5xl font-headline font-black text-secondary tabular-nums">
      {label}
    </p>
  );
}
