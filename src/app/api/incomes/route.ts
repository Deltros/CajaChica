import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { IncomeService } from "@/services/IncomeService";
import { EntrySource } from "@/domain/enums";

const createSchema = z.object({
  periodId: z.string(),
  accountId: z.string(),
  amount: z.number().positive(),
  label: z.string().optional(),
  source: z.nativeEnum(EntrySource).default(EntrySource.USER),
  categoryIds: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  amount: z.number().positive().optional(),
  label: z.string().nullable().optional(),
  accountId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const income = await IncomeService.create(session.user.id, parsed.data);
    if (!income) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    return NextResponse.json(income, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar el ingreso" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { id, amount, ...rest } = parsed.data;
  const updated = await IncomeService.update(id, session.user.id, {
    ...rest,
    amount: amount !== undefined ? parseInt(String(amount)) : undefined,
  });

  if (!updated) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const deleted = await IncomeService.delete(id, session.user.id);
  if (!deleted) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
