import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const incomeSchema = z.object({
  periodId: z.string(),
  accountId: z.string(),
  amount: z.number().positive(),
  label: z.string().optional(),
  source: z.enum(["USER", "BALANCE_ADJUST_TOTAL", "BALANCE_ADJUST_MONTHLY"]).default("USER"),
  categoryIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = incomeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const period = await prisma.monthlyPeriod.findFirst({
    where: { id: parsed.data.periodId, userId: session.user.id },
  });
  if (!period) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

  const { categoryIds, ...incomeData } = parsed.data;
  const income = await prisma.income.create({
    data: {
      ...incomeData,
      categories: categoryIds?.length
        ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
        : undefined,
    },
  });
  return NextResponse.json(income, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, amount, label, accountId, categoryIds } = body;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const income = await prisma.income.findFirst({
    where: { id, period: { userId: session.user.id } },
  });
  if (!income) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.income.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount: parseInt(String(amount)) }),
      ...(label !== undefined && { label: label || null }),
      ...(accountId !== undefined && { accountId }),
    },
  });

  if (categoryIds !== undefined) {
    await prisma.incomeCategory.deleteMany({ where: { incomeId: id } });
    if (categoryIds.length > 0) {
      await prisma.incomeCategory.createMany({
        data: categoryIds.map((categoryId: string) => ({ incomeId: id, categoryId })),
      });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const income = await prisma.income.findFirst({
    where: { id, period: { userId: session.user.id } },
  });
  if (!income) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
