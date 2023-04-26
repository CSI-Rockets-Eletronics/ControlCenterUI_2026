import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";

import { Api } from "@/lib/api";

const Context = createContext(new Api(""));

export function ApiProvider({ children }: { children: ReactNode }) {
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

  return <Context.Provider value={api}>{children}</Context.Provider>;
}

export const useApi = () => useContext(Context);
