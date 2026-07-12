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

export interface BrokerAdapter {
  readonly broker: string;
  readonly platform: string;
  readonly environment: BrokerEnvironment;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<TradingAccount[]>;
  getAccountSummary(accountId: string): Promise<AccountSummary>;
  getQuote(symbol: string): Promise<Quote>;
  getCandles(
    symbol: string,
    timeframe: Timeframe,
    count: number
  ): Promise<Candle[]>;
  validateOrder(order: OrderRequest): Promise<OrderValidation>;
  placeOrder(order: OrderRequest): Promise<BrokerOrderResult>;
  getOpenPositions(accountId: string): Promise<BrokerPosition[]>;
  closePosition(positionId: string): Promise<BrokerOrderResult>;
}
