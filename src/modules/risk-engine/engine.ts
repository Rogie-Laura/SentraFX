import type { OrderDirection, PreflightResult, RiskSettings, Signal } from "@/types";

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  riskPercent: 1,
  dailyLossPercent: 3,
  dailyProfitLockPercent: 5,
  maximumTradesPerDay: 5,
  maximumConsecutiveLosses: 3,
  maximumSpread: 0.0003,
  minimumRewardRisk: 1.5,
  cooldownMinutes: 15,
};

export interface DailyRiskState {
  startingEquity: number;
  realizedProfitLoss: number;
  unrealizedProfitLoss: number;
  tradesCount: number;
  consecutiveLosses: number;
  tradingBlocked: boolean;
  blockReason?: string;
}

export function calculatePositionSize(
  equity: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  pipValue = 10,
  minVolume = 0.01,
  maxVolume = 100,
  volumeStep = 0.01
): number {
  const riskAmount = equity * (riskPercent / 100);
  const stopDistancePips = Math.abs(entryPrice - stopLoss) * 10000;
  if (stopDistancePips === 0) return minVolume;

  const rawVolume = riskAmount / (stopDistancePips * pipValue);
  const stepped = Math.floor(rawVolume / volumeStep) * volumeStep;
  return Math.max(minVolume, Math.min(maxVolume, stepped));
}

export function validateDailyLimits(
  state: DailyRiskState,
  settings: RiskSettings
): { allowed: boolean; reason?: string } {
  if (state.tradingBlocked) {
    return { allowed: false, reason: state.blockReason ?? "Trading blocked" };
  }

  const dailyLoss =
    state.realizedProfitLoss + state.unrealizedProfitLoss;
  const maxLoss = state.startingEquity * (settings.dailyLossPercent / 100);
  if (dailyLoss <= -maxLoss) {
    return { allowed: false, reason: "Daily loss limit reached" };
  }

  if (state.consecutiveLosses >= settings.maximumConsecutiveLosses) {
    return { allowed: false, reason: "Consecutive loss limit reached" };
  }

  if (state.tradesCount >= settings.maximumTradesPerDay) {
    return { allowed: false, reason: "Maximum trades per day reached" };
  }

  return { allowed: true };
}

export function runPreflightChecks(input: {
  signal: Signal;
  equity: number;
  freeMargin: number;
  spread: number;
  settings: RiskSettings;
  dailyState: DailyRiskState;
  hasOpenPosition: boolean;
  hasPendingOrder: boolean;
  emergencyStop: boolean;
  brokerConnected: boolean;
  newsBlocked: boolean;
  signalExpired: boolean;
}): PreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.emergencyStop) errors.push("Emergency stop is active");
  if (!input.brokerConnected) errors.push("Broker not connected");
  if (input.signalExpired) errors.push("Signal has expired");
  if (input.hasOpenPosition) errors.push("Open SENTRA FX position exists");
  if (input.hasPendingOrder) errors.push("Pending SENTRA FX order exists");
  if (input.newsBlocked) errors.push("News lockout is active");

  if (
    input.signal.direction === "WAIT" ||
    input.signal.direction === "BLOCKED"
  ) {
    errors.push("Signal is not actionable");
  }

  if (input.signal.trustScore < 60) {
    errors.push("Trust score below minimum threshold");
  }

  if (input.spread > input.settings.maximumSpread) {
    errors.push("Current spread exceeded the allowed limit");
  }

  const dailyCheck = validateDailyLimits(input.dailyState, input.settings);
  if (!dailyCheck.allowed) errors.push(dailyCheck.reason!);

  if (input.signal.rewardRisk < input.settings.minimumRewardRisk) {
    errors.push("Risk-reward below minimum");
  }

  const lotSize = calculatePositionSize(
    input.equity,
    input.settings.riskPercent,
    (input.signal.entryMin + input.signal.entryMax) / 2,
    input.signal.stopLoss
  );

  if (lotSize <= 0) errors.push("Invalid lot size");

  const estimatedRisk = input.equity * (input.settings.riskPercent / 100);
  const estimatedProfit = estimatedRisk * input.signal.rewardRisk;

  if (input.freeMargin < estimatedRisk * 2) {
    warnings.push("Free margin is tight for this trade");
  }

  warnings.push(
    "Trust score is a technical confluence score, not a guaranteed win probability."
  );

  return {
    canPlace: errors.length === 0,
    errors,
    warnings,
    estimatedRisk,
    estimatedProfit,
    lotSize,
  };
}
