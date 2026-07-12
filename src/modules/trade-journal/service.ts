import type { JournalEntry, OrderDirection, TradingMode } from "@/types";
import type { PaperOrder, PaperPosition } from "@/modules/order-engine";

const journal: JournalEntry[] = [];

export function addJournalEntry(entry: Omit<JournalEntry, "id">): JournalEntry {
  const record: JournalEntry = {
    ...entry,
    id: crypto.randomUUID(),
  };
  journal.unshift(record);
  return record;
}

export function recordPaperTrade(
  order: PaperOrder,
  position: PaperPosition,
  trustScore: number,
  reasons: string[]
): JournalEntry {
  return addJournalEntry({
    date: order.filledAt ?? new Date(),
    symbol: order.symbol,
    direction: order.direction,
    trustScore,
    entry: order.fillPrice,
    stopLoss: order.stopLoss,
    takeProfit: order.takeProfit,
    result: position.status === "open" ? "open" : "win",
    profitLoss: position.unrealizedProfit,
    rMultiple: 0,
    mode: order.mode,
    reasons,
    brokerOrderRef: order.id,
  });
}

export function closeJournalEntry(
  orderId: string,
  profitLoss: number,
  rMultiple: number
): JournalEntry | null {
  const entry = journal.find((j) => j.brokerOrderRef === orderId);
  if (!entry) return null;
  entry.profitLoss = profitLoss;
  entry.rMultiple = rMultiple;
  entry.result = profitLoss > 0 ? "win" : profitLoss < 0 ? "loss" : "breakeven";
  return entry;
}

export function getJournalEntries(filters?: {
  symbol?: string;
  direction?: OrderDirection;
  mode?: TradingMode;
}): JournalEntry[] {
  return journal.filter((entry) => {
    if (filters?.symbol && entry.symbol !== filters.symbol) return false;
    if (filters?.direction && entry.direction !== filters.direction) return false;
    if (filters?.mode && entry.mode !== filters.mode) return false;
    return true;
  });
}

export function getJournalStats() {
  const closed = journal.filter((j) => j.result !== "open");
  const wins = closed.filter((j) => j.result === "win");
  const losses = closed.filter((j) => j.result === "loss");
  const grossProfit = wins.reduce((s, j) => s + j.profitLoss, 0);
  const grossLoss = Math.abs(losses.reduce((s, j) => s + j.profitLoss, 0));
  const netProfit = closed.reduce((s, j) => s + j.profitLoss, 0);

  return {
    totalTrades: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    netProfit,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    averageR: closed.length
      ? closed.reduce((s, j) => s + j.rMultiple, 0) / closed.length
      : 0,
  };
}
