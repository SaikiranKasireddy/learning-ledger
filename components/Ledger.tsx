"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RANK, analyze, todayStr } from "@/lib/logic";
import type { Item, ItemInput } from "@/lib/types";
import Row from "./Row";
import Sheet from "./Sheet";

const FILTERS = [
  ["all", "All"],
  ["active", "In progress"],
  ["queued", "Queued"],
  ["paused", "Paused"],
  ["done", "Finished"],
] as const;

async function call(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Signed out. Sign in again to continue.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export default function Ledger({ initialItems, loadError }: { initialItems: Item[]; loadError: string }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [today, setToday] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [platform, setPlatform] = useState("all");
  const [domain, setDomain] = useState("all");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [toast, setToast] = useState("");

  // The date depends on the browser's time zone, so it is read after mount.
  useEffect(() => {
    setToday(todayStr());
    const refresh = () => {
      if (document.visibilityState === "visible") setToday(todayStr());
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const closeSheet = useCallback(() => setEditing(null), []);

  const analyzed = useMemo(
    () => (today ? items.map((it) => ({ it, a: analyze(it, today) })) : []),
    [items, today]
  );

  async function update(next: Item, okMessage?: string): Promise<boolean> {
    const prev = items.find((i) => i.id === next.id);
    setItems((list) => list.map((i) => (i.id === next.id ? next : i)));
    try {
      const data = await call(`/api/items/${next.id}`, "PUT", next);
      setItems((list) => list.map((i) => (i.id === next.id ? (data.item as Item) : i)));
      if (okMessage) setToast(okMessage);
      return true;
    } catch (e) {
      if (prev) setItems((list) => list.map((i) => (i.id === prev.id ? prev : i)));
      setToast((e as Error).message);
      return false;
    }
  }

  function logSession(it: Item) {
    const patch: Partial<Item> = { lastTouched: todayStr() };
    if (it.status === "queued" || it.status === "paused") patch.status = "active";
    if (it.total > 0) {
      const done = Math.min(it.total, it.done + 1);
      patch.done = done;
      if (done >= it.total) patch.status = "done";
    }
    const next = { ...it, ...patch };
    void update(next, next.status === "done" ? "Finished. Nice work." : "Logged for today.");
  }

  function markDone(it: Item) {
    void update(
      { ...it, status: "done", done: it.total > 0 ? it.total : it.done, lastTouched: todayStr() },
      "Marked as finished."
    );
  }

  function reopen(it: Item) {
    void update({ ...it, status: "active", lastTouched: todayStr() }, "Back in progress.");
  }

  async function save(value: ItemInput, existing: Item | null): Promise<boolean> {
    if (existing) {
      const ok = await update({ ...existing, ...value }, "Saved.");
      if (ok) setEditing(null);
      return ok;
    }
    try {
      const data = await call("/api/items", "POST", value);
      setItems((list) => [data.item as Item, ...list]);
      setToast("Added to your ledger.");
      setEditing(null);
      return true;
    } catch (e) {
      setToast((e as Error).message);
      return false;
    }
  }

  async function remove(it: Item) {
    try {
      await call(`/api/items/${it.id}`, "DELETE");
      setItems((list) => list.filter((i) => i.id !== it.id));
      setEditing(null);
      setToast("Deleted.");
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  async function signOut() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  const header = (
    <header className="top">
      <div>
        <h1>Learning Ledger</h1>
        <p className="sub">
          Every course, tool and skill you mean to get to, with the next step and a rhythm, so nothing quietly drops
          off.
        </p>
      </div>
      <div className="top-actions">
        <button className="btn ghost" type="button" onClick={signOut}>
          Sign out
        </button>
        <button className="btn primary" type="button" onClick={() => setEditing("new")}>
          Add item
        </button>
      </div>
    </header>
  );

  if (!today) {
    return (
      <div className="wrap">
        {header}
        <p className="none">Loading your ledger…</p>
      </div>
    );
  }

  const attn = analyzed.filter((x) => x.a.reasons.length).sort((x, y) => y.a.sev - x.a.sev);
  const count = (s: string) => items.filter((i) => i.status === s).length;
  const platforms = uniq(items.map((i) => i.platform));
  const domains = uniq(items.map((i) => i.domain));
  const shown = analyzed
    .filter(
      (x) =>
        (status === "all" || x.it.status === status) &&
        (platform === "all" || x.it.platform === platform) &&
        (domain === "all" || x.it.domain === domain)
    )
    .sort(
      (x, y) =>
        RANK[x.it.status] - RANK[y.it.status] || y.a.sev - x.a.sev || x.it.title.localeCompare(y.it.title)
    );

  const rowProps = { today, onLog: logSession, onDone: markDone, onReopen: reopen, onEdit: setEditing };

  return (
    <div className="wrap">
      {header}

      {loadError && <p className="note">{loadError}</p>}

      {items.length === 0 ? (
        <section className="empty">
          <h2>Your ledger is empty</h2>
          <p>
            Add each course, tool or skill you keep meaning to get to, from any platform. Give it a next step and a
            check-in rhythm. Whatever you drift away from shows up here under &quot;Needs you&quot;.
          </p>
          <div className="btns">
            <button className="btn primary" type="button" onClick={() => setEditing("new")}>
              Add your first item
            </button>
          </div>
        </section>
      ) : (
        <main>
          <div className="stats">
            <div className="stat">
              <b>{count("active")}</b>
              <span>In progress</span>
            </div>
            <div className="stat">
              <b>{attn.length}</b>
              <span>Need you</span>
            </div>
            <div className="stat">
              <b>{count("queued")}</b>
              <span>Queued</span>
            </div>
            <div className="stat">
              <b>{count("done")}</b>
              <span>Finished</span>
            </div>
          </div>

          <section className="sec" aria-labelledby="attn-h">
            <div className="sec-h">
              <div className="ttl">
                <span className={"big num" + (attn.length === 0 ? " zero" : "")}>{attn.length}</span>
                <h2 id="attn-h">Needs you</h2>
              </div>
            </div>
            <p className="hint">
              Overdue, due this week, untouched past their rhythm, or waiting in the queue for two weeks.
            </p>
            {attn.length > 0 ? (
              <ul className="list">
                {attn.map((x) => (
                  <Row key={x.it.id} item={x.it} reasons={x.a.reasons} {...rowProps} />
                ))}
              </ul>
            ) : (
              <p className="none">Nothing is slipping. Log a session on anything you touch to keep it that way.</p>
            )}
          </section>

          <section className="sec" aria-labelledby="all-h">
            <div className="sec-h">
              <h2 id="all-h">Everything</h2>
            </div>
            <div className="filters">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="pill"
                  aria-pressed={status === key}
                  onClick={() => setStatus(key)}
                >
                  {label} {key === "all" ? items.length : count(key)}
                </button>
              ))}
              {platforms.length > 0 && (
                <select aria-label="Filter by platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  <option value="all">All platforms</option>
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
              {domains.length > 0 && (
                <select aria-label="Filter by domain" value={domain} onChange={(e) => setDomain(e.target.value)}>
                  <option value="all">All domains</option>
                  {domains.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {shown.length > 0 ? (
              <ul className="list">
                {shown.map((x) => (
                  <Row key={x.it.id} item={x.it} reasons={x.a.reasons} {...rowProps} />
                ))}
              </ul>
            ) : (
              <p className="none">Nothing matches this filter.</p>
            )}
          </section>
        </main>
      )}

      {editing && (
        <Sheet
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          onSave={save}
          onDelete={remove}
          onClose={closeSheet}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
