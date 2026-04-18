import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const expenseSchema = z.object({
  periodId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["FIXED", "VARIABLE", "SAVING"]).default("VARIABLE"),
  date: z.string().optional(),
  accountId: z.string().optional(),
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

  const { periodId, description, amount, type, date, accountId } = parsed.data;

  try {
    const expense = await prisma.expense.create({
      data: {
        periodId,
        description,
        amount,
        type,
        date: date ? new Date(date) : new Date(),
        accountId: accountId ?? null,
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
