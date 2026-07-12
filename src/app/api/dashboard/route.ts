import { NextResponse } from "next/server";
import { getCandles, getQuote, getCurrentSession } from "@/modules/market-data";
import { analyzeMultiTimeframe } from "@/modules/signal-engine";
import { computeIndicators } from "@/modules/technical-analysis";
import { getOpenPaperPosition } from "@/modules/order-engine";
import { getTradingSettings, isEmergencyStopActive } from "@/lib/settings-store";
import type { Timeframe } from "@/types";

// Fixed multi-timeframe stack used by the signal/trust-score engine (per scalping spec)
const SIGNAL_TIMEFRAMES: Timeframe[] = ["H1", "M15", "M5", "M1"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const settings = getTradingSettings();

  // Client explicitly controls symbol/timeframe — avoids relying on
  // server-side in-memory state that isn't reliable across serverless invocations
  const symbol = searchParams.get("symbol") ?? settings.selectedSymbol;
  const chartTimeframe = (searchParams.get("timeframe") ?? "M5") as Timeframe;

  const needsSeparateChartFetch = !SIGNAL_TIMEFRAMES.includes(chartTimeframe);

  const [quote, ...candleArrays] = await Promise.all([
    getQuote(symbol),
    ...SIGNAL_TIMEFRAMES.map((tf) => getCandles(symbol, tf, 100)),
    ...(needsSeparateChartFetch ? [getCandles(symbol, chartTimeframe, 100)] : []),
  ]);

  const candlesByTf = Object.fromEntries(
    SIGNAL_TIMEFRAMES.map((tf, i) => [tf, candleArrays[i]])
  ) as Record<Timeframe, Awaited<ReturnType<typeof getCandles>>>;

  const chartCandles = needsSeparateChartFetch
    ? candleArrays[candleArrays.length - 1]
    : candlesByTf[chartTimeframe];

  const [signal, ...indicatorSets] = await Promise.all([
    analyzeMultiTimeframe(symbol, quote, candlesByTf, {
      allowedSessions: settings.allowedSessions,
      manualThreshold: settings.manualThreshold,
      spreadLimit: settings.maximumSpread,
    }),
    ...SIGNAL_TIMEFRAMES.map((tf) => computeIndicators(candlesByTf[tf])),
  ]);

  const timeframeAnalysis = SIGNAL_TIMEFRAMES.map((tf, i) => ({
    timeframe: tf,
    indicators: indicatorSets[i],
    lastCandle: candlesByTf[tf][candlesByTf[tf].length - 1],
  }));

  const position = getOpenPaperPosition();
  const session = getCurrentSession();

  return NextResponse.json({
    symbol,
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
