"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  type UTCTimestamp,
} from "lightweight-charts";

interface CandleChartProps {
  candles: Array<{
    openTime: string | Date;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  height?: number;
}

export function CandleChart({ candles, height = 320 }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Create the chart exactly once on mount — never recreated on data refetch
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#121820" },
        textColor: "#6b7a8f",
      },
      grid: {
        vertLines: { color: "#1e283620" },
        horzLines: { color: "#1e283620" },
      },
      timeScale: { borderColor: "#1e2836" },
      rightPriceScale: { borderColor: "#1e2836" },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00d4aa",
      downColor: "#ff4757",
      borderUpColor: "#00d4aa",
      borderDownColor: "#ff4757",
      wickUpColor: "#00d4aa",
      wickDownColor: "#ff4757",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current = null;
      seriesRef.current = null;
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update size only if it changes
  useEffect(() => {
    chartRef.current?.applyOptions({ height });
  }, [height]);

  // Feed new candle data into the existing series without recreating the chart
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    seriesRef.current.setData(
      candles.map((c) => ({
        time: Math.floor(
          new Date(c.openTime).getTime() / 1000
        ) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div className="card overflow-hidden">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
