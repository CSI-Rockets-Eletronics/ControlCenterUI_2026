import { useSearchParams } from "react-router-dom";

export function useReplayFromSeconds(): number | null {
  const [searchParams] = useSearchParams();

  const secondsStr = searchParams.get("replay");
  if (secondsStr == null) return null;

  const seconds = Number(secondsStr);
  return Number.isNaN(seconds) ? null : seconds;
}
