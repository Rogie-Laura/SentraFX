import { NextResponse } from "next/server";
import { getCandles, getQuote, getCurrentSession, SUPPORTED_SYMBOLS } from "@/modules/market-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "symbols") {
    return NextResponse.json({ symbols: SUPPORTED_SYMBOLS });
  }

  if (type === "quote") {
    const symbol = searchParams.get("symbol") ?? "EURUSD";
    const quote = await getQuote(symbol);
    return NextResponse.json(quote);
  }

  if (type === "candles") {
    const symbol = searchParams.get("symbol") ?? "EURUSD";
    const timeframe = (searchParams.get("timeframe") ?? "M5") as "M1" | "M5" | "M15" | "H1" | "H4";
    const count = parseInt(searchParams.get("count") ?? "200", 10);
    const candles = await getCandles(symbol, timeframe, count);
    return NextResponse.json({ candles });
  }

  if (type === "session") {
    return NextResponse.json({ session: getCurrentSession() });
  }

  if (type === "spread") {
    const symbol = searchParams.get("symbol") ?? "EURUSD";
    const quote = await getQuote(symbol);
    return NextResponse.json({
      symbol,
      spread: quote.spread,
      spreadPips: (quote.spread * 10000).toFixed(1),
    });
  }

  return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
}
