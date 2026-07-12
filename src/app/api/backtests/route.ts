import { NextResponse } from "next/server";
import { runBacktest, DEFAULT_BACKTEST_CONFIG } from "@/modules/backtesting";

const backtestCache = new Map<string, Awaited<ReturnType<typeof runBacktest>>>();

export async function POST(request: Request) {
  const body = await request.json();
  const config = { ...DEFAULT_BACKTEST_CONFIG, ...body };
  config.startDate = new Date(config.startDate);
  config.endDate = new Date(config.endDate);

  const result = await runBacktest(config);
  backtestCache.set(result.id, result);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "summary";

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const result = backtestCache.get(id);
  if (!result) {
    return NextResponse.json({ error: "Backtest not found" }, { status: 404 });
  }

  if (type === "trades") {
    return NextResponse.json({ trades: result.trades });
  }

  if (type === "report") {
    return NextResponse.json({
      id: result.id,
      totalReturn: result.totalReturn,
      winRate: result.winRate,
      profitFactor: result.profitFactor,
      maxDrawdown: result.maxDrawdown,
      finalBalance: result.finalBalance,
      tradeCount: result.trades.length,
      disclaimer: "Backtest results do not guarantee future performance.",
    });
  }

  return NextResponse.json(result);
}
