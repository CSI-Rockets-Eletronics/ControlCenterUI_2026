import { memo } from "react";

import GoPoll from "./goPoll";
import PreFireLaunchPanel from "./preFireLaunchPanel";
import PreFireStandbyPanel from "./preFireStandbyPanel";

interface Props {
  isLaunch: boolean;
}

export default memo(function PreFirePanel({ isLaunch }: Props) {
  return (
    <div>
      <GoPoll />
      {isLaunch ? <PreFireLaunchPanel /> : <PreFireStandbyPanel />}
    </div>
  );
});
