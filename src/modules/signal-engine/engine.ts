import { v4 as uuidv4 } from "uuid";
import type {
  Candle,
  MarketSession,
  Quote,
  ScoreBreakdown,
  Signal,
  SignalDirection,
  Timeframe,
  TimeframeProfile,
} from "@/types";
import { computeIndicators } from "@/modules/technical-analysis";
import { getCurrentSession } from "@/modules/market-data";

interface TimeframeAnalysis {
  timeframe: Timeframe;
  indicators: ReturnType<typeof computeIndicators>;
  candles: Candle[];
}

interface GenerateSignalInput {
  symbol: string;
  quote: Quote;
  timeframeData: TimeframeAnalysis[];
  profile: TimeframeProfile;
  allowedSessions: MarketSession[];
  manualThreshold: number;
  spreadLimit: number;
  newsBlocked?: boolean;
}

function scoreCategory(
  category: string,
  maxPoints: number,
  earnedPoints: number,
  description: string
): ScoreBreakdown {
  return {
    category,
    maxPoints,
    earnedPoints: Math.min(earnedPoints, maxPoints),
    description,
  };
}

function detectPriceAction(candles: Candle[]): {
  bullish: boolean;
  bearish: boolean;
  pattern: string;
} {
  if (candles.length < 2) {
    return { bullish: false, bearish: false, pattern: "none" };
  }
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];
  const body = Math.abs(curr.close - curr.open);
  const range = curr.high - curr.low;

  const bullishEngulfing =
    prev.close < prev.open &&
    curr.close > curr.open &&
    curr.close > prev.open &&
    curr.open < prev.close;

  const bearishEngulfing =
    prev.close > prev.open &&
    curr.close < curr.open &&
    curr.close < prev.open &&
    curr.open > prev.close;

  const lowerWick = Math.min(curr.open, curr.close) - curr.low;
  const upperWick = curr.high - Math.max(curr.open, curr.close);
  const pinBarBull = lowerWick > body * 2 && upperWick < body;
  const pinBarBear = upperWick > body * 2 && lowerWick < body;

  if (bullishEngulfing) return { bullish: true, bearish: false, pattern: "bullish engulfing" };
  if (bearishEngulfing) return { bullish: false, bearish: true, pattern: "bearish engulfing" };
  if (pinBarBull && range > 0) return { bullish: true, bearish: false, pattern: "bullish rejection" };
  if (pinBarBear && range > 0) return { bullish: false, bearish: true, pattern: "bearish rejection" };

  return { bullish: false, bearish: false, pattern: "none" };
}

function computeBuyScore(input: GenerateSignalInput): {
  score: number;
  breakdown: ScoreBreakdown[];
  reasons: string[];
  penalties: string[];
} {
  const trendTf = input.timeframeData.find((t) => t.timeframe === input.profile.trend);
  const confirmationTf = input.timeframeData.find(
    (t) => t.timeframe === input.profile.confirmation
  );
  const signalTf = input.timeframeData.find((t) => t.timeframe === input.profile.signal);

  const breakdown: ScoreBreakdown[] = [];
  const reasons: string[] = [];
  const penalties: string[] = [];
  let rawScore = 0;

  if (trendTf) {
    let pts = 0;
    if (trendTf.indicators.trend === "bullish") {
      pts = 15;
      reasons.push(`${trendTf.timeframe} EMA trend is bullish`);
    } else if (trendTf.indicators.trend === "neutral") pts = 7;
    else penalties.push(`${trendTf.timeframe} trend conflict`);
    breakdown.push(
      scoreCategory(`${trendTf.timeframe} trend alignment`, 15, pts, trendTf.indicators.trend)
    );
    rawScore += pts;
  }

  if (confirmationTf) {
    let pts = 0;
    if (confirmationTf.indicators.structure === "higher_highs") {
      pts = 15;
      reasons.push(`${confirmationTf.timeframe} higher-high structure`);
    } else if (confirmationTf.indicators.structure === "mixed") pts = 8;
    breakdown.push(
      scoreCategory(
        `${confirmationTf.timeframe} structure alignment`,
        15,
        pts,
        confirmationTf.indicators.structure
      )
    );
    rawScore += pts;
  }

  if (signalTf) {
    let pts = 0;
    const pa = detectPriceAction(signalTf.candles);
    if (pa.bullish) {
      pts = 14;
      reasons.push(`${signalTf.timeframe} ${pa.pattern}`);
    } else if (signalTf.indicators.trend === "bullish") pts = 10;
    breakdown.push(scoreCategory(`${signalTf.timeframe} entry setup`, 15, pts, pa.pattern));
    rawScore += pts;
  }

  const momentumSource = signalTf ?? confirmationTf;
  if (momentumSource) {
    let pts = 0;
    const ind = momentumSource.indicators;
    if (ind.rsi > 50 && ind.rsi < 70) pts += 4;
    if (ind.macdHistogram > 0) {
      pts += 4;
      reasons.push("MACD bullish crossover");
    }
    if (ind.rsi > 50) reasons.push("RSI confirms momentum");
    breakdown.push(scoreCategory("Momentum confirmation", 10, pts, "RSI/MACD"));
    rawScore += pts;
  }

  if (signalTf) {
    let pts = 0;
    const atr = signalTf.indicators.atr;
    const price = signalTf.candles[signalTf.candles.length - 1].close;
    const atrPct = (atr / price) * 10000;
    if (atrPct > 3 && atrPct < 15) pts = 8;
    else if (atrPct >= 1) pts = 5;
    if (pts >= 5) reasons.push("ATR within target range");
    breakdown.push(scoreCategory("Volatility suitability", 10, pts, `${atrPct.toFixed(1)} pips ATR`));
    rawScore += pts;
  }

  if (signalTf) {
    let pts = 0;
    const price = signalTf.candles[signalTf.candles.length - 1].close;
    const nearSupport = price <= signalTf.indicators.bbLower * 1.002;
    const nearMiddle = Math.abs(price - signalTf.indicators.bbMiddle) / price < 0.001;
    if (nearSupport) {
      pts = 9;
      reasons.push("Entry near valid support");
    } else if (nearMiddle) pts = 5;
    breakdown.push(scoreCategory("Support/resistance location", 10, pts, nearSupport ? "near support" : "mid-range"));
    rawScore += pts;
  }

  if (signalTf) {
    const pa = detectPriceAction(signalTf.candles);
    let pts = pa.bullish ? 7 : 0;
    if (pa.bullish) reasons.push(`Bullish ${pa.pattern} candle`);
    breakdown.push(scoreCategory("Price-action confirmation", 10, pts, pa.pattern));
    rawScore += pts;
  }

  let spreadPts = 0;
  if (input.quote.spread <= input.spreadLimit) {
    spreadPts = 5;
    reasons.push("Spread within configured limit");
  } else {
    penalties.push("Spread expansion");
  }
  breakdown.push(scoreCategory("Spread and execution quality", 5, spreadPts, `${(input.quote.spread * 10000).toFixed(1)} pips`));
  rawScore += spreadPts;

  const session = getCurrentSession();
  let sessionPts = 0;
  if (input.allowedSessions.includes(session)) {
    sessionPts = 5;
    reasons.push(`${session.replace("_", " ")} session active`);
  }
  breakdown.push(scoreCategory("Session quality", 5, sessionPts, session));
  rawScore += sessionPts;

  let newsPts = 0;
  if (!input.newsBlocked) {
    newsPts = 5;
    reasons.push("No high-impact news lockout");
  } else {
    penalties.push("High-impact news lockout");
  }
  breakdown.push(scoreCategory("News safety", 5, newsPts, input.newsBlocked ? "blocked" : "clear"));
  rawScore += newsPts;

  let penaltyTotal = 0;
  if (trendTf?.indicators.trend === "bearish") penaltyTotal += 12;
  if (input.quote.spread > input.spreadLimit) penaltyTotal += 8;
  if (signalTf) {
    const price = signalTf.candles[signalTf.candles.length - 1].close;
    if (price >= signalTf.indicators.bbUpper * 0.998) {
      penaltyTotal += 10;
      penalties.push("Entry near resistance");
    }
  }
  if ((trendTf?.indicators.adx ?? 0) < 20) penaltyTotal += 5;

  const finalScore = Math.max(0, Math.min(100, rawScore - penaltyTotal));
  return { score: finalScore, breakdown, reasons, penalties };
}

function computeSellScore(input: GenerateSignalInput): {
  score: number;
  breakdown: ScoreBreakdown[];
  reasons: string[];
  penalties: string[];
} {
  const inverted: GenerateSignalInput = {
    ...input,
    timeframeData: input.timeframeData.map((tf) => ({
      ...tf,
      indicators: {
        ...tf.indicators,
        trend:
          tf.indicators.trend === "bullish"
            ? "bearish"
            : tf.indicators.trend === "bearish"
              ? "bullish"
              : "neutral",
        structure:
          tf.indicators.structure === "higher_highs"
            ? "lower_lows"
            : tf.indicators.structure === "lower_lows"
              ? "higher_highs"
              : "mixed",
        rsi: 100 - tf.indicators.rsi,
        macdHistogram: -tf.indicators.macdHistogram,
      },
      candles: tf.candles.map((c) => ({
        ...c,
        open: -c.open,
        high: -c.low,
        low: -c.high,
        close: -c.close,
      })),
    })),
  };

  const result = computeBuyScore(inverted);
  const sellReasons = result.reasons.map((r) =>
    r
      .replace("bullish", "BEARISH_TMP")
      .replace("bearish", "bullish")
      .replace("BEARISH_TMP", "bearish")
      .replace("Bullish", "Bearish")
      .replace("higher-high", "lower-low")
      .replace("support", "resistance")
  );
  return { ...result, reasons: sellReasons };
}

function directionFromScore(
  buyScore: number,
  sellScore: number,
  threshold: number
): SignalDirection {
  const max = Math.max(buyScore, sellScore);
  if (max < threshold) return "WAIT";
  if (buyScore > sellScore) {
    if (buyScore >= 80) return "STRONG_BUY";
    return "BUY";
  }
  if (sellScore >= 80) return "STRONG_SELL";
  return "SELL";
}

export function generateSignal(input: GenerateSignalInput): Signal {
  const buy = computeBuyScore(input);
  const sell = computeSellScore(input);
  const direction = directionFromScore(
    buy.score,
    sell.score,
    input.manualThreshold
  );

  const isBuy = direction === "BUY" || direction === "STRONG_BUY";
  const active = isBuy ? buy : sell;
  const trustScore = isBuy ? buy.score : sell.score;
  const signalTf = input.timeframeData.find((t) => t.timeframe === input.profile.signal);
  const trendTf = input.timeframeData.find((t) => t.timeframe === input.profile.trend);
  const price = input.quote.mid;
  const atr = signalTf?.indicators.atr ?? price * 0.0005;

  const stopDistance = atr * 1.5;
  const tpDistance = stopDistance * 2;

  const stopLoss = isBuy ? price - stopDistance : price + stopDistance;
  const takeProfit = isBuy ? price + tpDistance : price - tpDistance;

  const warnings = [
    "This is a technical signal, not a guaranteed outcome.",
    "Price may move before order confirmation.",
  ];
  if (input.newsBlocked) {
    warnings.push("NEWS FILTER UNAVAILABLE — automatic trading restricted");
  }

  return {
    id: uuidv4(),
    symbol: input.symbol,
    direction,
    timeframe: input.profile.signal,
    trustScore,
    entryMin: isBuy ? price - atr * 0.3 : price + atr * 0.3,
    entryMax: isBuy ? price + atr * 0.3 : price - atr * 0.3,
    stopLoss,
    takeProfit,
    rewardRisk: 2,
    scoreBreakdown: active.breakdown,
    reasons: active.reasons,
    warnings,
    higherTimeframeTrend:
      trendTf?.indicators.trend === "bullish"
        ? `${input.profile.trend} Bullish`
        : trendTf?.indicators.trend === "bearish"
          ? `${input.profile.trend} Bearish`
          : `${input.profile.trend} Neutral`,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60_000),
  };
}

export async function analyzeMultiTimeframe(
  symbol: string,
  quote: Quote,
  candlesByTf: Partial<Record<Timeframe, Candle[]>>,
  profile: TimeframeProfile,
  settings: {
    allowedSessions: MarketSession[];
    manualThreshold: number;
    spreadLimit: number;
    newsBlocked?: boolean;
  }
): Promise<Signal> {
  const uniqueTimeframes = Array.from(
    new Set([profile.trend, profile.confirmation, profile.signal, profile.entry])
  );

  const timeframeData: TimeframeAnalysis[] = uniqueTimeframes
    .filter((tf) => candlesByTf[tf]?.length)
    .map((timeframe) => ({
      timeframe,
      candles: candlesByTf[timeframe]!,
      indicators: computeIndicators(candlesByTf[timeframe]!),
    }));

  return generateSignal({
    symbol,
    quote,
    timeframeData,
    profile,
    ...settings,
  });
}
