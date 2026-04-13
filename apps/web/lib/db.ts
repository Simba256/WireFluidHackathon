import { getDb } from "@boundaryline/db";
import { serverEnv } from "./env";

export function db() {
  return getDb(serverEnv().DATABASE_URL);
}
