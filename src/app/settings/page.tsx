"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      return res.json();
    },
  });

  const [symbol, setSymbol] = useState("EURUSD");
  const [manualThreshold, setManualThreshold] = useState(60);
  const [riskPercent, setRiskPercent] = useState(1);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "trading",
          data: {
            selectedSymbol: symbol,
            manualThreshold,
            riskPercent,
          },
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const brokerMutation = useMutation({
    mutationFn: async (action: string) => {
      const res = await fetch("/api/broker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker"] });
    },
  });

  const settings = data?.trading;

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Settings</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-medium">Broker Integration</h2>
          <div className="mb-3 space-y-1 text-sm">
            <p>
              <span className="text-[#6b7a8f]">Broker:</span> IC Markets
            </p>
            <p>
              <span className="text-[#6b7a8f]">Platform:</span> cTrader
            </p>
            <p>
              <span className="text-[#6b7a8f]">Environment:</span> Demo
            </p>
          </div>
          <p className="mb-3 text-xs text-[#6b7a8f]">
            Connect IC Markets cTrader Account via OAuth — no API keys in the
            browser.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => brokerMutation.mutate("connect")}
              className="rounded-lg bg-[#00d4aa] px-4 py-2 text-xs font-bold text-black"
            >
              Connect Broker
            </button>
            <button
              onClick={() => brokerMutation.mutate("test")}
              className="rounded-lg border border-[#1e2836] px-4 py-2 text-xs"
            >
              Test Connection
            </button>
            <button
              onClick={() => brokerMutation.mutate("disconnect")}
              className="rounded-lg border border-[#1e2836] px-4 py-2 text-xs text-[#ff4757]"
            >
              Disconnect
            </button>
          </div>
          {brokerMutation.data?.message && (
            <p className="mt-2 text-xs text-[#00d4aa]">
              {brokerMutation.data.message}
            </p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-medium">Trading</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-[#6b7a8f]">
                Selected Pair
              </label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-lg border border-[#1e2836] bg-[#0b0f14] px-3 py-2 text-sm"
              >
                {["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b7a8f]">
                Manual Alert Threshold ({manualThreshold}%)
              </label>
              <input
                type="range"
                min={40}
                max={90}
                value={manualThreshold}
                onChange={(e) => setManualThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b7a8f]">
                Risk Per Trade ({riskPercent}%)
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button
              onClick={() => saveMutation.mutate()}
              className="w-full rounded-lg bg-[#00d4aa] py-2 text-sm font-bold text-black"
            >
              Save Settings
            </button>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-medium">Risk Management</h2>
          <div className="space-y-2 text-sm">
            <Row label="Daily Loss Limit" value={`${settings?.dailyLossPercent ?? 3}%`} />
            <Row label="Max Consecutive Losses" value={settings?.maximumConsecutiveLosses ?? 3} />
            <Row label="Max Trades/Day" value={settings?.maximumTradesPerDay ?? 5} />
            <Row label="Min R:R" value={`1:${settings?.minimumRewardRisk ?? 1.5}`} />
            <Row label="Max Spread" value={`${((settings?.maximumSpread ?? 0.0003) * 10000).toFixed(1)} pips`} />
            <Row label="Cooldown" value={`${settings?.cooldownMinutes ?? 15} min`} />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-medium">Automatic Trading</h2>
          <p className="mb-3 text-xs text-[#ffa502]">
            Automatic mode is disabled by default. Requires explicit activation,
            auto-mode PIN, and all safety checks. Not available in Phase 1.
          </p>
          <div className="rounded-lg bg-[#ff475710] p-3 text-xs text-[#ff4757]">
            Auto threshold: 75% (when enabled in later phase)
          </div>
        </section>
      </div>
    </AppShell>
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
