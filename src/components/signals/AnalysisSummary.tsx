"use client";

import type { Signal } from "@/types";

interface AnalysisSummaryProps {
  signal: Signal | null;
  trendLabel: string;
}

function timeRemainingShort(expiresAt: Date | string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AnalysisSummary({ signal, trendLabel }: AnalysisSummaryProps) {
  const isActionable =
    !!signal && signal.direction !== "WAIT" && signal.direction !== "BLOCKED";
  const isBuy = signal?.direction.includes("BUY") ?? false;
  const isBearish = trendLabel.toLowerCase().includes("bearish");
  const isBullish = trendLabel.toLowerCase().includes("bullish");

  return (
    <div className="card p-5">
      <p className="mb-3 text-xs font-medium text-[#6b7a8f]">
        Current Analysis
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-[10px] text-[#6b7a8f]">Trend</p>
          <p
            className={`text-lg font-bold ${
              isBullish
                ? "text-[#00d4aa]"
                : isBearish
                  ? "text-[#ff4757]"
                  : "text-[#6b7a8f]"
            }`}
          >
            {trendLabel}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-[#6b7a8f]">Signal</p>
          <p
            className={`text-lg font-bold ${
              !signal
                ? "text-[#6b7a8f]"
                : isBuy
                  ? "text-[#00d4aa]"
                  : isActionable
                    ? "text-[#ff4757]"
                    : "text-[#6b7a8f]"
            }`}
          >
            {signal?.direction.replace("_", " ") ?? "—"}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-[#6b7a8f]">Confidence</p>
          <p className="text-lg font-bold">
            {signal ? `${signal.trustScore}%` : "—"}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-[#6b7a8f]">Entry</p>
          <p
            className={`text-lg font-bold ${
              isActionable ? "text-[#00d4aa]" : "text-[#6b7a8f]"
            }`}
          >
            {isActionable
              ? "NOW"
              : signal
                ? `Wait (${timeRemainingShort(signal.expiresAt)})`
                : "—"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-[#6b7a8f]">
        Technical confluence score — not a guaranteed win probability.
      </p>
    </div>
  );
}
