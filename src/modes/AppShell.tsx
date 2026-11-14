import { memo, useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import {
  LaunchMachineProvider,
  useLaunchMachineSelector,
} from "@/components/launchMachineProvider";
import { backendConnection } from "@/stores/backendConnection";

import { ControlMode } from "./ControlMode";
import { DataDisplayMode } from "./DataDisplayMode";
import { ModeNav } from "./ModeNav";
import { PidMode } from "./PidMode";

const AppShellInner = memo(function AppShellInner() {
  const location = useLocation();

  const getDeviceStates = useLaunchMachineSelector(
    (state) => () => state.context.deviceStates,
  );

  const getDeviceStatesRef = useRef(getDeviceStates);
  useEffect(() => {
    getDeviceStatesRef.current = getDeviceStates;
  });

  useEffect(() => {
    backendConnection.start(() => getDeviceStatesRef.current());
    return () => backendConnection.stop();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-bg-1">
      <ModeNav currentPath={location.pathname} />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/control" element={<ControlMode />} />
          <Route path="/data" element={<DataDisplayMode />} />
          <Route path="/pid" element={<PidMode />} />
          <Route path="/:sessionName/control" element={<ControlMode />} />
          <Route path="/:sessionName/data" element={<DataDisplayMode />} />
          <Route path="/:sessionName/pid" element={<PidMode />} />
          {/* keep ?server= etc.; dropping it silently switches useApi() to DEFAULT_SERVER */}
          <Route
            path="*"
            element={<Navigate to={`control${location.search}`} replace />}
          />
        </Routes>
      </div>
    </div>
  );
});

export const AppShell = memo(function AppShell() {
  return (
    <LaunchMachineProvider>
      <AppShellInner />
    </LaunchMachineProvider>
  );
});
