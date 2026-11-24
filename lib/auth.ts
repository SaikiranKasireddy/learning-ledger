import { cookies } from "next/headers";
import { COOKIE, verifyToken } from "./session";

/** Server-side check used by pages and route handlers (middleware checks too). */
export async function isAuthed(): Promise<boolean> {
  return verifyToken(cookies().get(COOKIE)?.value, process.env.SESSION_SECRET);
}
