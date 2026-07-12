"use client";

interface EmergencyStopButtonProps {
  onStop: (mode: "stop_new" | "stop_and_close") => void;
  disabled?: boolean;
}

export function EmergencyStopButton({ onStop, disabled }: EmergencyStopButtonProps) {
  return (
    <div className="card p-4">
      <button
        onClick={() => {
          if (
            confirm(
              "Activate EMERGENCY STOP?\n\nThis will block all new orders and disable automatic trading."
            )
          ) {
            onStop("stop_new");
          }
        }}
        disabled={disabled}
        className="emergency-btn w-full rounded-lg py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-50"
      >
        Emergency Stop
      </button>
      <button
        onClick={() => {
          if (
            confirm(
              "Stop trading AND close active SENTRA FX position?\n\nThis action cannot be undone."
            )
          ) {
            onStop("stop_and_close");
          }
        }}
        disabled={disabled}
        className="mt-2 w-full rounded-lg border border-[#ff475740] py-2 text-xs text-[#ff4757] hover:bg-[#ff475710] disabled:opacity-50"
      >
        Stop & Close Position
      </button>
    </div>
  );
}
