import { memo } from "react";

import { ControlCenter } from "@/components/controlCenter";
import { LaunchMachineProvider } from "@/components/launchMachineProvider";

export const Station = memo(function Station() {
  return (
    <LaunchMachineProvider>
      <ControlCenter />
    </LaunchMachineProvider>
  );
});
