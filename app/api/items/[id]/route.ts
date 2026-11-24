import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteItem, updateItem } from "@/lib/db";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/http";
import { parseItem } from "@/lib/validate";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAuthed())) return unauthorized();
  if (!UUID.test(params.id)) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Send valid JSON.");
  }
  const parsed = parseItem(body);
  if (!parsed.ok) return badRequest(parsed.error);

  try {
    const item = await updateItem(params.id, parsed.value);
    return item ? NextResponse.json({ item }) : notFound();
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAuthed())) return unauthorized();
  if (!UUID.test(params.id)) return notFound();

  try {
    return (await deleteItem(params.id)) ? NextResponse.json({ ok: true }) : notFound();
  } catch (e) {
    return serverError(e);
  }
}
