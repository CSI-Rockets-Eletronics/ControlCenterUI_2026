import { useParams } from "react-router-dom";

export function useEnvironmentKey(): string {
  const { environmentKey } = useParams();

  if (environmentKey == null) {
    throw new Error("environmentKey param is required");
  }

  return environmentKey;
}
