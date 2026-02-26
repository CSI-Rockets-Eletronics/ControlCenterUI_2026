import { memo } from "react";

import { ControlButtons } from "./ControlButtons";
import { ElectronicsRegulator } from "./ElectronicsRegulator";
import { FixedPlotsPanel } from "./FixedPlotsPanel";
import { PlotsPanel } from "./PlotsPanel";
import { RelayControlPanel } from "./RelayControlPanel";

export const ControlMode = memo(function ControlMode() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex-shrink-0" style={{ height: "16%" }}>
        <RelayControlPanel />
      </div>

      <div
        className="flex-shrink-0 grid grid-cols-[360px,1fr] gap-4"
        style={{ height: "49%" }}
      >
        <div className="flex flex-col h-full overflow-hidden gap-3">
          <div className="flex-shrink-0">
            <ElectronicsRegulator />
          </div>
          <div className="flex-shrink-0">
            <ControlButtons />
          </div>
        </div>

        <div className="h-full">
          <FixedPlotsPanel />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PlotsPanel />
      </div>
    </div>
  );
});
