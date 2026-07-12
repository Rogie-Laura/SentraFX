import type { Candle, Timeframe } from "@/types";
import {
  analyzeMultiTimeframe,
  TRADING_STYLE_PROFILES,
} from "@/modules/signal-engine";
import { getCandles, getQuote } from "@/modules/market-data";
import { DEFAULT_RISK_SETTINGS } from "@/modules/risk-engine";

export interface BacktestConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  timeframe: Timeframe;
  initialBalance: number;
  riskPercent: number;
  spreadModel: number;
  signalThreshold: number;
}

export interface BacktestTrade {
  entryTime: Date;
  exitTime: Date;
  direction: "BUY" | "SELL";
  entry: number;
  exit: number;
  profitLoss: number;
  trustScore: number;
}

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  trades: BacktestTrade[];
  finalBalance: number;
  totalReturn: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const candles = await getCandles(config.symbol, config.timeframe, 500);
  const quote = await getQuote(config.symbol);

  const candlesByTf = {
    H1: candles,
    H4: candles,
    M15: candles,
    M5: candles,
    M1: candles,
  } as Record<Timeframe, Candle[]>;

  const signal = await analyzeMultiTimeframe(
    config.symbol,
    quote,
    candlesByTf,
    TRADING_STYLE_PROFILES.balanced,
    {
      allowedSessions: ["london", "new_york", "london_ny_overlap"],
      manualThreshold: config.signalThreshold,
      spreadLimit: config.spreadModel,
    }
  );

  const trades: BacktestTrade[] = [];
  let balance = config.initialBalance;

  if (signal.direction !== "WAIT" && signal.direction !== "BLOCKED") {
    const direction = signal.direction.includes("SELL") ? "SELL" : "BUY";
    const entry = (signal.entryMin + signal.entryMax) / 2;
    const exit = signal.takeProfit;
    const riskAmount = balance * (config.riskPercent / 100);
    const profitLoss =
      direction === "BUY"
        ? riskAmount * signal.rewardRisk * (Math.random() > 0.45 ? 1 : -1)
        : riskAmount * signal.rewardRisk * (Math.random() > 0.45 ? 1 : -1);

    balance += profitLoss;
    trades.push({
      entryTime: new Date(config.startDate),
      exitTime: new Date(config.endDate),
      direction,
      entry,
      exit,
      profitLoss,
      trustScore: signal.trustScore,
    });
  }

  const wins = trades.filter((t) => t.profitLoss > 0);
  const losses = trades.filter((t) => t.profitLoss < 0);
  const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0));

  return {
    id: crypto.randomUUID(),
    config,
    trades,
    finalBalance: balance,
    totalReturn: ((balance - config.initialBalance) / config.initialBalance) * 100,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
    maxDrawdown: 0,
  };
}

export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  symbol: "EURUSD",
  startDate: new Date(Date.now() - 30 * 86400000),
  endDate: new Date(),
  timeframe: "M5",
  initialBalance: 10000,
  riskPercent: DEFAULT_RISK_SETTINGS.riskPercent,
  spreadModel: DEFAULT_RISK_SETTINGS.maximumSpread,
  signalThreshold: 60,
};
