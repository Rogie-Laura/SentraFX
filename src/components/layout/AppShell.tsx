"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "◉" },
  { href: "/analysis", label: "Analysis", icon: "◈" },
  { href: "/journal", label: "Journal", icon: "◫" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-[#1e2836] bg-[#0d1117] lg:fixed lg:h-screen lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-4 py-4 lg:px-5 lg:py-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d4aa20] text-sm font-bold text-[#00d4aa]">
            SF
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">SENTRA FX</p>
            <p className="text-[10px] text-[#6b7a8f]">Neural Risk Analyzer</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3 lg:pb-0">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[#00d4aa15] text-[#00d4aa]"
                    : "text-[#6b7a8f] hover:bg-[#1e2836] hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 lg:ml-56">
        <div className="mx-auto max-w-7xl p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
