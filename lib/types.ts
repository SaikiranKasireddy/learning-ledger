export type Status = "queued" | "active" | "paused" | "done";

export type Item = {
  id: string;
  title: string;
  platform: string;
  kind: string;
  domain: string;
  total: number;
  done: number;
  /** YYYY-MM-DD or "" */
  due: string;
  /** check-in rhythm in days */
  every: number;
  next: string;
  url: string;
  status: Status;
  /** YYYY-MM-DD or "" */
  lastTouched: string;
  /** YYYY-MM-DD */
  created: string;
};

export type ItemInput = Omit<Item, "id">;
