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

  const { data: analysis } = useQuery({
    queryKey: ["analysis"],
    queryFn: async () => {
      const res = await fetch("/api/analysis?endpoint=current");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: signalData } = useQuery({
    queryKey: ["signal"],
    queryFn: async () => {
      const res = await fetch("/api/signals?type=current");
      return res.json() as Promise<Signal>;
    },
    refetchInterval: 5000,
  });

  const { data: positionData } = useQuery({
    queryKey: ["position"],
    queryFn: async () => {
      const res = await fetch("/api/trading?type=position");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const { data: brokerData } = useQuery({
    queryKey: ["broker"],
    queryFn: async () => {
      const res = await fetch("/api/broker?type=connection");
      return res.json();
    },
  });

  const { data: marketData } = useQuery({
    queryKey: ["market"],
    queryFn: async () => {
      const [quote, session] = await Promise.all([
        fetch("/api/market?type=quote&symbol=EURUSD").then((r) => r.json()),
        fetch("/api/market?type=session").then((r) => r.json()),
      ]);
      return { quote, session };
    },
    refetchInterval: 3000,
  });

  const { data: candlesData } = useQuery({
    queryKey: ["candles"],
    queryFn: async () => {
      const res = await fetch("/api/market?type=candles&symbol=EURUSD&timeframe=M5&count=100");
      return res.json();
    },
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (
      signalData &&
      signalData.trustScore >= 60 &&
      signalData.trustScore !== prevScoreRef.current &&
      signalData.direction !== "WAIT"
    ) {
      playAlertSound();
      prevScoreRef.current = signalData.trustScore;
    }
  }, [signalData]);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = uuidv4();
      const res = await fetch("/api/trading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "place-order",
          signal: signalData,
          idempotencyKey,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["position"] });
      queryClient.invalidateQueries({ queryKey: ["signal"] });
    },
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
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/signals?action=dismiss", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signal"] });
    },
  });

  const quote = marketData?.quote;
  const position = positionData?.position;

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-[#6b7a8f]">EURUSD · Paper Trading</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge-paper rounded-full px-3 py-1 text-xs font-medium">
            PAPER
          </span>
          <span className="rounded-full border border-[#1e2836] px-3 py-1 text-xs text-[#6b7a8f]">
            Manual Confirmation
          </span>
          <span className="rounded-full border border-[#1e2836] px-3 py-1 text-xs text-[#6b7a8f]">
            {marketData?.session?.session?.replace("_", " ") ?? "—"}
          </span>
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
        <MetricCard label="Balance" value="$10,000" />
        <MetricCard label="Equity" value="$10,000" />
        <MetricCard
          label="Broker"
          value={brokerData?.status === "connected" ? "Connected" : "Mock"}
        />
        <MetricCard
          label="Position"
          value={position ? `${position.direction} OPEN` : "None"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {candlesData?.candles && (
            <CandleChart candles={candlesData.candles} />
          )}

          <SignalCard
            signal={signalData ?? null}
            onPlaceOrder={() => placeOrderMutation.mutate()}
            onDismiss={() => dismissMutation.mutate()}
            loading={placeOrderMutation.isPending}
          />

          {placeOrderMutation.data && !placeOrderMutation.data.success && (
            <div className="card border-[#ff475740] p-4">
              <p className="text-sm font-medium text-[#ff4757]">
                ORDER NOT PLACED
              </p>
              <ul className="mt-2 space-y-1">
                {placeOrderMutation.data.errors?.map((err: string) => (
                  <li key={err} className="text-xs text-[#ff4757]">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {placeOrderMutation.data?.success && (
            <div className="card border-[#00d4aa40] p-4">
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

          {analysis?.timeframeAnalysis && (
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-medium">Multi-Timeframe Trend</h3>
              <div className="space-y-2">
                {analysis.timeframeAnalysis.map(
                  (tf: {
                    timeframe: string;
                    indicators: { trend: string; rsi: number; adx: number };
                  }) => (
                    <div
                      key={tf.timeframe}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[#6b7a8f]">{tf.timeframe}</span>
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
                        RSI {tf.indicators.rsi?.toFixed(0)}
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
                  queryClient.invalidateQueries({ queryKey: ["position"] });
                }}
                className="mt-3 w-full rounded-lg border border-[#ff475740] py-2 text-xs text-[#ff4757]"
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
