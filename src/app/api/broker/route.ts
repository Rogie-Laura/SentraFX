import { NextResponse } from "next/server";
import { createBrokerAdapter } from "@/modules/broker";
import {
  getTradingSettings,
  updateTradingSettings,
  isEmergencyStopActive,
} from "@/lib/settings-store";

const adapter = createBrokerAdapter("mock", "demo");
let connected = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "connection";

  if (type === "connection") {
    const accounts = connected ? await adapter.getAccounts() : [];
    const selected = accounts.find((a) => a.isSelected);
    return NextResponse.json({
      broker: "IC Markets",
      platform: "cTrader",
      environment: "demo",
      status: connected ? "connected" : "disconnected",
      account: selected ?? null,
      lastSync: connected ? new Date().toISOString() : null,
    });
  }

  if (type === "accounts") {
    if (!connected) {
      return NextResponse.json({ accounts: [] });
    }
    const accounts = await adapter.getAccounts();
    return NextResponse.json({ accounts });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function POST(request: Request) {
  const body = await request.json();
  const action = body.action as string;

  if (action === "connect") {
    await adapter.connect();
    connected = true;
    return NextResponse.json({
      success: true,
      message: "Connect IC Markets cTrader Account via OAuth (demo mock connected)",
    });
  }

  if (action === "disconnect") {
    await adapter.disconnect();
    connected = false;
    return NextResponse.json({ success: true });
  }

  if (action === "test") {
    if (!connected) {
      return NextResponse.json({ success: false, error: "Not connected" });
    }
    const accounts = await adapter.getAccounts();
    const quote = await adapter.getQuote("EURUSD");
    return NextResponse.json({
      success: true,
      accounts: accounts.length,
      quote,
    });
  }

  if (action === "sync") {
    const accounts = connected ? await adapter.getAccounts() : [];
    return NextResponse.json({ success: true, accounts });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
