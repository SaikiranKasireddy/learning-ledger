"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { safeUrl, todayStr } from "@/lib/logic";
import type { Item, ItemInput, Status } from "@/lib/types";

type Props = {
  item: Item | null; // null means a new item
  onSave: (value: ItemInput, existing: Item | null) => Promise<boolean>;
  onDelete: (item: Item) => Promise<void>;
  onClose: () => void;
};

const PLATFORMS = [
  "Coursera",
  "Udemy",
  "YouTube",
  "LinkedIn Learning",
  "Pluralsight",
  "freeCodeCamp",
  "edX",
  "Official docs",
  "Book",
];

export default function Sheet({ item, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [platform, setPlatform] = useState(item?.platform ?? "");
  const [kind, setKind] = useState(item?.kind ?? "Course");
  const [domain, setDomain] = useState(item?.domain ?? "");
  const [total, setTotal] = useState(item && item.total ? String(item.total) : "");
  const [done, setDone] = useState(item && item.done ? String(item.done) : "");
  const [due, setDue] = useState(item?.due ?? "");
  const [every, setEvery] = useState(String(item?.every ?? 7));
  const [next, setNext] = useState(item?.next ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [status, setStatus] = useState<Status>(item?.status ?? "queued");
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    if (!cleanTitle) {
      setError("Give it a name so you can find it later.");
      return;
    }
    if (cleanUrl && !safeUrl(cleanUrl)) {
      setError("The link needs to start with http:// or https://.");
      return;
    }
    const totalN = Math.max(0, parseInt(total, 10) || 0);
    let doneN = Math.max(0, parseInt(done, 10) || 0);
    if (totalN > 0) doneN = Math.min(doneN, totalN);
    if (status === "done" && totalN > 0) doneN = totalN;

    const today = todayStr();
    setBusy(true);
    setError("");
    const ok = await onSave(
      {
        title: cleanTitle,
        platform: platform.trim(),
        kind,
        domain: domain.trim(),
        total: totalN,
        done: doneN,
        due,
        every: parseInt(every, 10) || 7,
        next: next.trim(),
        url: cleanUrl,
        status,
        created: item?.created ?? today,
        lastTouched: item?.lastTouched ?? (status === "active" ? today : ""),
      },
      item
    );
    setBusy(false);
    if (!ok) setError("Could not save. Try again in a moment.");
  }

  async function remove() {
    if (!item) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    await onDelete(item);
    setBusy(false);
  }

  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onSubmit={submit} noValidate>
        <div className="sheet-h">
          <h2 id="sheet-title">{item ? "Edit item" : "Add to your ledger"}</h2>
          <button className="btn sm ghost" type="button" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>

        <label className="field">
          What are you learning
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Kubernetes for Beginners"
            autoComplete="off"
          />
        </label>

        <div className="two">
          <label className="field">
            Platform
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              list="platform-options"
              maxLength={60}
              placeholder="e.g. Udemy"
              autoComplete="off"
            />
            <datalist id="platform-options">
              {PLATFORMS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="field">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option>Course</option>
              <option>Tool</option>
              <option>Skill</option>
              <option>Certification</option>
            </select>
          </label>
        </div>

        <label className="field">
          Domain or goal
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            maxLength={60}
            placeholder="e.g. DevOps"
            autoComplete="off"
          />
        </label>

        <div className="two">
          <label className="field">
            Total lessons
            <input
              type="number"
              min={0}
              max={9999}
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="field">
            Done so far
            <input
              type="number"
              min={0}
              max={9999}
              inputMode="numeric"
              value={done}
              onChange={(e) => setDone(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>

        <div className="two">
          <label className="field">
            Due date
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="field">
            Check in
            <select value={every} onChange={(e) => setEvery(e.target.value)}>
              <option value="1">Every day</option>
              <option value="3">Every 3 days</option>
              <option value="7">Every week</option>
              <option value="14">Every 2 weeks</option>
            </select>
          </label>
        </div>

        <label className="field">
          Next step
          <input
            value={next}
            onChange={(e) => setNext(e.target.value)}
            maxLength={200}
            placeholder="e.g. Finish module 3 labs"
            autoComplete="off"
          />
        </label>

        <div className="two">
          <label className="field">
            Link
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={500}
              placeholder="https://"
              autoComplete="off"
            />
          </label>
          <label className="field">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="queued">Queued</option>
              <option value="active">In progress</option>
              <option value="paused">Paused</option>
              <option value="done">Finished</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}

        <div className="form-acts">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <span className="spacer" />
          {item && (
            <button className="btn danger" type="button" onClick={remove} disabled={busy}>
              {armed ? "Tap again to delete" : "Delete"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
