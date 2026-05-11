import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { ExpenseService } from "@/services/ExpenseService";
import { EntrySource, ExpenseType } from "@/domain/enums";

const createSchema = z.object({
  periodId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.nativeEnum(ExpenseType).default(ExpenseType.VARIABLE),
  source: z.nativeEnum(EntrySource).default(EntrySource.USER),
  date: z.string().optional(),
  accountId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  type: z.nativeEnum(ExpenseType).optional(),
  accountId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { periodId, description, amount, type, source, date, accountId, categoryIds } = parsed.data;

  try {
    const expense = await ExpenseService.create(session.user.id, {
      periodId,
      description,
      amount,
      type,
      source,
      date: date ? new Date(date) : new Date(),
      accountId: accountId ?? null,
      recurringGroupId: type === ExpenseType.FIXED ? crypto.randomUUID() : null,
      categoryIds,
    });

    if (!expense) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar el gasto" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { id, ...data } = parsed.data;
  const updated = await ExpenseService.update(id, session.user.id, {
    ...data,
    amount: data.amount !== undefined ? parseInt(String(data.amount)) : undefined,
  });

  if (!updated) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const deleted = await ExpenseService.delete(id, session.user.id);
  if (!deleted) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
