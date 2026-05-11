import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { InstallmentService } from "@/services/InstallmentService";

const createSchema = z.object({
  name: z.string().min(1),
  installmentAmount: z.number().positive(),
  totalInstallments: z.number().int().positive(),
  periodId: z.string(),
  startThisMonth: z.boolean().default(true),
  accountId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const plans = await InstallmentService.getActivePlans(session.user.id);
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const plan = await InstallmentService.create(session.user.id, parsed.data);
  if (!plan) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

  return NextResponse.json(plan, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  const deleted = await InstallmentService.delete(id, session.user.id);
  if (!deleted) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
