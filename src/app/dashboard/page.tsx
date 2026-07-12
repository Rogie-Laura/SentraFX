"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SignalCard } from "@/components/signals/SignalCard";
import { AnalysisSummary } from "@/components/signals/AnalysisSummary";
import { CandleChart } from "@/components/charts/CandleChart";
import { EmergencyStopButton } from "@/components/trading/EmergencyStopButton";
import {
  playAlertSound,
  requestNotificationPermission,
} from "@/modules/notifications";
import type { Signal, TradingStyle } from "@/types";
import { useEffect, useRef, useState } from "react";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"] as const;

const STYLE_LABELS: Record<TradingStyle, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  aggressive: "Aggressive",
  custom: "Custom",
};

function formatSymbol(symbol: string): string {
  return symbol.length === 6 ? `${symbol.slice(0, 3)}/${symbol.slice(3)}` : symbol;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const prevScoreRef = useRef<number>(0);
  const [symbol, setSymbol] = useState<string>("EURUSD");
  const [initialized, setInitialized] = useState(false);

  // Seed the selected pair from saved settings once on first load
  useEffect(() => {
    if (initialized) return;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.trading?.selectedSymbol) {
          setSymbol(data.trading.selectedSymbol);
        }
        setInitialized(true);
      })
      .catch(() => setInitialized(true));
  }, [initialized]);

  // AI decides the timeframe cascade automatically — no manual timeframe picker
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", symbol],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?symbol=${symbol}`);
      if (!res.ok) throw new Error("Dashboard fetch failed");
      return res.json();
    },
    enabled: initialized,
    refetchInterval: 5000,
    staleTime: 4000,
  });

  const changePairMutation = useMutation({
    mutationFn: async (newSymbol: string) => {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "trading",
          data: { selectedSymbol: newSymbol },
        }),
      });
      return newSymbol;
    },
    onSuccess: (newSymbol) => {
      setSymbol(newSymbol);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const signal = data?.signal as Signal | undefined;
    if (
      signal &&
      signal.trustScore >= 60 &&
      signal.trustScore !== prevScoreRef.current &&
      signal.direction !== "WAIT"
    ) {
      playAlertSound();
      prevScoreRef.current = signal.trustScore;
    }
  }, [data]);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "place-order",
          signal: data?.signal,
          idempotencyKey: uuidv4(),
        }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const emergencyStopMutation = useMutation({
    mutationFn: async (mode: "stop_new" | "stop_and_close") => {
      const res = await fetch("/api/trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "emergency-stop", mode }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/signals?action=dismiss", { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  });

  const quote = data?.quote;
  const signal: Signal | null = data?.signal ?? null;
  const position = data?.position;
  const candles = data?.candles ?? [];
  const timeframeAnalysis = data?.timeframeAnalysis ?? [];
  const session = data?.session;
  const tradingStyle: TradingStyle = data?.tradingStyle ?? "balanced";
  const chartTimeframe = data?.chartTimeframe ?? "M5";
  const hasOpenPosition = !!position;

  if (isLoading || !initialized) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-2xl">◉</div>
            <p className="text-sm text-[#6b7a8f]">Loading market data...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-[#6b7a8f]">
            {formatSymbol(symbol)} · Paper Trading
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pair selector — single-pair policy: switching replaces the monitored pair */}
          <select
            value={symbol}
            disabled={hasOpenPosition || changePairMutation.isPending}
            onChange={(e) => changePairMutation.mutate(e.target.value)}
            title={
              hasOpenPosition
                ? "Close the open position before switching pairs"
                : "Select currency pair"
            }
            className="rounded-full border border-[#1e2836] bg-[#121820] px-3 py-1 text-xs font-medium outline-none focus:border-[#00d4aa] disabled:opacity-50"
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {formatSymbol(s)}
              </option>
            ))}
          </select>

          {/* AI decides the timeframe cascade automatically based on the active style */}
          <Link
            href="/settings"
            title="Change AI Trading Style in Settings"
            className="rounded-full border border-[#00d4aa40] bg-[#00d4aa10] px-3 py-1 text-xs font-medium text-[#00d4aa] hover:bg-[#00d4aa20]"
          >
            AI: {STYLE_LABELS[tradingStyle]}
          </Link>

          <span className="badge-paper rounded-full px-3 py-1 text-xs font-medium">
            PAPER
          </span>
          <span className="rounded-full border border-[#1e2836] px-3 py-1 text-xs text-[#6b7a8f]">
            Manual Confirmation
          </span>
          {session && (
            <span className="rounded-full border border-[#1e2836] px-3 py-1 text-xs text-[#6b7a8f]">
              {String(session).replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {hasOpenPosition && (
        <div className="mb-4 rounded-lg border border-[#ffa50240] bg-[#ffa50210] px-3 py-2 text-xs text-[#ffa502]">
          Pair switching disabled — close the open {formatSymbol(symbol)} position first (single-position policy).
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <MetricCard
          label="Price"
          value={quote ? quote.mid?.toFixed(5) : "—"}
        />
        <MetricCard
          label="Spread"
          value={quote ? `${(quote.spread * 10000).toFixed(1)} pips` : "—"}
        />
        <MetricCard
          label="Balance"
          value={`$${(data?.broker?.balance ?? 10000).toLocaleString()}`}
        />
        <MetricCard
          label="Equity"
          value={`$${(data?.broker?.equity ?? 10000).toLocaleString()}`}
        />
        <MetricCard label="Broker" value="Mock (Demo)" />
        <MetricCard
          label="Position"
          value={position ? `${position.direction} OPEN` : "None"}
        />
      </div>

      {/* At-a-glance AI summary with Place Order right beside it — no scrolling needed */}
      <div className="mb-4">
        <AnalysisSummary
          signal={signal}
          trendLabel={signal?.higherTimeframeTrend ?? "—"}
          onPlaceOrder={() => placeOrderMutation.mutate()}
          onDismiss={() => dismissMutation.mutate()}
          loading={placeOrderMutation.isPending}
        />
      </div>

      {placeOrderMutation.data && !placeOrderMutation.data.success && (
        <div className="mb-4 card border border-[#ff475740] p-4">
          <p className="text-sm font-medium text-[#ff4757]">
            ORDER NOT PLACED
          </p>
          <ul className="mt-2 space-y-1">
            {placeOrderMutation.data.errors?.map((err: string) => (
              <li key={err} className="text-xs text-[#ff4757]">
                · {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {placeOrderMutation.data?.success && (
        <div className="mb-4 card border border-[#00d4aa40] p-4">
          <p className="text-sm font-medium text-[#00d4aa]">
            Order placed successfully (paper)
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {candles.length > 0 && (
            <div>
              <p className="mb-2 px-1 text-xs text-[#6b7a8f]">
                {formatSymbol(symbol)} · {chartTimeframe} chart (auto-selected by AI)
              </p>
              <CandleChart candles={candles} />
            </div>
          )}

          <SignalCard
            signal={signal}
            onPlaceOrder={() => placeOrderMutation.mutate()}
            onDismiss={() => dismissMutation.mutate()}
            loading={placeOrderMutation.isPending}
            hideActions
          />
        </div>

        <div className="space-y-4">
          <EmergencyStopButton
            onStop={(mode) => emergencyStopMutation.mutate(mode)}
          />

          {timeframeAnalysis.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-medium">
                Multi-Timeframe Cascade
              </h3>
              <div className="space-y-2">
                {timeframeAnalysis.map(
                  (tf: {
                    timeframe: string;
                    roles?: string[];
                    indicators: { trend: string; rsi: number };
                  }) => (
                    <div
                      key={tf.timeframe}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[#6b7a8f]">
                        {tf.roles?.join("/") ?? ""}{" "}
                        <span className="text-[10px]">({tf.timeframe})</span>
                      </span>
                      <span
                        className={
                          tf.indicators.trend === "bullish"
                            ? "text-[#00d4aa]"
                            : tf.indicators.trend === "bearish"
                              ? "text-[#ff4757]"
                              : "text-[#6b7a8f]"
                        }
                      >
                        {tf.indicators.trend}
                      </span>
                    </div>
                  )
                )}
              </div>
              <Link
                href="/settings"
                className="mt-3 block text-center text-xs text-[#6b7a8f] hover:text-[#00d4aa]"
              >
                Customize in Advanced Settings →
              </Link>
            </div>
          )}

          {position && (
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-medium">Active Trade</h3>
              <div className="space-y-2 text-sm">
                <Row label="Direction" value={position.direction} />
                <Row label="Entry" value={position.entryPrice?.toFixed(5)} />
                <Row label="Volume" value={position.volume} />
                <Row label="SL" value={position.stopLoss?.toFixed(5)} />
                <Row label="TP" value={position.takeProfit?.toFixed(5)} />
              </div>
              <button
                onClick={async () => {
                  await fetch("/api/trading", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "close-position" }),
                  });
                  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
                }}
                className="mt-3 w-full rounded-lg border border-[#ff475740] py-2 text-xs text-[#ff4757] hover:bg-[#ff475710]"
              >
                Close Trade
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] text-[#6b7a8f]">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#6b7a8f]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
