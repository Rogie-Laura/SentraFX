import type { Signal } from "@/types";

export type AlertType =
  | "signal_qualified"
  | "signal_expiring"
  | "order_placed"
  | "order_filled"
  | "order_rejected"
  | "stop_loss_hit"
  | "take_profit_hit"
  | "daily_loss_limit"
  | "broker_disconnected"
  | "emergency_stop";

export interface AlertPayload {
  type: AlertType;
  title: string;
  body: string;
  signal?: Signal;
  vibrate?: number[];
}

const alertHistory: AlertPayload[] = [];

export function createSignalAlert(signal: Signal): AlertPayload {
  const payload: AlertPayload = {
    type: "signal_qualified",
    title: "SENTRA FX SIGNAL",
    body: `${signal.symbol} ${signal.direction.replace("_", " ")}\nTrust Score: ${signal.trustScore}%\nTap to review and place order.`,
    signal,
    vibrate: [200, 100, 200],
  };
  alertHistory.unshift(payload);
  return payload;
}

export function getAlertHistory(): AlertPayload[] {
  return [...alertHistory];
}

export async function sendPushNotification(payload: AlertPayload): Promise<boolean> {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(payload.title, { body: payload.body });
      if ("vibrate" in navigator && payload.vibrate) {
        navigator.vibrate(payload.vibrate);
      }
      return true;
    }
  }
  return false;
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.requestPermission();
  }
  return Promise.resolve("denied" as NotificationPermission);
}

export function playAlertSound(): void {
  if (typeof window !== "undefined") {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }
}
