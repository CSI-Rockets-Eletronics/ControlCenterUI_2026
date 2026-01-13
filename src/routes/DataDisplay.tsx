import { memo } from "react";

import { DataDisplayPanel } from "@/components/dataDisplayPanel";
import { LaunchMachineProvider } from "@/components/launchMachineProvider";

export const DataDisplay = memo(function DataDisplay() {
  return (
    <LaunchMachineProvider>
      <div className="h-full p-4 scrollable">
        <DataDisplayPanel />
      </div>
    </LaunchMachineProvider>
  );
});
