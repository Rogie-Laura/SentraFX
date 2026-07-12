import { NextResponse } from "next/server";
import { getCandles, getQuote } from "@/modules/market-data";
import {
  analyzeMultiTimeframe,
  getActiveTimeframeProfile,
  getUniqueTimeframes,
} from "@/modules/signal-engine";
import { computeIndicators } from "@/modules/technical-analysis";
import { getTradingSettings } from "@/lib/settings-store";
import type { Timeframe } from "@/types";

async function buildAnalysis(symbol: string) {
  const settings = getTradingSettings();
  const profile = getActiveTimeframeProfile(settings);
  const timeframes = getUniqueTimeframes(profile);

  const [quote, ...candleArrays] = await Promise.all([
    getQuote(symbol),
    ...timeframes.map((tf) => getCandles(symbol, tf, 100)),
  ]);

  const candlesByTf = Object.fromEntries(
    timeframes.map((tf, i) => [tf, candleArrays[i]])
  ) as Record<Timeframe, Awaited<ReturnType<typeof getCandles>>>;

  const [signal, ...indicatorSets] = await Promise.all([
    analyzeMultiTimeframe(symbol, quote, candlesByTf, profile, {
      allowedSessions: settings.allowedSessions,
      manualThreshold: settings.manualThreshold,
      spreadLimit: settings.maximumSpread,
    }),
    ...timeframes.map((tf) => computeIndicators(candlesByTf[tf])),
  ]);

  const timeframeAnalysis = timeframes.map((tf, i) => ({
    timeframe: tf,
    indicators: indicatorSets[i],
    lastCandle: candlesByTf[tf][candlesByTf[tf].length - 1],
  }));

  return { quote, signal, timeframeAnalysis, profile };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") ?? "current";
  const symbol =
    searchParams.get("symbol") ?? getTradingSettings().selectedSymbol;

  if (endpoint === "current") {
    const analysis = await buildAnalysis(symbol);
    return NextResponse.json(analysis);
  }

  if (endpoint === "timeframes") {
    const analysis = await buildAnalysis(symbol);
    return NextResponse.json({ timeframes: analysis.timeframeAnalysis });
  }

  if (endpoint === "trust-score") {
    const analysis = await buildAnalysis(symbol);
    return NextResponse.json({
      trustScore: analysis.signal.trustScore,
      direction: analysis.signal.direction,
      breakdown: analysis.signal.scoreBreakdown,
      buyVsSell: {
        note: "Technical confluence score — not a guaranteed win probability",
      },
    });
  }

  return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
}

export async function POST() {
  const settings = getTradingSettings();
  const analysis = await buildAnalysis(settings.selectedSymbol);
  return NextResponse.json(analysis.signal);
}
