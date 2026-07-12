import { NextResponse } from "next/server";
import {
  getTradingSettings,
  updateTradingSettings,
  isEmergencyStopActive,
  setEmergencyStop,
} from "@/lib/settings-store";
import { getJournalEntries, getJournalStats } from "@/modules/trade-journal";
import { logAuditEvent } from "@/modules/audit";

export async function GET() {
  const settings = getTradingSettings();
  return NextResponse.json({
    trading: settings,
    emergencyStop: isEmergencyStopActive(),
    journal: {
      entries: getJournalEntries(),
      stats: getJournalStats(),
    },
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const section = body.section as string;

  if (section === "trading") {
    const updated = updateTradingSettings(body.data);
    logAuditEvent({
      eventType: "settings_changed",
      eventDescription: "Trading settings updated",
      metadata: body.data,
    });
    return NextResponse.json(updated);
  }

  if (section === "risk") {
    const updated = updateTradingSettings(body.data);
    if (body.data.autoModeEnabled) {
      setEmergencyStop(false);
    }
    return NextResponse.json(updated);
  }

  if (section === "notifications") {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid section" }, { status: 400 });
}
