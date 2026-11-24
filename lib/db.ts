import { neon } from "@neondatabase/serverless";
import type { Item, ItemInput, Status } from "./types";

let client: ReturnType<typeof neon> | null = null;

function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

// Creates the table the first time the app talks to the database.
let ready: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!ready) {
    const q = sql();
    ready = (async () => {
      await q`
        create table if not exists items (
          id uuid primary key default gen_random_uuid(),
          title text not null,
          platform text not null default '',
          kind text not null default 'Course',
          domain text not null default '',
          total integer not null default 0,
          done integer not null default 0,
          due date,
          every_days integer not null default 7,
          next_step text not null default '',
          url text not null default '',
          status text not null default 'queued' check (status in ('queued', 'active', 'paused', 'done')),
          last_touched date,
          created date not null default current_date,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

type Row = {
  id: string;
  title: string;
  platform: string;
  kind: string;
  domain: string;
  total: number;
  done: number;
  due: string | null;
  every_days: number;
  next_step: string;
  url: string;
  status: Status;
  last_touched: string | null;
  created: string;
};

function toItem(r: Row): Item {
  return {
    id: r.id,
    title: r.title,
    platform: r.platform,
    kind: r.kind,
    domain: r.domain,
    total: r.total,
    done: r.done,
    due: r.due ?? "",
    every: r.every_days,
    next: r.next_step,
    url: r.url,
    status: r.status,
    lastTouched: r.last_touched ?? "",
    created: r.created,
  };
}

export async function listItems(): Promise<Item[]> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`
    select id, title, platform, kind, domain, total, done,
           to_char(due, 'YYYY-MM-DD') as due,
           every_days, next_step, url, status,
           to_char(last_touched, 'YYYY-MM-DD') as last_touched,
           to_char(created, 'YYYY-MM-DD') as created
    from items
    order by created_at desc
  `) as unknown as Row[];
  return rows.map(toItem);
}

export async function getItem(id: string): Promise<Item | null> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`
    select id, title, platform, kind, domain, total, done,
           to_char(due, 'YYYY-MM-DD') as due,
           every_days, next_step, url, status,
           to_char(last_touched, 'YYYY-MM-DD') as last_touched,
           to_char(created, 'YYYY-MM-DD') as created
    from items
    where id = ${id}::uuid
  `) as unknown as Row[];
  return rows[0] ? toItem(rows[0]) : null;
}

export async function createItem(i: ItemInput): Promise<Item> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`
    insert into items
      (title, platform, kind, domain, total, done, due, every_days, next_step, url, status, last_touched, created)
    values
      (${i.title}, ${i.platform}, ${i.kind}, ${i.domain}, ${i.total}, ${i.done},
       ${i.due || null}::date, ${i.every}, ${i.next}, ${i.url}, ${i.status},
       ${i.lastTouched || null}::date, coalesce(${i.created || null}::date, current_date))
    returning id
  `) as unknown as { id: string }[];
  const item = await getItem(rows[0].id);
  if (!item) throw new Error("Insert succeeded but the row could not be read back");
  return item;
}

export async function updateItem(id: string, i: ItemInput): Promise<Item | null> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`
    update items set
      title = ${i.title},
      platform = ${i.platform},
      kind = ${i.kind},
      domain = ${i.domain},
      total = ${i.total},
      done = ${i.done},
      due = ${i.due || null}::date,
      every_days = ${i.every},
      next_step = ${i.next},
      url = ${i.url},
      status = ${i.status},
      last_touched = ${i.lastTouched || null}::date,
      updated_at = now()
    where id = ${id}::uuid
    returning id
  `) as unknown as { id: string }[];
  return rows[0] ? getItem(rows[0].id) : null;
}

export async function deleteItem(id: string): Promise<boolean> {
  await ensureSchema();
  const q = sql();
  const rows = (await q`delete from items where id = ${id}::uuid returning id`) as unknown as { id: string }[];
  return rows.length > 0;
}
