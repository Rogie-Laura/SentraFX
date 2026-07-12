import type { TimeframeProfile, TradingSettings, TradingStyle } from "@/types";

/**
 * Preset multi-timeframe cascades per AI Trading Style.
 *
 * Each style trades off signal frequency against signal quality:
 * - Conservative: fewer trades, higher quality (wider timeframes)
 * - Balanced: the recommended default (matches the original scalping spec)
 * - Aggressive: more trades, higher false-signal risk (tighter timeframes)
 *
 * "entry" reuses the finest available timeframe (M1) once the cascade
 * reaches it, since no sub-M1 granularity is supported yet.
 */
export const TRADING_STYLE_PROFILES: Record<
  Exclude<TradingStyle, "custom">,
  TimeframeProfile
> = {
  conservative: { trend: "H4", confirmation: "H1", signal: "M15", entry: "M5" },
  balanced: { trend: "H1", confirmation: "M15", signal: "M5", entry: "M1" },
  aggressive: { trend: "M15", confirmation: "M5", signal: "M1", entry: "M1" },
};

export const TRADING_STYLE_DESCRIPTIONS: Record<
  Exclude<TradingStyle, "custom">,
  { label: string; tagline: string; detail: string }
> = {
  conservative: {
    label: "Conservative",
    tagline: "Mas kaunting trades, mas mataas ang quality",
    detail: "Trend H4 → Confirmation H1 → Signal M15 → Entry M5",
  },
  balanced: {
    label: "Balanced",
    tagline: "Recommended na setting",
    detail: "Trend H1 → Confirmation M15 → Signal M5 → Entry M1",
  },
  aggressive: {
    label: "Aggressive",
    tagline: "Mas maraming trades, mas mataas ang false-signal risk",
    detail: "Trend M15 → Confirmation M5 → Signal M1 → Entry M1",
  },
};

export function getActiveTimeframeProfile(
  settings: Pick<TradingSettings, "tradingStyle" | "customTimeframeProfile">
): TimeframeProfile {
  if (settings.tradingStyle === "custom") {
    return settings.customTimeframeProfile;
  }
  return TRADING_STYLE_PROFILES[settings.tradingStyle];
}

export function getUniqueTimeframes(profile: TimeframeProfile) {
  return Array.from(
    new Set([profile.trend, profile.confirmation, profile.signal, profile.entry])
  );
}
