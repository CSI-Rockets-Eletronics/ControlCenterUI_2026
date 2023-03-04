import { memo } from "react";
import { useParams } from "react-router-dom";

import { ControlCenter } from "@/components/controlCenter";
import { LaunchMachineProvider } from "@/components/launchMachineProvider";

export const Root = memo(function Root() {
  const { stationId, sessionId } = useParams<{
    stationId: string;
    sessionId?: string;
  }>();

  if (!stationId) {
    throw new Error("Station ID is required");
  }

  return (
    <LaunchMachineProvider stationId={stationId} sessionId={sessionId}>
      <ControlCenter />
    </LaunchMachineProvider>
  );
});
