"use client";

import type { Signal } from "@/types";

interface SignalCardProps {
  signal: Signal | null;
  onPlaceOrder?: () => void;
  onDismiss?: () => void;
  loading?: boolean;
  hideActions?: boolean;
}

function formatPrice(price: number, symbol: string): string {
  const digits = symbol.includes("JPY") ? 3 : 5;
  return price.toFixed(digits);
}

function timeRemaining(expiresAt: Date | string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")} remaining`;
}

export function SignalCard({
  signal,
  onPlaceOrder,
  onDismiss,
  loading,
  hideActions,
}: SignalCardProps) {
  if (!signal) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-medium text-[#6b7a8f]">WAIT</p>
        <p className="mt-1 text-sm text-[#6b7a8f]">
          No qualified signal — scanning market...
        </p>
      </div>
    );
  }

  const isBuy = signal.direction.includes("BUY");
  const isActionable =
    signal.direction !== "WAIT" && signal.direction !== "BLOCKED";

  return (
    <div className="card overflow-hidden">
      <div
        className={`px-4 py-3 ${isActionable ? (isBuy ? "bg-[#00d4aa10]" : "bg-[#ff475710]") : "bg-[#1e2836]"}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#6b7a8f]">SIGNAL</p>
            <p
              className={`text-2xl font-bold ${isBuy ? "signal-buy" : "signal-sell"}`}
            >
              {signal.direction.replace("_", " ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6b7a8f]">TRUST SCORE</p>
            <p className="text-3xl font-bold">{signal.trustScore}%</p>
            <p className="text-[10px] text-[#6b7a8f]">
              Technical confluence — not guaranteed
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Stat label="PAIR" value={signal.symbol} />
        <Stat
          label="ENTRY"
          value={`${formatPrice(signal.entryMin, signal.symbol)}–${formatPrice(signal.entryMax, signal.symbol)}`}
        />
        <Stat
          label="STOP LOSS"
          value={formatPrice(signal.stopLoss, signal.symbol)}
        />
        <Stat
          label="TAKE PROFIT"
          value={formatPrice(signal.takeProfit, signal.symbol)}
        />
        <Stat label="R:R" value={`1:${signal.rewardRisk}`} />
        <Stat label="TIMEFRAME" value={signal.timeframe} />
        <Stat label="H1 TREND" value={signal.higherTimeframeTrend} />
        <Stat label="EXPIRES" value={timeRemaining(signal.expiresAt)} />
      </div>

      {signal.reasons.length > 0 && (
        <div className="border-t border-[#1e2836] px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[#6b7a8f]">REASONS</p>
          <ul className="space-y-1">
            {signal.reasons.map((reason) => (
              <li key={reason} className="text-sm text-[#00d4aa]">
                ✓ {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {signal.warnings.length > 0 && (
        <div className="border-t border-[#1e2836] px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[#ffa502]">WARNINGS</p>
          <ul className="space-y-1">
            {signal.warnings.map((w) => (
              <li key={w} className="text-xs text-[#ffa502]">
                ⚠ {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isActionable && !hideActions && (
        <div className="flex gap-2 border-t border-[#1e2836] p-4">
          <button
            onClick={onPlaceOrder}
            disabled={loading}
            className={`flex-1 rounded-lg py-3 text-sm font-bold text-black transition-opacity ${
              isBuy ? "bg-[#00d4aa]" : "bg-[#ff4757] text-white"
            } disabled:opacity-50`}
          >
            {loading ? "VALIDATING..." : "PLACE ORDER"}
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg border border-[#1e2836] px-4 py-3 text-sm text-[#6b7a8f] hover:bg-[#1e2836]"
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#6b7a8f]">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
