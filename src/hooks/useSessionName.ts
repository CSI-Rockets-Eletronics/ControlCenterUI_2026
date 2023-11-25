import { useParams } from "react-router-dom";

export function useSessionName(): string | undefined {
  const { sessionName } = useParams();
  return sessionName;
}
