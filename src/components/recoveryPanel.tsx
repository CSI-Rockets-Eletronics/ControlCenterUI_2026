import { memo } from "react";

import { MapPanel } from "./mapPanel";
import { RangePermit } from "./rangePermit";
import { StatusPanel } from "./statusPanel";
import { WeatherPanel } from "./weatherPanel";

export const RecoveryPanel = memo(function RecoveryPanel() {
  return (
    <div className="grid grid-cols-[1fr,2fr,1fr] gap-4">
      <div className="grid grid-rows-[auto,auto] gap-4">
        <RangePermit />
        <WeatherPanel />
      </div>
      <MapPanel />
      <StatusPanel />
    </div>
  );
});
