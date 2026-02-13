import { memo } from "react";

import { ControlButtons } from "./ControlButtons";
import { ElectronicsRegulator } from "./ElectronicsRegulator";
import { ManualControlPanel } from "./ManualControlPanel";
import { PlotsPanel } from "./PlotsPanel";
import { StatusPanel } from "./StatusPanel";

export const ControlMode = memo(function ControlMode() {
  return (
    <div className="h-full p-4 grid grid-cols-[320px_1fr] grid-rows-[1fr_1fr] gap-4">
      <div className="flex flex-col overflow-y-auto gap-4 row-span-2">
        <ElectronicsRegulator />
        <StatusPanel />
      </div>
      <div className="flex flex-col overflow-y-auto gap-4">
        <ManualControlPanel />
        <ControlButtons />
      </div>
      <div className="overflow-hidden">
        <PlotsPanel />
      </div>
    </div>
  );
});
