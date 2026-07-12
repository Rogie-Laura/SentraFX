import { v4 as uuidv4 } from "uuid";
import type {
  BrokerEnvironment,
  OrderDirection,
  OrderStatus,
  Signal,
  TradingMode,
} from "@/types";
import { createBrokerAdapter } from "@/modules/broker";
import { runPreflightChecks, type DailyRiskState } from "@/modules/risk-engine";
import type { RiskSettings } from "@/types";

const usedIdempotencyKeys = new Set<string>();
const orderLock = { locked: false };

export interface PaperOrder {
  id: string;
  signalId: string;
  symbol: string;
  direction: OrderDirection;
  volume: number;
  fillPrice: number;
  stopLoss: number;
  takeProfit: number;
  status: OrderStatus;
  mode: TradingMode;
  environment: BrokerEnvironment;
  idempotencyKey: string;
  requestedAt: Date;
  filledAt?: Date;
}

export interface PaperPosition {
  id: string;
  orderId: string;
  symbol: string;
  direction: OrderDirection;
  entryPrice: number;
  currentPrice: number;
  volume: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedProfit: number;
  status: "open" | "closed";
  openedAt: Date;
  closedAt?: Date;
}

const paperOrders: PaperOrder[] = [];
const paperPositions: PaperPosition[] = [];

export async function acquireOrderLock(): Promise<boolean> {
  if (orderLock.locked) return false;
  orderLock.locked = true;
  return true;
}

export function releaseOrderLock(): void {
  orderLock.locked = false;
}

export function isIdempotencyKeyUsed(key: string): boolean {
  return usedIdempotencyKeys.has(key);
}

export async function placePaperOrder(input: {
  signal: Signal;
  settings: RiskSettings;
  dailyState: DailyRiskState;
  equity: number;
  freeMargin: number;
  spread: number;
  mode: TradingMode;
  environment: BrokerEnvironment;
  idempotencyKey: string;
  emergencyStop: boolean;
  brokerConnected: boolean;
  newsBlocked: boolean;
}): Promise<{
  success: boolean;
  order?: PaperOrder;
  position?: PaperPosition;
  errors: string[];
}> {
  if (isIdempotencyKeyUsed(input.idempotencyKey)) {
    return { success: false, errors: ["Duplicate order — idempotency key already used"] };
  }

  const lockAcquired = await acquireOrderLock();
  if (!lockAcquired) {
    return { success: false, errors: ["Order lock unavailable — another order in progress"] };
  }

  try {
    const signalExpired = input.signal.expiresAt < new Date();
    const hasOpenPosition = paperPositions.some((p) => p.status === "open");

    const preflight = runPreflightChecks({
      signal: input.signal,
      equity: input.equity,
      freeMargin: input.freeMargin,
      spread: input.spread,
      settings: input.settings,
      dailyState: input.dailyState,
      hasOpenPosition,
      hasPendingOrder: false,
      emergencyStop: input.emergencyStop,
      brokerConnected: input.brokerConnected,
      newsBlocked: input.newsBlocked,
      signalExpired,
    });

    if (!preflight.canPlace) {
      return { success: false, errors: preflight.errors };
    }

    const adapter = createBrokerAdapter("mock", input.environment);
    await adapter.connect();

    const direction: OrderDirection =
      input.signal.direction === "SELL" || input.signal.direction === "STRONG_SELL"
        ? "SELL"
        : "BUY";

    const quote = await adapter.getQuote(input.signal.symbol);
    const fillPrice = direction === "BUY" ? quote.ask : quote.bid;

    const order: PaperOrder = {
      id: uuidv4(),
      signalId: input.signal.id,
      symbol: input.signal.symbol,
      direction,
      volume: preflight.lotSize,
      fillPrice,
      stopLoss: input.signal.stopLoss,
      takeProfit: input.signal.takeProfit,
      status: "filled",
      mode: input.mode,
      environment: input.environment,
      idempotencyKey: input.idempotencyKey,
      requestedAt: new Date(),
      filledAt: new Date(),
    };

    const position: PaperPosition = {
      id: uuidv4(),
      orderId: order.id,
      symbol: order.symbol,
      direction: order.direction,
      entryPrice: fillPrice,
      currentPrice: fillPrice,
      volume: order.volume,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      unrealizedProfit: 0,
      status: "open",
      openedAt: new Date(),
    };

    paperOrders.push(order);
    paperPositions.push(position);
    usedIdempotencyKeys.add(input.idempotencyKey);

    return { success: true, order, position, errors: [] };
  } finally {
    releaseOrderLock();
  }
}

export function getOpenPaperPosition(): PaperPosition | null {
  return paperPositions.find((p) => p.status === "open") ?? null;
}

export function getPaperOrders(): PaperOrder[] {
  return [...paperOrders];
}

export function closePaperPosition(positionId: string, exitPrice: number): PaperPosition | null {
  const position = paperPositions.find((p) => p.id === positionId && p.status === "open");
  if (!position) return null;

  const pipValue = 10;
  const pips =
    position.direction === "BUY"
      ? (exitPrice - position.entryPrice) * 10000
      : (position.entryPrice - exitPrice) * 10000;
  position.unrealizedProfit = pips * pipValue * position.volume;
  position.currentPrice = exitPrice;
  position.status = "closed";
  position.closedAt = new Date();

  return position;
}

export function activateEmergencyStop(): {
  newOrdersBlocked: boolean;
  autoModeDisabled: boolean;
} {
  orderLock.locked = false;
  return { newOrdersBlocked: true, autoModeDisabled: true };
}
