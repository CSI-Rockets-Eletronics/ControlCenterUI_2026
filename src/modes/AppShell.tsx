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
    <div className="flex flex-col h-full bg-white">
      <ModeNav currentPath={location.pathname} />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/control" element={<ControlMode />} />
          <Route path="/data" element={<DataDisplayMode />} />
          <Route path="/:sessionName/control" element={<ControlMode />} />
          <Route path="/:sessionName/data" element={<DataDisplayMode />} />
          <Route path="*" element={<Navigate to="control" replace />} />
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
