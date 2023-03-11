import { memo } from "react";

import { RangePermit } from "./rangePermit";
import { StatusPanel } from "./statusPanel";

export const RecoveryPanel = memo(function RecoveryPanel() {
  return (
    <div className="grid grid-cols-[1fr,2fr,1fr] gap-4">
      <RangePermit />
      <div />
      <StatusPanel />
    </div>
  );
});
