import {
  SIGNAL_NOTES,
  type SignalType,
  UNCALIBRATED_SIGNALS,
} from "@/stores/telemetryStore";

/** Small "uncalibrated" tag for readings that can't be trusted yet. Hover for why. */
export function SignalNoteTag({ signal }: { signal: SignalType }) {
  if (!UNCALIBRATED_SIGNALS.has(signal)) return null;
  return (
    <span
      title={SIGNAL_NOTES[signal]}
      className="py-px font-medium border rounded shrink-0 px-1.5 text-[11px] leading-4 cursor-help text-yellow-text bg-yellow-bg border-yellow-border"
    >
      uncalibrated
    </span>
  );
}
