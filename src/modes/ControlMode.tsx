import { memo } from "react";

import { ControlButtons } from "./ControlButtons";
import { ElectronicsRegulator } from "./ElectronicsRegulator";
import { PlotsPanel } from "./PlotsPanel";
import { StatusPanel } from "./StatusPanel";

export const ControlMode = memo(function ControlMode() {
  return (
    <div className="h-full p-4 grid grid-cols-[320px_1fr] grid-rows-[1fr_1fr] gap-4">
      <div className="overflow-hidden row-span-2">
        <StatusPanel />
      </div>

      <div className="overflow-hidden">
        <ControlButtons />
      </div>

      <div className="overflow-hidden">
        <PlotsPanel />
      </div>

      <div className="overflow-hidden">
        <ElectronicsRegulator />
      </div>
    </div>
  );
});
