import type { AccountRef, IncomeEntry, ExpenseEntry, InstallmentEntry, PlanEntry } from "@/domain/types";

// ── Accounts ──────────────────────────────────────────────────────────────────

export const DEBITO_ID  = "cmo3r0uaz0004clmm5a2wrku7";
export const CONSORCIO_ID = "cmo3ul8m4000rclmm9x31umys";
export const CREDITO_ID = "cmo3wj5xw0001hihz6kuncbsb";

export const accounts: AccountRef[] = [
  { id: DEBITO_ID,   isCreditCard: false },
  { id: CONSORCIO_ID, isCreditCard: false },
  { id: CREDITO_ID,  isCreditCard: true  },
];

// ── Incomes ───────────────────────────────────────────────────────────────────

export const incomes: IncomeEntry[] = [
  { accountId: DEBITO_ID,   amount: 2_984_744, source: "USER", date: "2026-05-11T01:27:34.223Z" },
  { accountId: CONSORCIO_ID, amount: 256_000,  source: "USER", date: "2026-05-11T01:27:59.284Z" },
  { accountId: DEBITO_ID,   amount: 108_509,   source: "USER", date: "2026-05-11T01:28:20.688Z" },
];

// ── Expenses ──────────────────────────────────────────────────────────────────

export const expenses: ExpenseEntry[] = [
  // Gastos fijos
  { accountId: CREDITO_ID, amount: 256_000, type: "FIXED",    source: "USER",                  date: "2026-05-11T01:29:45.743Z" }, // CAE
  { accountId: DEBITO_ID,  amount:  15_000, type: "FIXED",    source: "USER",                  date: "2026-05-11T01:30:04.692Z" }, // Portón reja
  { accountId: DEBITO_ID,  amount: 875_000, type: "FIXED",    source: "USER",                  date: "2026-05-11T01:30:36.479Z" }, // Arriendo
  { accountId: DEBITO_ID,  amount: 100_000, type: "FIXED",    source: "USER",                  date: "2026-05-11T01:30:52.959Z" }, // Líder
  { accountId: DEBITO_ID,  amount: 323_000, type: "FIXED",    source: "USER",                  date: "2026-05-11T01:31:25.251Z" }, // Pago deuda santander

  // Ahorros
  { accountId: DEBITO_ID,  amount: 400_000, type: "SAVING",   source: "USER",                  date: "2026-05-11T01:31:55.349Z" }, // Racional
  { accountId: DEBITO_ID,  amount: 200_000, type: "SAVING",   source: "USER",                  date: "2026-05-11T01:32:05.646Z" }, // Viaje
  { accountId: DEBITO_ID,  amount: 200_000, type: "SAVING",   source: "USER",                  date: "2026-05-11T01:32:24.154Z" }, // Emergencia

  // Variables
  { accountId: DEBITO_ID,  amount:  81_927, type: "VARIABLE", source: "USER",                 date: "2026-05-11T01:32:49.972Z" }, // Ajuste de saldo
  { accountId: CREDITO_ID, amount: 464_162, type: "VARIABLE", source: "BALANCE_ADJUST_TOTAL", date: "2026-05-11T01:33:26.845Z" }, // Ajuste de saldo total
  { accountId: DEBITO_ID,  amount: 152_000, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:35:24.240Z" }, // Clases Tenis
  { accountId: DEBITO_ID,  amount:  10_000, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:35:52.931Z" }, // Ajuste de saldo
  { accountId: CREDITO_ID, amount:  79_687, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:36:12.448Z" }, // Salida familiatencia
  { accountId: DEBITO_ID,  amount:  14_530, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:36:29.372Z" }, // Piazza pizza
  { accountId: CREDITO_ID, amount:  13_700, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:36:45.471Z" }, // Subway
  { accountId: CREDITO_ID, amount:  66_864, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:37:07.413Z" }, // Compra jeans
  { accountId: DEBITO_ID,  amount:  20_000, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:37:20.126Z" }, // Remedios inti
  { accountId: DEBITO_ID,  amount:   7_000, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:37:33.254Z" }, // Catriel paco
  { accountId: DEBITO_ID,  amount:  50_000, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:37:51.110Z" }, // Regalo mamá
  { accountId: DEBITO_ID,  amount:  20_000, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:38:07.877Z" }, // Regalo baby shower
  { accountId: CREDITO_ID, amount:   5_807, type: "VARIABLE", source: "USER",                  date: "2026-05-11T01:38:20.212Z" }, // Uber
  { accountId: DEBITO_ID,  amount:  11_000, type: "VARIABLE", source: "BALANCE_ADJUST_MONTHLY", date: "2026-05-11T02:16:10.458Z" }, // Completos

  // Pendientes
  { accountId: CREDITO_ID, amount:  15_950, type: "PENDING",  source: "USER",                  date: "2026-05-11T01:38:32.928Z" }, // NBA TV
  { accountId: CREDITO_ID, amount:  23_900, type: "PENDING",  source: "USER",                  date: "2026-05-11T01:38:47.629Z" }, // Clade
  { accountId: DEBITO_ID,  amount: 150_000, type: "PENDING",  source: "USER",                  date: "2026-05-11T01:39:02.773Z" }, // Cumpleaños
];

// ── Installments ──────────────────────────────────────────────────────────────

export const installments: InstallmentEntry[] = [
  { isPaid: false, amount: 40_000, plan: { accountId: CREDITO_ID } }, // Bicicleta Jose cuota 2/2
];

// ── Plans ─────────────────────────────────────────────────────────────────────

export const allPlans: PlanEntry[] = [
  {
    accountId: CREDITO_ID,
    totalInstallments: 2,
    installmentAmount: 40_000,
    startYear: 2026,
    startMonth: 4,
  },
];

// ── Period ────────────────────────────────────────────────────────────────────

export const YEAR  = 2026;
export const MONTH = 5;

// May 10, 2026 — fecha local conocida (21 días restantes)
export const TODAY = new Date("2026-05-10T12:00:00Z");
