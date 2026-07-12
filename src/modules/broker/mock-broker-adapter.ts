import { v4 as uuidv4 } from "uuid";
import type {
  AccountSummary,
  BrokerEnvironment,
  BrokerOrderResult,
  BrokerPosition,
  Candle,
  OrderRequest,
  OrderValidation,
  Quote,
  Timeframe,
  TradingAccount,
} from "@/types";
import type { BrokerAdapter } from "./broker-adapter.interface";

const SYMBOL_BASE_PRICES: Record<string, number> = {
  EURUSD: 1.0845,
  GBPUSD: 1.265,
  USDJPY: 149.5,
  AUDUSD: 0.652,
  USDCAD: 1.358,
};

const TIMEFRAME_MS: Record<Timeframe, number> = {
  M1: 60_000,
  M5: 300_000,
  M15: 900_000,
  H1: 3_600_000,
  H4: 14_400_000,
};

function generateCandles(
  symbol: string,
  timeframe: Timeframe,
  count: number
): Candle[] {
  const base = SYMBOL_BASE_PRICES[symbol] ?? 1.0;
  const interval = TIMEFRAME_MS[timeframe];
  const now = Date.now();
  const candles: Candle[] = [];
  let price = base;

  for (let i = count - 1; i >= 0; i--) {
    const openTime = new Date(now - i * interval);
    const volatility = base * 0.0003;
    const change = (Math.random() - 0.5) * volatility * 2;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    candles.push({
      openTime,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 500) + 50,
      spread: 0.00012,
    });
    price = close;
  }

  return candles;
}

export class MockBrokerAdapter implements BrokerAdapter {
  readonly broker = "IC Markets";
  readonly platform = "cTrader (Mock)";
  readonly environment: BrokerEnvironment;

  private connected = false;
  private positions: BrokerPosition[] = [];
  private accountBalance = 10000;
  private accountEquity = 10000;

  constructor(environment: BrokerEnvironment = "demo") {
    this.environment = environment;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getAccounts(): Promise<TradingAccount[]> {
    return [
      {
        id: "mock-account-001",
        externalAccountId: "DEMO-12345678",
        accountCurrency: "USD",
        balance: this.accountBalance,
        equity: this.accountEquity,
        freeMargin: this.accountEquity * 0.85,
        leverage: 500,
        isSelected: true,
      },
    ];
  }

  async getAccountSummary(accountId: string): Promise<AccountSummary> {
    return {
      accountId,
      balance: this.accountBalance,
      equity: this.accountEquity,
      freeMargin: this.accountEquity * 0.85,
      currency: "USD",
    };
  }

  async getQuote(symbol: string): Promise<Quote> {
    const candles = generateCandles(symbol, "M1", 2);
    const last = candles[candles.length - 1];
    const spread = 0.00012;
    const bid = last.close;
    const ask = bid + spread;

    return {
      symbol,
      bid,
      ask,
      mid: (bid + ask) / 2,
      spread,
      timestamp: new Date(),
    };
  }

  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    count: number
  ): Promise<Candle[]> {
    return generateCandles(symbol, timeframe, count);
  }

  async validateOrder(order: OrderRequest): Promise<OrderValidation> {
    const errors: string[] = [];

    if (!this.connected) errors.push("Broker not connected");
    if (order.volume <= 0) errors.push("Invalid volume");
    if (order.stopLoss <= 0) errors.push("Stop loss required");
    if (order.takeProfit <= 0) errors.push("Take profit required");

    const openPositions = await this.getOpenPositions(order.accountId);
    if (openPositions.length > 0) {
      errors.push("Position already open — single-position policy enforced");
    }

    return { valid: errors.length === 0, errors };
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrderResult> {
    const validation = await this.validateOrder(order);
    if (!validation.valid) {
      return {
        success: false,
        rejectionReason: validation.errors.join("; "),
      };
    }

    const quote = await this.getQuote(order.symbol);
    const fillPrice =
      order.direction === "BUY" ? quote.ask : quote.bid;
    const orderId = uuidv4();

    this.positions.push({
      id: orderId,
      symbol: order.symbol,
      direction: order.direction,
      volume: order.volume,
      entryPrice: fillPrice,
      currentPrice: fillPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      unrealizedProfit: 0,
    });

    return {
      success: true,
      orderId,
      externalOrderId: `MOCK-${orderId.slice(0, 8).toUpperCase()}`,
      fillPrice,
    };
  }

  async getOpenPositions(accountId: string): Promise<BrokerPosition[]> {
    void accountId;
    return [...this.positions];
  }

  async closePosition(positionId: string): Promise<BrokerOrderResult> {
    const idx = this.positions.findIndex((p) => p.id === positionId);
    if (idx === -1) {
      return { success: false, rejectionReason: "Position not found" };
    }

    const position = this.positions[idx];
    const quote = await this.getQuote(position.symbol);
    const exitPrice =
      position.direction === "BUY" ? quote.bid : quote.ask;
    const pipValue = 10;
    const pips =
      position.direction === "BUY"
        ? (exitPrice - position.entryPrice) * 10000
        : (position.entryPrice - exitPrice) * 10000;
    const profit = pips * pipValue * position.volume;

    this.accountBalance += profit;
    this.accountEquity = this.accountBalance;
    this.positions.splice(idx, 1);

    return {
      success: true,
      orderId: uuidv4(),
      fillPrice: exitPrice,
    };
  }
}
