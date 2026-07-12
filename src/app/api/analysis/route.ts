import { NextResponse } from "next/server";
import { getCandles, getQuote } from "@/modules/market-data";
import { analyzeMultiTimeframe } from "@/modules/signal-engine";
import { computeIndicators } from "@/modules/technical-analysis";
import { getTradingSettings } from "@/lib/settings-store";
import type { Timeframe } from "@/types";

async function buildAnalysis(symbol: string) {
  const settings = getTradingSettings();
  const quote = await getQuote(symbol);
  const timeframes: Timeframe[] = ["H1", "M15", "M5", "M1"];
  const candlesByTf: Record<Timeframe, Awaited<ReturnType<typeof getCandles>>> = {} as Record<
    Timeframe,
    Awaited<ReturnType<typeof getCandles>>
  >;

  for (const tf of timeframes) {
    candlesByTf[tf] = await getCandles(symbol, tf, 200);
  }

  const signal = await analyzeMultiTimeframe(symbol, quote, candlesByTf, {
    allowedSessions: settings.allowedSessions,
    manualThreshold: settings.manualThreshold,
    spreadLimit: settings.maximumSpread,
  });

  const timeframeAnalysis = timeframes.map((tf) => ({
    timeframe: tf,
    indicators: computeIndicators(candlesByTf[tf]),
    lastCandle: candlesByTf[tf][candlesByTf[tf].length - 1],
  }));

  return { quote, signal, timeframeAnalysis };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") ?? "current";
  const symbol = searchParams.get("symbol") ?? getTradingSettings().selectedSymbol;

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
