"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";

export default function AnalysisPage() {
  const { data } = useQuery({
    queryKey: ["analysis-full"],
    queryFn: async () => {
      const res = await fetch("/api/analysis?endpoint=current");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: trustData } = useQuery({
    queryKey: ["trust-score"],
    queryFn: async () => {
      const res = await fetch("/api/analysis?endpoint=trust-score");
      return res.json();
    },
    refetchInterval: 10000,
  });

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Live Analysis</h1>

      <div className="mb-4 card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#6b7a8f]">Technical Trust Score</p>
            <p className="text-4xl font-bold">{trustData?.trustScore ?? "—"}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#6b7a8f]">Direction</p>
            <p className="text-2xl font-bold">{trustData?.direction ?? "WAIT"}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[#ffa502]">
          {trustData?.buyVsSell?.note}
        </p>
      </div>

      {trustData?.breakdown && (
        <div className="mb-4 card p-4">
          <h2 className="mb-3 text-sm font-medium">Trust Score Breakdown</h2>
          <div className="space-y-3">
            {trustData.breakdown.map(
              (item: {
                category: string;
                maxPoints: number;
                earnedPoints: number;
                description: string;
              }) => (
                <div key={item.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.category}</span>
                    <span>
                      {item.earnedPoints}/{item.maxPoints}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1e2836]">
                    <div
                      className="h-1.5 rounded-full bg-[#00d4aa]"
                      style={{
                        width: `${(item.earnedPoints / item.maxPoints) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-[#6b7a8f]">
                    {item.description}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {data?.timeframeAnalysis && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.timeframeAnalysis.map(
            (tf: {
              timeframe: string;
              indicators: Record<string, number | string>;
            }) => (
              <div key={tf.timeframe} className="card p-4">
                <h3 className="mb-3 font-medium">{tf.timeframe} Indicators</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(tf.indicators)
                    .filter(([key]) => typeof tf.indicators[key] === "number")
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-[#6b7a8f]">{key}</span>
                        <span>
                          {typeof value === "number" ? value.toFixed(4) : value}
                        </span>
                      </div>
                    ))}
                  <div className="flex justify-between">
                    <span className="text-[#6b7a8f]">trend</span>
                    <span>{String(tf.indicators.trend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7a8f]">structure</span>
                    <span>{String(tf.indicators.structure)}</span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </AppShell>
  );
}
