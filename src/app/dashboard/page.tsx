"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { AppShell } from "@/components/layout/AppShell";
import { SignalCard } from "@/components/signals/SignalCard";
import { CandleChart } from "@/components/charts/CandleChart";
import { EmergencyStopButton } from "@/components/trading/EmergencyStopButton";
import {
  playAlertSound,
  requestNotificationPermission,
} from "@/modules/notifications";
import type { Signal } from "@/types";
import { useEffect, useRef } from "react";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const prevScoreRef = useRef<number>(0);

  // Single API call for all dashboard data
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Dashboard fetch failed");
      return res.json();
    },
    refetchInterval: 5000,
    staleTime: 4000,
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

  if (isLoading) {
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-[#6b7a8f]">
            {quote?.symbol ?? "EURUSD"} · Paper Trading
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {candles.length > 0 && <CandleChart candles={candles} />}

          <SignalCard
            signal={signal}
            onPlaceOrder={() => placeOrderMutation.mutate()}
            onDismiss={() => dismissMutation.mutate()}
            loading={placeOrderMutation.isPending}
          />

          {placeOrderMutation.data && !placeOrderMutation.data.success && (
            <div className="card border border-[#ff475740] p-4">
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
            <div className="card border border-[#00d4aa40] p-4">
              <p className="text-sm font-medium text-[#00d4aa]">
                Order placed successfully (paper)
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <EmergencyStopButton
            onStop={(mode) => emergencyStopMutation.mutate(mode)}
          />

          {timeframeAnalysis.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-medium">
                Multi-Timeframe Trend
              </h3>
              <div className="space-y-2">
                {timeframeAnalysis.map(
                  (tf: {
                    timeframe: string;
                    indicators: { trend: string; rsi: number };
                  }) => (
                    <div
                      key={tf.timeframe}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="w-10 text-[#6b7a8f]">
                        {tf.timeframe}
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
                      <span className="text-xs text-[#6b7a8f]">
                        RSI {tf.indicators.rsi?.toFixed(0) ?? "—"}
                      </span>
                    </div>
                  )
                )}
              </div>
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
