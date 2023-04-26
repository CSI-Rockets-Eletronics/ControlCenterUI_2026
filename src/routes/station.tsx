import { memo } from "react";

import { ApiProvider } from "@/components/apiProvider";
import { ControlCenter } from "@/components/controlCenter";
import { LaunchMachineProvider } from "@/components/launchMachineProvider";

export const Station = memo(function Station() {
  return (
    <ApiProvider>
      <LaunchMachineProvider>
        <ControlCenter />
      </LaunchMachineProvider>
    </ApiProvider>
  );
});
