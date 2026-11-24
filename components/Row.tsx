"use client";

import { STATUS_LABEL, ago, niceDate, progress, safeUrl, type Reason } from "@/lib/logic";
import type { Item } from "@/lib/types";

type Props = {
  item: Item;
  reasons: Reason[];
  today: string;
  onLog: (item: Item) => void;
  onDone: (item: Item) => void;
  onReopen: (item: Item) => void;
  onEdit: (item: Item) => void;
};

export default function Row({ item, reasons, today, onLog, onDone, onReopen, onEdit }: Props) {
  const pct = progress(item);
  const hasDueReason = reasons.some((r) => /^(Overdue|Due)/.test(r.text));
  const isDone = item.status === "done";

  return (
    <li className="row">
      <div className="main">
        {safeUrl(item.url) ? (
          <a className="t" href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        ) : (
          <span className="t">{item.title}</span>
        )}

        <div className="meta">
          {item.platform && <span className="tag">{item.platform}</span>}
          {item.kind && <span className="tag ghost">{item.kind}</span>}
          {item.domain && <span className="tag ghost">{item.domain}</span>}
        </div>

        <div className="next">
          {item.next ? (
            <>
              <span className="lbl">Next</span>
              {item.next}
            </>
          ) : (
            <span className="muted">No next step set</span>
          )}
        </div>

        <div className="chips">
          {reasons.map((r) => (
            <span key={r.text} className={`chip ${r.tone}`}>
              {r.text}
            </span>
          ))}
          {item.status === "paused" && <span className="chip warn">Paused</span>}
          {isDone && <span className="chip good">Finished</span>}
          {item.due && !isDone && !hasDueReason && <span className="muted">Due {niceDate(item.due)}</span>}
          <span className="muted">{ago(item, today)}</span>
        </div>
      </div>

      <div className="prog">
        <div
          className={"bar" + (isDone ? " done" : "")}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`Progress for ${item.title}`}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="count num">
          {item.total > 0 ? `${Math.min(item.done, item.total)} of ${item.total} lessons` : STATUS_LABEL[item.status]}
        </div>
      </div>

      <div className="acts">
        {!isDone && (
          <button className="btn primary sm" type="button" onClick={() => onLog(item)}>
            {item.total > 0 ? "Log a lesson" : "Log a session"}
          </button>
        )}
        {!isDone ? (
          <button className="btn sm" type="button" onClick={() => onDone(item)}>
            Mark done
          </button>
        ) : (
          <button className="btn sm" type="button" onClick={() => onReopen(item)}>
            Reopen
          </button>
        )}
        <button className="btn sm ghost" type="button" aria-label={`Edit ${item.title}`} onClick={() => onEdit(item)}>
          Edit
        </button>
      </div>
    </li>
  );
}
