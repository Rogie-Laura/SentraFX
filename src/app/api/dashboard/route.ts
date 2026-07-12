import { NextResponse } from "next/server";
import { getCandles, getQuote, getCurrentSession } from "@/modules/market-data";
import {
  analyzeMultiTimeframe,
  getActiveTimeframeProfile,
  getUniqueTimeframes,
} from "@/modules/signal-engine";
import { computeIndicators } from "@/modules/technical-analysis";
import { getOpenPaperPosition } from "@/modules/order-engine";
import { getTradingSettings, isEmergencyStopActive } from "@/lib/settings-store";
import type { Timeframe, TradingStyle } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const settings = getTradingSettings();

  // Client explicitly controls symbol/style — avoids relying on
  // server-side in-memory state that isn't reliable across serverless invocations
  const symbol = searchParams.get("symbol") ?? settings.selectedSymbol;
  const styleParam = searchParams.get("style") as TradingStyle | null;

  const profile =
    styleParam && styleParam !== settings.tradingStyle
      ? getActiveTimeframeProfile({
          tradingStyle: styleParam,
          customTimeframeProfile: settings.customTimeframeProfile,
        })
      : getActiveTimeframeProfile(settings);

  const requiredTimeframes = getUniqueTimeframes(profile);

  // Optional explicit chart display override; defaults to the profile's Signal TF
  const chartTimeframe = (searchParams.get("chartTimeframe") ??
    profile.signal) as Timeframe;
  const needsSeparateChartFetch = !requiredTimeframes.includes(chartTimeframe);

  const fetchList = needsSeparateChartFetch
    ? [...requiredTimeframes, chartTimeframe]
    : requiredTimeframes;

  const [quote, ...candleArrays] = await Promise.all([
    getQuote(symbol),
    ...fetchList.map((tf) => getCandles(symbol, tf, 100)),
  ]);

  const candlesByTf = Object.fromEntries(
    fetchList.map((tf, i) => [tf, candleArrays[i]])
  ) as Record<Timeframe, Awaited<ReturnType<typeof getCandles>>>;

  const chartCandles = candlesByTf[chartTimeframe];

  const [signal, ...indicatorSets] = await Promise.all([
    analyzeMultiTimeframe(symbol, quote, candlesByTf, profile, {
      allowedSessions: settings.allowedSessions,
      manualThreshold: settings.manualThreshold,
      spreadLimit: settings.maximumSpread,
    }),
    ...requiredTimeframes.map((tf) => computeIndicators(candlesByTf[tf])),
  ]);

  const roleFor = (tf: Timeframe): string[] => {
    const roles: string[] = [];
    if (tf === profile.trend) roles.push("Trend");
    if (tf === profile.confirmation) roles.push("Confirmation");
    if (tf === profile.signal) roles.push("Signal");
    if (tf === profile.entry) roles.push("Entry");
    return roles;
  };

  const timeframeAnalysis = requiredTimeframes.map((tf, i) => ({
    timeframe: tf,
    roles: roleFor(tf),
    indicators: indicatorSets[i],
    lastCandle: candlesByTf[tf][candlesByTf[tf].length - 1],
  }));

  const position = getOpenPaperPosition();
  const session = getCurrentSession();

  return NextResponse.json({
    symbol,
    profile,
    tradingStyle: styleParam ?? settings.tradingStyle,
    chartTimeframe,
    quote,
    signal,
    timeframeAnalysis,
    candles: chartCandles,
    position,
    session,
    emergencyStop: isEmergencyStopActive(),
    broker: {
      status: "mock",
      environment: "demo",
      balance: 10000,
      equity: 10000,
    },
  });
}
