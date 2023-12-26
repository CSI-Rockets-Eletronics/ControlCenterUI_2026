import { createEdenTreaty } from "data-server-node/api";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { DEFAULT_SERVER } from "@/lib/stationInterface";

export type Api = ReturnType<typeof createEdenTreaty>;

export function useApi(): Api {
  const [searchParams] = useSearchParams();
  const server = searchParams.get("server");

  const api = useMemo(
    () => createEdenTreaty(server ?? DEFAULT_SERVER),
    [server],
  );

  return api;
}

export async function catchError<T>(
  promise: Promise<{ data: T; error: null } | { data: null; error: Error }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}
