"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";

export default function JournalPage() {
  const { data } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      return res.json();
    },
  });

  const stats = data?.journal?.stats;
  const entries = data?.journal?.entries ?? [];

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Trade Journal</h1>

      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Trades" value={stats.totalTrades} />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
          <StatCard
            label="Net P/L"
            value={`$${stats.netProfit.toFixed(2)}`}
          />
          <StatCard
            label="Profit Factor"
            value={
              stats.profitFactor === Infinity
                ? "∞"
                : stats.profitFactor.toFixed(2)
            }
          />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2836] text-left text-[#6b7a8f]">
              <th className="p-3">Date</th>
              <th className="p-3">Pair</th>
              <th className="p-3">Dir</th>
              <th className="p-3">Score</th>
              <th className="p-3">Entry</th>
              <th className="p-3">Result</th>
              <th className="p-3">P/L</th>
              <th className="p-3">R</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#6b7a8f]">
                  No trades yet. Place a paper order from the dashboard.
                </td>
              </tr>
            ) : (
              entries.map(
                (entry: {
                  id: string;
                  date: string;
                  symbol: string;
                  direction: string;
                  trustScore: number;
                  entry: number;
                  result: string;
                  profitLoss: number;
                  rMultiple: number;
                }) => (
                  <tr
                    key={entry.id}
                    className="border-b border-[#1e2836] hover:bg-[#1e283620]"
                  >
                    <td className="p-3">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="p-3">{entry.symbol}</td>
                    <td className="p-3">{entry.direction}</td>
                    <td className="p-3">{entry.trustScore}%</td>
                    <td className="p-3">{entry.entry.toFixed(5)}</td>
                    <td
                      className={`p-3 ${
                        entry.result === "win"
                          ? "text-[#00d4aa]"
                          : entry.result === "loss"
                            ? "text-[#ff4757]"
                            : ""
                      }`}
                    >
                      {entry.result}
                    </td>
                    <td className="p-3">${entry.profitLoss.toFixed(2)}</td>
                    <td className="p-3">{entry.rMultiple.toFixed(2)}R</td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3">
      <p className="text-[10px] text-[#6b7a8f]">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
