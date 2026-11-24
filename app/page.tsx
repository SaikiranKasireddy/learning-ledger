import { redirect } from "next/navigation";
import Ledger from "@/components/Ledger";
import { isAuthed } from "@/lib/auth";
import { listItems } from "@/lib/db";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAuthed())) redirect("/login");

  let items: Item[] = [];
  let loadError = "";
  try {
    items = await listItems();
  } catch (e) {
    console.error(e);
    loadError = "Could not reach the database. Check DATABASE_URL in your environment settings.";
  }

  return <Ledger initialItems={items} loadError={loadError} />;
}
