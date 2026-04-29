import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const expenseSchema = z.object({
  periodId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["FIXED", "VARIABLE", "SAVING", "PENDING"]).default("VARIABLE"),
  source: z.enum(["USER", "BALANCE_ADJUST_TOTAL", "BALANCE_ADJUST_MONTHLY"]).default("USER"),
  date: z.string().optional(),
  accountId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: parsed.data.periodId, userId: session.user.id },
  });
  if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

  const { periodId, description, amount, type, source, date, accountId, categoryIds } = parsed.data;

  try {
    const expense = await prisma.expense.create({
      data: {
        periodId,
        description,
        amount,
        type,
        source,
        date: date ? new Date(date) : new Date(),
        accountId: accountId ?? null,
        recurringGroupId: type === "FIXED" ? crypto.randomUUID() : null,
        categories: categoryIds?.length
          ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al guardar el gasto" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const expense = await prisma.expense.findFirst({
    where: { id, period: { userId: session.user.id } },
    include: { period: true },
  });
  if (!expense) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (expense.recurringGroupId) {
    const { year, month } = expense.period;
    const currentOffset = year * 12 + (month - 1);

    const allInstances = await prisma.expense.findMany({
      where: { recurringGroupId: expense.recurringGroupId, period: { userId: session.user.id } },
      include: { period: true },
    });

    const idsToDelete = allInstances
      .filter((e) => e.period.year * 12 + (e.period.month - 1) >= currentOffset)
      .map((e) => e.id);

    await prisma.expense.deleteMany({ where: { id: { in: idsToDelete } } });

    // Mark the last surviving instance as the end of the series so propagation stops here
    const survivors = allInstances
      .filter((e) => e.period.year * 12 + (e.period.month - 1) < currentOffset)
      .sort((a, b) => (b.period.year * 12 + b.period.month) - (a.period.year * 12 + a.period.month));

    if (survivors.length > 0) {
      const lastSurvivor = survivors[0];
      await prisma.expense.update({
        where: { id: lastSurvivor.id },
        data: { recurringEndYear: lastSurvivor.period.year, recurringEndMonth: lastSurvivor.period.month },
      });
    }
  } else {
    await prisma.expense.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, amount, description, type, accountId, categoryIds } = body;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const expense = await prisma.expense.findFirst({
    where: { id, period: { userId: session.user.id } },
    include: { period: true },
  });
  if (!expense) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount: parseInt(String(amount)) }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(accountId !== undefined && { accountId: accountId || null }),
    },
  });

  if (categoryIds !== undefined) {
    await prisma.expenseCategory.deleteMany({ where: { expenseId: id } });
    if (categoryIds.length > 0) {
      await prisma.expenseCategory.createMany({
        data: categoryIds.map((categoryId: string) => ({ expenseId: id, categoryId })),
      });
    }
  }

  // Propagate edits to future instances of the same recurring fixed expense
  if (expense.recurringGroupId) {
    const { year, month } = expense.period;
    const currentOffset = year * 12 + (month - 1);

    const futureInstances = await prisma.expense.findMany({
      where: {
        recurringGroupId: expense.recurringGroupId,
        id: { not: id },
        period: { userId: session.user.id },
      },
      include: { period: true },
    });

    const futureIds = futureInstances
      .filter((e) => e.period.year * 12 + (e.period.month - 1) > currentOffset)
      .map((e) => e.id);

    if (futureIds.length > 0) {
      await prisma.expense.updateMany({
        where: { id: { in: futureIds } },
        data: {
          ...(amount !== undefined && { amount: parseInt(String(amount)) }),
          ...(description !== undefined && { description }),
          ...(accountId !== undefined && { accountId: accountId || null }),
        },
      });
    }
  }

  return NextResponse.json(updated);
}
