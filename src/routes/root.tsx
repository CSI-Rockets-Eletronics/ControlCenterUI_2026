import { memo, useMemo } from "react";
import { useParams } from "react-router-dom";

import { ControlCenter } from "@/components/controlCenter";
import { LaunchMachineProvider } from "@/components/launchMachineProvider";
import { useDummyStation } from "@/hooks/useDummyStation";
import { Api } from "@/lib/api";

export const Root = memo(function Root() {
  const { stationId, sessionId } = useParams<{
    stationId: string;
    sessionId?: string;
  }>();

  if (!stationId) {
    throw new Error("Station ID is required");
  }

  const api = useMemo(
    () => new Api(stationId, sessionId),
    [stationId, sessionId]
  );

  useDummyStation(api);

  return (
    <LaunchMachineProvider api={api}>
      <ControlCenter />
    </LaunchMachineProvider>
  );
});
