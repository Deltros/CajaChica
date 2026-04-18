import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const expenseSchema = z.object({
  periodId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["FIXED", "VARIABLE", "SAVING", "PENDING"]).default("VARIABLE"),
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

  const { periodId, description, amount, type, date, accountId, categoryIds } = parsed.data;

  try {
    const expense = await prisma.expense.create({
      data: {
        periodId,
        description,
        amount,
        type,
        date: date ? new Date(date) : new Date(),
        accountId: accountId ?? null,
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
  });
  if (!expense) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.expense.delete({ where: { id } });
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

  return NextResponse.json(updated);
}
