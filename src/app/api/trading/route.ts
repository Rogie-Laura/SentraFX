import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getQuote } from "@/modules/market-data";
import { runPreflightChecks, type DailyRiskState } from "@/modules/risk-engine";
import {
  placePaperOrder,
  getOpenPaperPosition,
  closePaperPosition,
  activateEmergencyStop,
} from "@/modules/order-engine";
import { recordPaperTrade, closeJournalEntry } from "@/modules/trade-journal";
import { logAuditEvent } from "@/modules/audit";
import {
  getTradingSettings,
  isEmergencyStopActive,
  setEmergencyStop,
} from "@/lib/settings-store";

const MOCK_EQUITY = 10000;
const MOCK_FREE_MARGIN = 8500;

const dailyState: DailyRiskState = {
  startingEquity: MOCK_EQUITY,
  realizedProfitLoss: 0,
  unrealizedProfitLoss: 0,
  tradesCount: 0,
  consecutiveLosses: 0,
  tradingBlocked: false,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "position";

  if (type === "position") {
    const position = getOpenPaperPosition();
    return NextResponse.json({ position });
  }

  return NextResponse.json({ orders: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const action = body.action as string;
  const settings = getTradingSettings();

  if (action === "preflight") {
    const quote = await getQuote(settings.selectedSymbol);
    const preflight = runPreflightChecks({
      signal: body.signal,
      equity: MOCK_EQUITY,
      freeMargin: MOCK_FREE_MARGIN,
      spread: quote.spread,
      settings,
      dailyState,
      hasOpenPosition: !!getOpenPaperPosition(),
      hasPendingOrder: false,
      emergencyStop: isEmergencyStopActive(),
      brokerConnected: true,
      newsBlocked: false,
      signalExpired: new Date(body.signal.expiresAt) < new Date(),
    });
    return NextResponse.json(preflight);
  }

  if (action === "place-order") {
    const quote = await getQuote(settings.selectedSymbol);
    const result = await placePaperOrder({
      signal: body.signal,
      settings,
      dailyState,
      equity: MOCK_EQUITY,
      freeMargin: MOCK_FREE_MARGIN,
      spread: quote.spread,
      mode: settings.tradingMode,
      environment: "demo",
      idempotencyKey: body.idempotencyKey ?? uuidv4(),
      emergencyStop: isEmergencyStopActive(),
      brokerConnected: true,
      newsBlocked: false,
    });

    if (result.success && result.order && result.position) {
      recordPaperTrade(
        result.order,
        result.position,
        body.signal.trustScore,
        body.signal.reasons
      );
      dailyState.tradesCount += 1;
      logAuditEvent({
        eventType: "order_placed",
        eventDescription: `Paper order placed: ${result.order.direction} ${result.order.symbol}`,
        metadata: { orderId: result.order.id },
      });
    } else {
      logAuditEvent({
        eventType: "order_rejected",
        eventDescription: result.errors.join("; "),
      });
    }

    return NextResponse.json(result);
  }

  if (action === "close-position") {
    const position = getOpenPaperPosition();
    if (!position) {
      return NextResponse.json({ success: false, error: "No open position" });
    }
    const quote = await getQuote(position.symbol);
    const exitPrice = position.direction === "BUY" ? quote.bid : quote.ask;
    const closed = closePaperPosition(position.id, exitPrice);
    if (closed) {
      const riskAmount = MOCK_EQUITY * (settings.riskPercent / 100);
      const rMultiple = riskAmount > 0 ? closed.unrealizedProfit / riskAmount : 0;
      closeJournalEntry(closed.orderId, closed.unrealizedProfit, rMultiple);
      if (closed.unrealizedProfit < 0) {
        dailyState.consecutiveLosses += 1;
        dailyState.realizedProfitLoss += closed.unrealizedProfit;
      } else {
        dailyState.consecutiveLosses = 0;
        dailyState.realizedProfitLoss += closed.unrealizedProfit;
      }
      logAuditEvent({
        eventType: "position_closed",
        eventDescription: `Position closed: P/L ${closed.unrealizedProfit.toFixed(2)}`,
      });
    }
    return NextResponse.json({ success: true, position: closed });
  }

  if (action === "emergency-stop") {
    const mode = body.mode ?? "stop_new";
    setEmergencyStop(true);
    dailyState.tradingBlocked = true;
    dailyState.blockReason = "Emergency stop activated";
    activateEmergencyStop();
    logAuditEvent({
      eventType: "emergency_stop",
      eventDescription: `Emergency stop: ${mode}`,
    });
    return NextResponse.json({
      success: true,
      newOrdersBlocked: true,
      autoModeDisabled: true,
      positionClosed: mode === "stop_and_close",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
