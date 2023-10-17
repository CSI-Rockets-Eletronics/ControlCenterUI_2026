import { useSearchParams } from "react-router-dom";

export function useReplayFromSeconds(): number | undefined {
  const [searchParams] = useSearchParams();

  const secondsStr = searchParams.get("replay");
  if (secondsStr == null) return undefined;

  const seconds = Number(secondsStr);
  return Number.isNaN(seconds) ? undefined : seconds;
}
