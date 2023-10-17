import { createEdenTreaty } from "data-server-node/api";

// const ORIGIN = "https://csiwiki.me.columbia.edu/rocketsdata";
// const ORIGIN = "http://localhost:3000";
const ORIGIN = "http://csiwiki.me.columbia.edu:3001";

export const api = createEdenTreaty(ORIGIN);

export async function catchError<T>(
  promise: Promise<{ data: T; error: null } | { data: null; error: Error }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}
