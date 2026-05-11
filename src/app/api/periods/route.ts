import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PeriodService } from "@/services/PeriodService";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const todayStr = searchParams.get("today");
  const today = todayStr ? new Date(`${todayStr}T12:00:00Z`) : new Date();

  const result = await PeriodService.getOrCreateWithSummary(session.user.id, year, month, today);
  return NextResponse.json(result);
}
