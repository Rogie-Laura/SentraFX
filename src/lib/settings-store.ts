import type { TradingSettings } from "@/types";
import { DEFAULT_RISK_SETTINGS } from "@/modules/risk-engine";
import { TRADING_STYLE_PROFILES } from "@/modules/signal-engine";

export const DEFAULT_TRADING_SETTINGS: TradingSettings = {
  selectedSymbol: "EURUSD",
  tradingMode: "paper",
  manualThreshold: 60,
  automaticThreshold: 75,
  allowedSessions: ["london", "new_york", "london_ny_overlap"],
  signalExpirationMinutes: 5,
  tradingStyle: "balanced",
  customTimeframeProfile: { ...TRADING_STYLE_PROFILES.balanced },
  ...DEFAULT_RISK_SETTINGS,
};

let cachedSettings: TradingSettings = { ...DEFAULT_TRADING_SETTINGS };
let emergencyStopActive = false;

export function getTradingSettings(): TradingSettings {
  return { ...cachedSettings };
}

export function updateTradingSettings(
  partial: Partial<TradingSettings>
): TradingSettings {
  cachedSettings = { ...cachedSettings, ...partial };
  return cachedSettings;
}

export function isEmergencyStopActive(): boolean {
  return emergencyStopActive;
}

export function setEmergencyStop(active: boolean): void {
  emergencyStopActive = active;
}
