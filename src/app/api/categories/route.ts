import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { CategoryService } from "@/services/CategoryService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const categories = await CategoryService.getAll(session.user.id);
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = z.object({ name: z.string().min(1).max(50) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const result = await CategoryService.create(session.user.id, parsed.data.name);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });

  return NextResponse.json(result.category, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const deleted = await CategoryService.delete(id, session.user.id);
  if (!deleted) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
