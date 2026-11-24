import type { ItemInput, Status } from "./types";

const STATUSES: readonly string[] = ["queued", "active", "paused", "done"];
const KINDS: readonly string[] = ["Course", "Tool", "Skill", "Certification"];
const RHYTHMS: readonly number[] = [1, 3, 7, 14];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function int(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function date(v: unknown): string {
  const s = str(v, 10);
  if (!DATE.test(s)) return "";
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? "" : s;
}

export type ParseResult = { ok: true; value: ItemInput } | { ok: false; error: string };

export function parseItem(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON object." };
  const b = body as Record<string, unknown>;

  const title = str(b.title, 120);
  if (!title) return { ok: false, error: "Give it a name so you can find it later." };

  const url = str(b.url, 500);
  if (url && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "The link needs to start with http:// or https://." };
  }

  const status = (typeof b.status === "string" && STATUSES.includes(b.status) ? b.status : "queued") as Status;
  const kind = typeof b.kind === "string" && KINDS.includes(b.kind) ? b.kind : "Course";

  const total = int(b.total, 0, 9999, 0);
  let done = int(b.done, 0, 9999, 0);
  if (total > 0) done = Math.min(done, total);
  if (status === "done" && total > 0) done = total;

  const rhythm = int(b.every, 1, 365, 7);

  return {
    ok: true,
    value: {
      title,
      platform: str(b.platform, 60),
      kind,
      domain: str(b.domain, 60),
      total,
      done,
      due: date(b.due),
      every: RHYTHMS.includes(rhythm) ? rhythm : 7,
      next: str(b.next, 200),
      url,
      status,
      lastTouched: date(b.lastTouched),
      created: date(b.created),
    },
  };
}
