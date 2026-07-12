export type Timeframe = "M1" | "M5" | "M15" | "H1" | "H4";

export type SignalDirection =
  | "STRONG_BUY"
  | "BUY"
  | "WAIT"
  | "SELL"
  | "STRONG_SELL"
  | "BLOCKED";

export type TradingMode =
  | "analysis_only"
  | "paper"
  | "demo"
  | "live_manual"
  | "live_auto";

export type BrokerEnvironment = "demo" | "live";

export type OrderDirection = "BUY" | "SELL";

export type OrderStatus =
  | "pending"
  | "filled"
  | "rejected"
  | "cancelled"
  | "closed";

export type PositionStatus = "open" | "closed";

export type MarketSession =
  | "sydney"
  | "tokyo"
  | "london"
  | "new_york"
  | "london_ny_overlap";

export interface Candle {
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread?: number;
}

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  timestamp: Date;
}

export interface TradingAccount {
  id: string;
  externalAccountId: string;
  accountCurrency: string;
  balance: number;
  equity: number;
  freeMargin: number;
  leverage: number;
  isSelected: boolean;
}

export interface AccountSummary {
  accountId: string;
  balance: number;
  equity: number;
  freeMargin: number;
  currency: string;
}

export interface OrderRequest {
  accountId: string;
  symbol: string;
  direction: OrderDirection;
  volume: number;
  stopLoss: number;
  takeProfit: number;
  idempotencyKey: string;
  environment: BrokerEnvironment;
}

export interface OrderValidation {
  valid: boolean;
  errors: string[];
}

export interface BrokerOrderResult {
  success: boolean;
  orderId?: string;
  externalOrderId?: string;
  fillPrice?: number;
  rejectionReason?: string;
}

export interface BrokerPosition {
  id: string;
  symbol: string;
  direction: OrderDirection;
  volume: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedProfit: number;
}

export interface ScoreBreakdown {
  category: string;
  maxPoints: number;
  earnedPoints: number;
  description: string;
}

export interface Signal {
  id: string;
  symbol: string;
  direction: SignalDirection;
  timeframe: Timeframe;
  trustScore: number;
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  takeProfit: number;
  rewardRisk: number;
  scoreBreakdown: ScoreBreakdown[];
  reasons: string[];
  warnings: string[];
  higherTimeframeTrend: string;
  expiresAt: Date;
  generatedAt: Date;
}

export interface RiskSettings {
  riskPercent: number;
  dailyLossPercent: number;
  dailyProfitLockPercent: number;
  maximumTradesPerDay: number;
  maximumConsecutiveLosses: number;
  maximumSpread: number;
  minimumRewardRisk: number;
  cooldownMinutes: number;
}

export interface TradingSettings extends RiskSettings {
  selectedSymbol: string;
  tradingMode: TradingMode;
  manualThreshold: number;
  automaticThreshold: number;
  allowedSessions: MarketSession[];
  signalExpirationMinutes: number;
}

export interface PreflightResult {
  canPlace: boolean;
  errors: string[];
  warnings: string[];
  estimatedRisk: number;
  estimatedProfit: number;
  lotSize: number;
}

export interface JournalEntry {
  id: string;
  date: Date;
  symbol: string;
  direction: OrderDirection;
  trustScore: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  result: "win" | "loss" | "breakeven" | "open";
  profitLoss: number;
  rMultiple: number;
  mode: TradingMode;
  reasons: string[];
  brokerOrderRef?: string;
}
