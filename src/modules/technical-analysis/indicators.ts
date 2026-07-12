import type { Candle } from "@/types";

export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

export function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);
  const macdLine = closes.map((_, i) => fastEma[i] - slowEma[i]);
  const signalLine = ema(
    macdLine.filter((v) => !Number.isNaN(v)),
    signalPeriod
  );
  const paddedSignal = new Array(closes.length - signalLine.length)
    .fill(NaN)
    .concat(signalLine);
  const histogram = macdLine.map((v, i) =>
    Number.isNaN(paddedSignal[i]) ? NaN : v - paddedSignal[i]
  );
  return { macd: macdLine, signal: paddedSignal, histogram };
}

export function atr(candles: Candle[], period = 14): number[] {
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trs.push(candles[i].high - candles[i].low);
    } else {
      const h = candles[i].high;
      const l = candles[i].low;
      const pc = candles[i - 1].close;
      trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
  }
  return sma(trs, period);
}

export function bollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance =
      slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
  }

  return { upper, middle, lower };
}

export function adx(candles: Candle[], period = 14): number[] {
  const len = candles.length;
  const result: number[] = new Array(len).fill(NaN);
  if (len < period * 2) return result;

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < len; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }

  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlus = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinus = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxValues: number[] = [];

  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlus = smoothPlus - smoothPlus / period + plusDM[i];
    smoothMinus = smoothMinus - smoothMinus / period + minusDM[i];

    const plusDI = (100 * smoothPlus) / smoothTR;
    const minusDI = (100 * smoothMinus) / smoothTR;
    const diSum = plusDI + minusDI;
    const dx = diSum === 0 ? 0 : (100 * Math.abs(plusDI - minusDI)) / diSum;
    dxValues.push(dx);
  }

  if (dxValues.length >= period) {
    let adxVal = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result[period * 2] = adxVal;
    for (let i = period; i < dxValues.length; i++) {
      adxVal = (adxVal * (period - 1) + dxValues[i]) / period;
      result[i + period] = adxVal;
    }
  }

  return result;
}

export function findSwingHighs(candles: Candle[], lookback = 3): number[] {
  const swings: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (
        candles[i].high <= candles[i - j].high ||
        candles[i].high <= candles[i + j].high
      ) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) swings.push(candles[i].high);
  }
  return swings;
}

export function findSwingLows(candles: Candle[], lookback = 3): number[] {
  const swings: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (
        candles[i].low >= candles[i - j].low ||
        candles[i].low >= candles[i + j].low
      ) {
        isLow = false;
        break;
      }
    }
    if (isLow) swings.push(candles[i].low);
  }
  return swings;
}

export interface IndicatorSnapshot {
  ema9: number;
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  adx: number;
  atr: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  trend: "bullish" | "bearish" | "neutral";
  structure: "higher_highs" | "lower_lows" | "mixed";
}

export function computeIndicators(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const last = closes.length - 1;

  const ema9Arr = ema(closes, 9);
  const ema20Arr = ema(closes, 20);
  const ema50Arr = ema(closes, 50);
  const ema200Arr = ema(closes, 200);
  const rsiArr = rsi(closes);
  const { macd: macdArr, signal: signalArr, histogram } = macd(closes);
  const adxArr = adx(candles);
  const atrArr = atr(candles);
  const bb = bollingerBands(closes);

  const ema9 = ema9Arr[last];
  const ema20 = ema20Arr[last];
  const ema50 = ema50Arr[last];
  const ema200 = ema200Arr[last];

  let trend: "bullish" | "bearish" | "neutral" = "neutral";
  if (ema9 > ema20 && ema20 > ema50) trend = "bullish";
  else if (ema9 < ema20 && ema20 < ema50) trend = "bearish";

  const highs = findSwingHighs(candles);
  const lows = findSwingLows(candles);
  let structure: "higher_highs" | "lower_lows" | "mixed" = "mixed";
  if (highs.length >= 2 && highs[highs.length - 1] > highs[highs.length - 2]) {
    structure = "higher_highs";
  } else if (
    lows.length >= 2 &&
    lows[lows.length - 1] < lows[lows.length - 2]
  ) {
    structure = "lower_lows";
  }

  return {
    ema9,
    ema20,
    ema50,
    ema200,
    rsi: rsiArr[last],
    macd: macdArr[last],
    macdSignal: signalArr[last],
    macdHistogram: histogram[last],
    adx: adxArr[last] ?? 0,
    atr: atrArr[last] ?? 0,
    bbUpper: bb.upper[last],
    bbMiddle: bb.middle[last],
    bbLower: bb.lower[last],
    trend,
    structure,
  };
}
