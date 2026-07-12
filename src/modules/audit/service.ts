export type AuditEventType =
  | "login"
  | "logout"
  | "order_placed"
  | "order_rejected"
  | "position_closed"
  | "emergency_stop"
  | "auto_mode_enabled"
  | "auto_mode_disabled"
  | "broker_connected"
  | "broker_disconnected"
  | "settings_changed";

export interface AuditLogEntry {
  id: string;
  userId?: string;
  eventType: AuditEventType;
  eventDescription: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  deviceId?: string;
  createdAt: Date;
}

const auditLogs: AuditLogEntry[] = [];

export function logAuditEvent(
  event: Omit<AuditLogEntry, "id" | "createdAt">
): AuditLogEntry {
  const entry: AuditLogEntry = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  auditLogs.unshift(entry);
  return entry;
}

export function getAuditLogs(userId?: string): AuditLogEntry[] {
  if (userId) return auditLogs.filter((l) => l.userId === userId);
  return [...auditLogs];
}
