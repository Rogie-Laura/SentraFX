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

/**
 * cTrader Open API adapter — stub for Phase 6 demo integration.
 * Requires OAuth tokens stored server-side; never expose secrets to the client.
 */
export class CTraderBrokerAdapter implements BrokerAdapter {
  readonly broker = "IC Markets";
  readonly platform = "cTrader";
  readonly environment: BrokerEnvironment;

  constructor(
    environment: BrokerEnvironment,
    private readonly accessToken?: string
  ) {
    this.environment = environment;
  }

  private ensureToken(): void {
    if (!this.accessToken) {
      throw new Error(
        "cTrader not authorized. Connect IC Markets cTrader Account via OAuth."
      );
    }
  }

  async connect(): Promise<void> {
    this.ensureToken();
    // Phase 6: establish cTrader Open API session
  }

  async disconnect(): Promise<void> {
    // Phase 6: revoke session
  }

  async getAccounts(): Promise<TradingAccount[]> {
    this.ensureToken();
    throw new Error("cTrader demo integration not yet enabled");
  }

  async getAccountSummary(accountId: string): Promise<AccountSummary> {
    void accountId;
    this.ensureToken();
    throw new Error("cTrader demo integration not yet enabled");
  }

  async getQuote(symbol: string): Promise<Quote> {
    void symbol;
    this.ensureToken();
    throw new Error("cTrader demo integration not yet enabled");
  }

  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    count: number
  ): Promise<Candle[]> {
    void symbol;
    void timeframe;
    void count;
    this.ensureToken();
    throw new Error("cTrader demo integration not yet enabled");
  }

  async validateOrder(order: OrderRequest): Promise<OrderValidation> {
    void order;
    this.ensureToken();
    return { valid: false, errors: ["cTrader demo integration not yet enabled"] };
  }

  async placeOrder(order: OrderRequest): Promise<BrokerOrderResult> {
    void order;
    this.ensureToken();
    return {
      success: false,
      rejectionReason: "cTrader demo integration not yet enabled",
    };
  }

  async getOpenPositions(accountId: string): Promise<BrokerPosition[]> {
    void accountId;
    this.ensureToken();
    return [];
  }

  async closePosition(positionId: string): Promise<BrokerOrderResult> {
    void positionId;
    this.ensureToken();
    return {
      success: false,
      rejectionReason: "cTrader demo integration not yet enabled",
    };
  }
}
