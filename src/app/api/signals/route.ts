import { NextResponse } from "next/server";
import { getCandles, getQuote } from "@/modules/market-data";
import { analyzeMultiTimeframe } from "@/modules/signal-engine";
import { createSignalAlert } from "@/modules/notifications";
import { getTradingSettings } from "@/lib/settings-store";
import type { Timeframe } from "@/types";

const TIMEFRAMES: Timeframe[] = ["H1", "M15", "M5", "M1"];

let currentSignal: Awaited<ReturnType<typeof analyzeMultiTimeframe>> | null =
  null;
const signalHistory: Awaited<ReturnType<typeof analyzeMultiTimeframe>>[] = [];

async function refreshSignal() {
  const settings = getTradingSettings();
  const symbol = settings.selectedSymbol;

  // Parallel fetching
  const [quote, ...candleArrays] = await Promise.all([
    getQuote(symbol),
    ...TIMEFRAMES.map((tf) => getCandles(symbol, tf, 100)),
  ]);

  const candlesByTf = Object.fromEntries(
    TIMEFRAMES.map((tf, i) => [tf, candleArrays[i]])
  ) as Record<Timeframe, Awaited<ReturnType<typeof getCandles>>>;

  const signal = await analyzeMultiTimeframe(symbol, quote, candlesByTf, {
    allowedSessions: settings.allowedSessions,
    manualThreshold: settings.manualThreshold,
    spreadLimit: settings.maximumSpread,
  });

  currentSignal = signal;
  if (
    signal.trustScore >= settings.manualThreshold &&
    signal.direction !== "WAIT"
  ) {
    createSignalAlert(signal);
    signalHistory.unshift(signal);
    if (signalHistory.length > 50) signalHistory.pop();
  }

  return signal;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "current";

  if (type === "current") {
    if (!currentSignal || currentSignal.expiresAt < new Date()) {
      await refreshSignal();
    }
    return NextResponse.json(currentSignal);
  }

  if (type === "history") {
    return NextResponse.json({ signals: signalHistory.slice(0, 50) });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  await request.text();

  if (action === "dismiss") {
    currentSignal = null;
    return NextResponse.json({ dismissed: true });
  }

  if (action === "acknowledge") {
    return NextResponse.json({ acknowledged: true });
  }

  await refreshSignal();
  return NextResponse.json(currentSignal);
}
