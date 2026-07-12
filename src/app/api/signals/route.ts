import { NextResponse } from "next/server";
import { getCandles, getQuote } from "@/modules/market-data";
import { analyzeMultiTimeframe } from "@/modules/signal-engine";
import { createSignalAlert } from "@/modules/notifications";
import { getTradingSettings } from "@/lib/settings-store";
import type { Timeframe } from "@/types";

const signalHistory: Awaited<ReturnType<typeof analyzeMultiTimeframe>>[] = [];
let currentSignal: Awaited<ReturnType<typeof analyzeMultiTimeframe>> | null = null;

async function refreshSignal() {
  const settings = getTradingSettings();
  const symbol = settings.selectedSymbol;
  const quote = await getQuote(symbol);
  const timeframes: Timeframe[] = ["H1", "M15", "M5", "M1"];
  const candlesByTf = {} as Record<Timeframe, Awaited<ReturnType<typeof getCandles>>>;

  for (const tf of timeframes) {
    candlesByTf[tf] = await getCandles(symbol, tf, 200);
  }

  const signal = await analyzeMultiTimeframe(symbol, quote, candlesByTf, {
    allowedSessions: settings.allowedSessions,
    manualThreshold: settings.manualThreshold,
    spreadLimit: settings.maximumSpread,
  });

  currentSignal = signal;
  if (signal.trustScore >= settings.manualThreshold && signal.direction !== "WAIT") {
    createSignalAlert(signal);
    signalHistory.unshift(signal);
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  await params;

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
