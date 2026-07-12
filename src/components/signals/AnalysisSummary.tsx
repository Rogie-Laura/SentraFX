"use client";

import type { Signal } from "@/types";

interface AnalysisSummaryProps {
  signal: Signal | null;
  trendLabel: string;
  onPlaceOrder?: () => void;
  onDismiss?: () => void;
  loading?: boolean;
}

function timeRemainingShort(expiresAt: Date | string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPrice(price: number, symbol: string): string {
  const digits = symbol.includes("JPY") ? 3 : 5;
  return price.toFixed(digits);
}

export function AnalysisSummary({
  signal,
  trendLabel,
  onPlaceOrder,
  onDismiss,
  loading,
}: AnalysisSummaryProps) {
  const isActionable =
    !!signal && signal.direction !== "WAIT" && signal.direction !== "BLOCKED";
  const isBuy = signal?.direction.includes("BUY") ?? false;
  const isBearish = trendLabel.toLowerCase().includes("bearish");
  const isBullish = trendLabel.toLowerCase().includes("bullish");

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex-1">
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

        {/* Quick order action — placed beside the summary so it's visible without scrolling */}
        {isActionable && signal && (
          <div className="flex w-full shrink-0 flex-col rounded-lg border border-[#1e2836] bg-[#0b0f14] p-3 lg:w-60">
            <div className="mb-3 grid grid-cols-3 gap-1 text-center">
              <div>
                <p className="text-[9px] text-[#6b7a8f]">ENTRY</p>
                <p className="text-xs font-medium">
                  {formatPrice(
                    (signal.entryMin + signal.entryMax) / 2,
                    signal.symbol
                  )}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-[#6b7a8f]">SL</p>
                <p className="text-xs font-medium text-[#ff4757]">
                  {formatPrice(signal.stopLoss, signal.symbol)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-[#6b7a8f]">TP</p>
                <p className="text-xs font-medium text-[#00d4aa]">
                  {formatPrice(signal.takeProfit, signal.symbol)}
                </p>
              </div>
            </div>

            <button
              onClick={onPlaceOrder}
              disabled={loading}
              className={`w-full rounded-lg py-2.5 text-sm font-bold text-black transition-opacity ${
                isBuy ? "bg-[#00d4aa]" : "bg-[#ff4757] text-white"
              } disabled:opacity-50`}
            >
              {loading ? "VALIDATING..." : "PLACE ORDER"}
            </button>
            <button
              onClick={onDismiss}
              className="mt-2 w-full rounded-lg border border-[#1e2836] py-2 text-xs text-[#6b7a8f] hover:bg-[#1e2836]"
            >
              DISMISS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
