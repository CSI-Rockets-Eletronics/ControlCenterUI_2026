import { useParams } from "react-router-dom";

export function useSession(): string | undefined {
  const { session } = useParams();
  return session;
}
