"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import {
  TRADING_STYLE_PROFILES,
  TRADING_STYLE_DESCRIPTIONS,
} from "@/modules/signal-engine";
import { ALL_TIMEFRAMES } from "@/modules/market-data";
import type { Timeframe, TimeframeProfile, TradingStyle } from "@/types";

const STYLE_OPTIONS: Exclude<TradingStyle, "custom">[] = [
  "conservative",
  "balanced",
  "aggressive",
];

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

  const [tradingStyle, setTradingStyle] = useState<TradingStyle>("balanced");
  const [customProfile, setCustomProfile] = useState<TimeframeProfile>(
    TRADING_STYLE_PROFILES.balanced
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [initializedStrategy, setInitializedStrategy] = useState(false);

  useEffect(() => {
    if (initializedStrategy || !data?.trading) return;
    if (data.trading.tradingStyle) setTradingStyle(data.trading.tradingStyle);
    if (data.trading.customTimeframeProfile)
      setCustomProfile(data.trading.customTimeframeProfile);
    setShowAdvanced(data.trading.tradingStyle === "custom");
    setInitializedStrategy(true);
  }, [data, initializedStrategy]);

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

  const saveStrategyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "strategy",
          data: {
            tradingStyle,
            customTimeframeProfile: customProfile,
          },
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
  const activeProfile =
    tradingStyle === "custom" ? customProfile : TRADING_STYLE_PROFILES[tradingStyle];

  function selectStyle(style: Exclude<TradingStyle, "custom">) {
    setTradingStyle(style);
    setCustomProfile(TRADING_STYLE_PROFILES[style]);
    setShowAdvanced(false);
  }

  function updateCustomTf(role: keyof TimeframeProfile, value: Timeframe) {
    setTradingStyle("custom");
    setCustomProfile((prev) => ({ ...prev, [role]: value }));
  }

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Settings</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-1 text-sm font-medium">AI Trading Style</h2>
          <p className="mb-3 text-xs text-[#6b7a8f]">
            Piliin kung gaano proactive ang AI. Ito ang nagde-decide ng
            timeframe cascade — hindi mo na kailangang piliin ang mga ito
            nang manwal.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {STYLE_OPTIONS.map((style) => {
              const desc = TRADING_STYLE_DESCRIPTIONS[style];
              const isActive = tradingStyle === style;
              return (
                <button
                  key={style}
                  onClick={() => selectStyle(style)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    isActive
                      ? "border-[#00d4aa] bg-[#00d4aa10]"
                      : "border-[#1e2836] hover:border-[#2a3746]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-sm font-bold ${isActive ? "text-[#00d4aa]" : ""}`}
                    >
                      {desc.label}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-[#00d4aa]">ACTIVE</span>
                    )}
                  </div>
                  <p className="mb-2 text-[11px] text-[#6b7a8f]">
                    {desc.tagline}
                  </p>
                  <p className="text-[10px] text-[#6b7a8f]">{desc.detail}</p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-3 text-xs text-[#6b7a8f] hover:text-[#00d4aa]"
          >
            {showAdvanced ? "▾" : "▸"} Advanced Settings (custom timeframes)
          </button>

          {showAdvanced && (
            <div className="mt-3 grid gap-3 rounded-lg border border-[#1e2836] p-3 sm:grid-cols-4">
              <TfSelect
                label="Trend TF"
                value={activeProfile.trend}
                onChange={(v) => updateCustomTf("trend", v)}
              />
              <TfSelect
                label="Confirmation TF"
                value={activeProfile.confirmation}
                onChange={(v) => updateCustomTf("confirmation", v)}
              />
              <TfSelect
                label="Signal TF"
                value={activeProfile.signal}
                onChange={(v) => updateCustomTf("signal", v)}
              />
              <TfSelect
                label="Entry TF"
                value={activeProfile.entry}
                onChange={(v) => updateCustomTf("entry", v)}
              />
              <p className="col-span-full text-[10px] text-[#6b7a8f]">
                Kung beginner ka, hindi mo na kailangang galawin ito — gamitin
                lang ang isa sa tatlong presets sa itaas.
              </p>
            </div>
          )}

          <button
            onClick={() => saveStrategyMutation.mutate()}
            className="mt-3 w-full rounded-lg bg-[#00d4aa] py-2 text-sm font-bold text-black sm:w-auto sm:px-6"
          >
            {saveStrategyMutation.isPending ? "Saving..." : "Save AI Trading Style"}
          </button>
          {saveStrategyMutation.isSuccess && (
            <p className="mt-2 text-xs text-[#00d4aa]">Saved.</p>
          )}
        </section>

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

function TfSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Timeframe;
  onChange: (v: Timeframe) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-[#6b7a8f]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Timeframe)}
        className="w-full rounded-lg border border-[#1e2836] bg-[#0b0f14] px-2 py-1.5 text-xs"
      >
        {ALL_TIMEFRAMES.map((tf) => (
          <option key={tf} value={tf}>
            {tf}
          </option>
        ))}
      </select>
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
