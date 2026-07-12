import { NextResponse } from "next/server";
import { getCandles, getQuote, getCurrentSession } from "@/modules/market-data";
import { analyzeMultiTimeframe } from "@/modules/signal-engine";
import { computeIndicators } from "@/modules/technical-analysis";
import { getOpenPaperPosition } from "@/modules/order-engine";
import { getTradingSettings, isEmergencyStopActive } from "@/lib/settings-store";
import type { Timeframe } from "@/types";

const TIMEFRAMES: Timeframe[] = ["H1", "M15", "M5", "M1"];

export async function GET() {
  const settings = getTradingSettings();
  const symbol = settings.selectedSymbol;

  // All data fetched in parallel — single round-trip for the entire dashboard
  const [quote, ...candleArrays] = await Promise.all([
    getQuote(symbol),
    ...TIMEFRAMES.map((tf) => getCandles(symbol, tf, 100)),
  ]);

  const candlesByTf = Object.fromEntries(
    TIMEFRAMES.map((tf, i) => [tf, candleArrays[i]])
  ) as Record<Timeframe, Awaited<ReturnType<typeof getCandles>>>;

  const [signal, ...indicatorSets] = await Promise.all([
    analyzeMultiTimeframe(symbol, quote, candlesByTf, {
      allowedSessions: settings.allowedSessions,
      manualThreshold: settings.manualThreshold,
      spreadLimit: settings.maximumSpread,
    }),
    ...TIMEFRAMES.map((tf) => computeIndicators(candlesByTf[tf])),
  ]);

  const timeframeAnalysis = TIMEFRAMES.map((tf, i) => ({
    timeframe: tf,
    indicators: indicatorSets[i],
    lastCandle: candlesByTf[tf][candlesByTf[tf].length - 1],
  }));

  const m5Candles = candlesByTf["M5"];
  const position = getOpenPaperPosition();
  const session = getCurrentSession();

  return NextResponse.json({
    quote,
    signal,
    timeframeAnalysis,
    candles: m5Candles,
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
