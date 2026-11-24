import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { createItem, listItems } from "@/lib/db";
import { badRequest, serverError, unauthorized } from "@/lib/http";
import { parseItem } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  try {
    return NextResponse.json({ items: await listItems() });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Send valid JSON.");
  }
  const parsed = parseItem(body);
  if (!parsed.ok) return badRequest(parsed.error);

  try {
    return NextResponse.json({ item: await createItem(parsed.value) }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
