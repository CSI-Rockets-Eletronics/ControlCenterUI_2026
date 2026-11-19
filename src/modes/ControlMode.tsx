import { memo } from "react";

import { useViewPrefsStore } from "@/stores/viewPrefsStore";

import { ControlButtons } from "./ControlButtons";
import { ElectronicsRegulator } from "./ElectronicsRegulator";
import { FixedPlotsPanel } from "./FixedPlotsPanel";
import { PlotsPanel } from "./PlotsPanel";
import { RelayControlPanel } from "./RelayControlPanel";
import { SolenoidTimers } from "./SolenoidTimers";

export const ControlMode = memo(function ControlMode() {
  const oldView = useViewPrefsStore((s) => s.oldView);

  if (oldView) {
    // Previous layout. Rows are sized by their content (the old 16% / 49%
    // heights never resolved), so the page scrolls when it's taller than
    // the window.
    return (
      <div className="flex flex-col h-full p-4 overflow-y-auto gap-2">
        <div className="flex-shrink-0">
          <RelayControlPanel />
        </div>
        <div className="flex-shrink-0 grid grid-cols-[360px,1fr] gap-2">
          <div className="flex flex-col gap-2">
            <ElectronicsRegulator />
            <SolenoidTimers />
            <ControlButtons />
          </div>
          <div className="min-h-0">
            <FixedPlotsPanel />
          </div>
        </div>
        <div className="flex-shrink-0 h-[60vh]">
          <PlotsPanel />
        </div>
      </div>
    );
  }

  // Telemetry plots live in Data Display now; Live telemetry fills the rest.
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto gap-2">
      <div className="flex-shrink-0">
        <RelayControlPanel />
      </div>
      <div className="flex-1 min-h-[320px]">
        <FixedPlotsPanel />
      </div>
    </div>
  );
});
