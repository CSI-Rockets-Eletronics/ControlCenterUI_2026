import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import {
  GPS_STATE_PATH,
  LOAD_CELL_STATE_PATH,
  SCIENTIFIC_STATE_PATH,
  STATION_STATE_PATH,
} from "@/lib/stationInterface";

export interface Paths {
  firingStation: string;
  scientific: string;
  loadCell: string;
  gps: string;
}

export function usePaths(): Paths {
  const [searchParams] = useSearchParams();

  const paths = useMemo(() => {
    const getPrefix = (name: string) =>
      searchParams.get(`${name}-path-prefix`) ?? "";

    return {
      firingStation: getPrefix("firing-station") + STATION_STATE_PATH,
      scientific: getPrefix("scientific") + SCIENTIFIC_STATE_PATH,
      loadCell: getPrefix("load-cell") + LOAD_CELL_STATE_PATH,
      gps: getPrefix("gps") + GPS_STATE_PATH,
    };
  }, [searchParams]);

  return paths;
}

export function usePathList(): string[] {
  const paths = usePaths();
  const pathList = useMemo(() => Object.values(paths), [paths]);
  return pathList;
}
