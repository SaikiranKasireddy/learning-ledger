import type { Item } from "./types";

export const STATUS_LABEL: Record<Item["status"], string> = {
  active: "In progress",
  queued: "Queued",
  paused: "Paused",
  done: "Finished",
};

export const RANK: Record<Item["status"], number> = { active: 0, queued: 1, paused: 2, done: 3 };

const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today in the browser's own time zone. Call only in the browser. */
export function todayStr(): string {
  return ymd(new Date());
}

function dayNum(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function diff(a: string, b: string): number {
  return dayNum(a) - dayNum(b);
}

export function niceDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export type Reason = { sev: number; tone: "bad" | "warn"; text: string };

/** Why an item needs attention today, most urgent first. Empty means it is fine. */
export function analyze(it: Item, today: string): { reasons: Reason[]; sev: number } {
  const reasons: Reason[] = [];
  if (it.status === "done" || it.status === "paused") return { reasons, sev: 0 };

  if (it.due) {
    const d = diff(it.due, today);
    if (d < 0) reasons.push({ sev: 100 + -d, tone: "bad", text: `Overdue by ${plural(-d, "day")}` });
    else if (d <= 7) reasons.push({ sev: 60 - d, tone: "warn", text: d === 0 ? "Due today" : `Due in ${plural(d, "day")}` });
  }

  if (it.status === "active") {
    const idle = diff(today, it.lastTouched || it.created || today);
    if (idle > (it.every || 7)) {
      reasons.push({ sev: 40 + Math.min(idle, 30), tone: "warn", text: `Untouched for ${plural(idle, "day")}` });
    }
  }

  if (it.status === "queued") {
    const wait = diff(today, it.created || today);
    if (wait >= 14) {
      reasons.push({ sev: 30 + Math.min(wait, 30), tone: "warn", text: `In the queue for ${plural(wait, "day")}` });
    }
  }

  reasons.sort((a, b) => b.sev - a.sev);
  return { reasons, sev: reasons[0]?.sev ?? 0 };
}

export function progress(it: Item): number {
  if (it.status === "done") return 100;
  if (it.total > 0) return Math.round((100 * Math.min(it.done, it.total)) / it.total);
  return 0;
}

export function ago(it: Item, today: string): string {
  if (!it.lastTouched) return it.status === "queued" ? "Not started" : "No sessions logged";
  const d = diff(today, it.lastTouched);
  if (d <= 0) return "Last worked today";
  if (d === 1) return "Last worked yesterday";
  return `Last worked ${d} days ago`;
}

export function safeUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}
