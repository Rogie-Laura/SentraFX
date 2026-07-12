import type { Candle, MarketSession, Quote, Timeframe } from "@/types";
import { createBrokerAdapter } from "@/modules/broker";

const adapter = createBrokerAdapter("mock", "demo");

export async function getQuote(symbol: string): Promise<Quote> {
  return adapter.getQuote(symbol);
}

export async function getCandles(
  symbol: string,
  timeframe: Timeframe,
  count = 200
): Promise<Candle[]> {
  return adapter.getCandles(symbol, timeframe, count);
}

export function getCurrentSession(): MarketSession {
  const now = new Date();
  const utcHour = now.getUTCHours();

  if (utcHour >= 12 && utcHour < 16) return "london_ny_overlap";
  if (utcHour >= 7 && utcHour < 16) return "london";
  if (utcHour >= 12 && utcHour < 21) return "new_york";
  if (utcHour >= 0 && utcHour < 9) return "tokyo";
  return "sydney";
}

export function isSessionAllowed(
  session: MarketSession,
  allowed: MarketSession[]
): boolean {
  return allowed.includes(session);
}

export const SUPPORTED_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
] as const;

export const SCALPING_TIMEFRAMES: Timeframe[] = ["H1", "M15", "M5", "M1"];

export const ALL_TIMEFRAMES: Timeframe[] = ["M1", "M5", "M15", "H1", "H4"];

export function formatSymbol(symbol: string): string {
  if (symbol.length !== 6) return symbol;
  return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
}
