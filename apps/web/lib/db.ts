import { getDb } from "@boundaryline/db";
import { databaseEnv } from "./env";

export function db() {
  return getDb(databaseEnv().DATABASE_URL);
}
