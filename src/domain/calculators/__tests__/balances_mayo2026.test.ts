/**
 * Test de integración de saldos — Mayo 2026
 *
 * Modela el estado real del sistema tal como aparece en pantalla:
 *   Banco Santander Débito:   $582.796  ($462.796 c/ pend.)
 *   Banco Consorcio:          $256.000
 *   Banco Santander Crédito:  -$507.850 (-$547.700 c/ pend., Total cuotas: -$507.850)
 *   Saldo total positivo:     $838.796
 *   Con pendientes:           -$547.700
 *
 * Todos los valores esperados se calculan MANUALMENTE desde las constantes definidas
 * aquí abajo. Si el código rompe la lógica, el test falla y es obvio qué parte está mal.
 */

import { describe, it, expect } from "vitest";
import { computeAccountBalance } from "../accountBalance";
import { computePeriodSummary } from "../periodSummary";
import type { AccountRef, IncomeEntry, ExpenseEntry, InstallmentEntry, PlanEntry } from "@/domain/types";

// ─────────────────────────────────────────────────────────────────────────────
// PERÍODO
// ─────────────────────────────────────────────────────────────────────────────

const YEAR  = 2026;
const MONTH = 5; // Mayo — 31 días
const TODAY = new Date("2026-05-12T12:00:00Z"); // día 12 → quedan 19 días

// ─────────────────────────────────────────────────────────────────────────────
// CUENTAS
// ─────────────────────────────────────────────────────────────────────────────

const DEBITO_ID    = "debito";
const CONSORCIO_ID = "consorcio";
const CREDITO_ID   = "credito";

const accounts: AccountRef[] = [
  { id: DEBITO_ID,    isCreditCard: false },
  { id: CONSORCIO_ID, isCreditCard: false },
  { id: CREDITO_ID,   isCreditCard: true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INGRESOS
// ─────────────────────────────────────────────────────────────────────────────

// Débito
const ING_SUELDO        = 2_984_744;
const ING_CARGA_MES_ANT =   108_509;
// Consorcio
const ING_CONSORCIO     =   256_000;

const incomes: IncomeEntry[] = [
  { accountId: DEBITO_ID,    amount: ING_SUELDO,        source: "USER", date: "2026-05-11T01:27:34.000Z" },
  { accountId: DEBITO_ID,    amount: ING_CARGA_MES_ANT, source: "USER", date: "2026-05-11T01:28:20.000Z" },
  { accountId: CONSORCIO_ID, amount: ING_CONSORCIO,     source: "USER", date: "2026-05-11T01:27:59.000Z" },
];

// ─────────────────────────────────────────────────────────────────────────────
// GASTOS — BANCO SANTANDER DÉBITO
// ─────────────────────────────────────────────────────────────────────────────

// Fijos (type=FIXED, source=USER, date=día 1 del mes por propagación)
const DEB_PORTON_REJA    =    15_000;
const DEB_ARRIENDO       =   875_000;
const DEB_LIDER          =   100_000;
const DEB_PAGO_SANTANDER =   323_000;

// Ahorros (type=SAVING, source=USER)
const DEB_RACIONAL       =   400_000;
const DEB_VIAJE          =   200_000;
const DEB_EMERGENCIA     =   200_000;

// Variables (type=VARIABLE, source=USER)
const DEB_AJUSTE_SALDO_1 =    81_927;
const DEB_CLASES_TENIS   =   152_000;
const DEB_AJUSTE_SALDO_2 =    10_000;
const DEB_PIAZZA_PIZZA   =    14_530;
const DEB_REMEDIOS_INTI  =    20_000;
const DEB_CATRIEL_PACO   =     7_000;
const DEB_REGALO_MAMA    =    50_000;
const DEB_REGALO_BABY    =    20_000;
const DEB_EMPANADAS      =    20_000;
const DEB_CAFE_MARLEY    =    11_000;

// Variable (type=VARIABLE, source=BALANCE_ADJUST_MONTHLY)
const DEB_COMPLETOS      =    11_000;

// Pendiente (type=PENDING, source=USER) — no descuenta del balance diario
const DEB_CUMPLEANOS     =   120_000;

// ─────────────────────────────────────────────────────────────────────────────
// GASTOS — BANCO SANTANDER CRÉDITO
// ─────────────────────────────────────────────────────────────────────────────

// Fijo (type=FIXED, source=USER)
const CRED_CAE           =   256_000;

// Variables (type=VARIABLE, source=USER)
const CRED_SALIDA_FAM    =    79_687;
const CRED_SUBWAY        =    13_700;
const CRED_JEANS         =    66_864;
const CRED_UBER          =     5_807;

// Ajustes de saldo total (type=VARIABLE, source=BALANCE_ADJUST_TOTAL)
// ADJ_1: ajuste inicial que fijó el balance en -$504.162
// ADJ_2: ajuste posterior que movió el balance de -$504.162 a -$507.850 (diff=$3.688)
const CRED_ADJ_1         =    42_104;
const CRED_ADJ_2         =     3_688;

// Pendientes (type=PENDING, source=USER)
const CRED_NBA_TV        =    15_950;
const CRED_CLADE         =    23_900;

// ─────────────────────────────────────────────────────────────────────────────
// CUOTAS — BICICLETA JOSE
// ─────────────────────────────────────────────────────────────────────────────
//
// Plan: 2 cuotas de $40.000, inició abril 2026.
// En mayo 2026 → cuota número 2 de 2.
// Cuotas restantes = max(0, totalInstallments - currentInstallment + 1)
//                  = max(0, 2 - 2 + 1) = 1
// plansDebt  = 1 cuota restante × $40.000 = $40.000
// instSpent  = cuota del período actual   = $40.000

const BICICLETA_CUOTA             = 40_000;
const BICICLETA_CUOTAS_RESTANTES  = 1; // max(0, 2 - 2 + 1)

const installments: InstallmentEntry[] = [
  { isPaid: false, amount: BICICLETA_CUOTA, plan: { accountId: CREDITO_ID } },
];

const allPlans: PlanEntry[] = [
  {
    accountId:         CREDITO_ID,
    totalInstallments: 2,
    installmentAmount: BICICLETA_CUOTA,
    startYear:         2026,
    startMonth:        4, // abril 2026 → mayo es la cuota 2/2
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ARRAY DE GASTOS
// ─────────────────────────────────────────────────────────────────────────────

const expenses: ExpenseEntry[] = [
  // Débito — fijos (propagados al día 1)
  { accountId: DEBITO_ID, amount: DEB_PORTON_REJA,    type: "FIXED",    source: "USER",                   date: "2026-05-01T00:00:00.000Z" },
  { accountId: DEBITO_ID, amount: DEB_ARRIENDO,        type: "FIXED",    source: "USER",                   date: "2026-05-01T00:00:00.000Z" },
  { accountId: DEBITO_ID, amount: DEB_LIDER,           type: "FIXED",    source: "USER",                   date: "2026-05-01T00:00:00.000Z" },
  { accountId: DEBITO_ID, amount: DEB_PAGO_SANTANDER,  type: "FIXED",    source: "USER",                   date: "2026-05-01T00:00:00.000Z" },
  // Débito — ahorros
  { accountId: DEBITO_ID, amount: DEB_RACIONAL,        type: "SAVING",   source: "USER",                   date: "2026-05-11T01:31:55.000Z" },
  { accountId: DEBITO_ID, amount: DEB_VIAJE,           type: "SAVING",   source: "USER",                   date: "2026-05-11T01:32:05.000Z" },
  { accountId: DEBITO_ID, amount: DEB_EMERGENCIA,      type: "SAVING",   source: "USER",                   date: "2026-05-11T01:32:24.000Z" },
  // Débito — variables USER
  { accountId: DEBITO_ID, amount: DEB_AJUSTE_SALDO_1,  type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:32:49.000Z" },
  { accountId: DEBITO_ID, amount: DEB_CLASES_TENIS,    type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:35:24.000Z" },
  { accountId: DEBITO_ID, amount: DEB_AJUSTE_SALDO_2,  type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:35:52.000Z" },
  { accountId: DEBITO_ID, amount: DEB_PIAZZA_PIZZA,    type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:36:29.000Z" },
  { accountId: DEBITO_ID, amount: DEB_REMEDIOS_INTI,   type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:37:20.000Z" },
  { accountId: DEBITO_ID, amount: DEB_CATRIEL_PACO,    type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:37:33.000Z" },
  { accountId: DEBITO_ID, amount: DEB_REGALO_MAMA,     type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:37:51.000Z" },
  { accountId: DEBITO_ID, amount: DEB_REGALO_BABY,     type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:38:07.000Z" },
  { accountId: DEBITO_ID, amount: DEB_EMPANADAS,       type: "VARIABLE", source: "USER",                   date: "2026-05-12T10:00:00.000Z" },
  { accountId: DEBITO_ID, amount: DEB_CAFE_MARLEY,     type: "VARIABLE", source: "USER",                   date: "2026-05-12T10:30:00.000Z" },
  // Débito — variable BALANCE_ADJUST_MONTHLY
  { accountId: DEBITO_ID, amount: DEB_COMPLETOS,       type: "VARIABLE", source: "BALANCE_ADJUST_MONTHLY", date: "2026-05-11T02:16:10.000Z" },
  // Débito — pendiente
  { accountId: DEBITO_ID, amount: DEB_CUMPLEANOS,      type: "PENDING",  source: "USER",                   date: "2026-05-11T01:39:02.000Z" },

  // Crédito — fijo (propagado al día 1)
  { accountId: CREDITO_ID, amount: CRED_CAE,           type: "FIXED",    source: "USER",                   date: "2026-05-01T00:00:00.000Z" },
  // Crédito — variables USER
  { accountId: CREDITO_ID, amount: CRED_SALIDA_FAM,    type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:36:12.000Z" },
  { accountId: CREDITO_ID, amount: CRED_SUBWAY,        type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:36:45.000Z" },
  { accountId: CREDITO_ID, amount: CRED_JEANS,         type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:37:07.000Z" },
  { accountId: CREDITO_ID, amount: CRED_UBER,          type: "VARIABLE", source: "USER",                   date: "2026-05-11T01:38:20.000Z" },
  // Crédito — ajustes BALANCE_ADJUST_TOTAL
  { accountId: CREDITO_ID, amount: CRED_ADJ_1,         type: "VARIABLE", source: "BALANCE_ADJUST_TOTAL",   date: "2026-05-11T01:33:26.000Z" },
  { accountId: CREDITO_ID, amount: CRED_ADJ_2,         type: "VARIABLE", source: "BALANCE_ADJUST_TOTAL",   date: "2026-05-12T12:00:00.000Z" },
  // Crédito — pendientes
  { accountId: CREDITO_ID, amount: CRED_NBA_TV,        type: "PENDING",  source: "USER",                   date: "2026-05-11T01:38:32.000Z" },
  { accountId: CREDITO_ID, amount: CRED_CLADE,         type: "PENDING",  source: "USER",                   date: "2026-05-11T01:38:47.000Z" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS para los cálculos del resumen
// ─────────────────────────────────────────────────────────────────────────────

const debito   = accounts.find((a) => a.id === DEBITO_ID)!;
const consorcio = accounts.find((a) => a.id === CONSORCIO_ID)!;
const credito  = accounts.find((a) => a.id === CREDITO_ID)!;

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — BANCO SANTANDER DÉBITO
// ═════════════════════════════════════════════════════════════════════════════

describe("Banco Santander Débito", () => {
  //
  // balance (cuenta normal) = ingresos - gastos_no_pending - cuotas_del_período
  // No tiene cuotas propias → cuotas_del_período = 0
  //
  const ingresos_debito =
    ING_SUELDO + ING_CARGA_MES_ANT;
  // = 2.984.744 + 108.509 = 3.093.253

  const gastos_fijos =
    DEB_PORTON_REJA + DEB_ARRIENDO + DEB_LIDER + DEB_PAGO_SANTANDER;
  // = 15.000 + 875.000 + 100.000 + 323.000 = 1.313.000

  const ahorros =
    DEB_RACIONAL + DEB_VIAJE + DEB_EMERGENCIA;
  // = 400.000 + 200.000 + 200.000 = 800.000

  const vars_usuario =
    DEB_AJUSTE_SALDO_1 + DEB_CLASES_TENIS + DEB_AJUSTE_SALDO_2 +
    DEB_PIAZZA_PIZZA   + DEB_REMEDIOS_INTI + DEB_CATRIEL_PACO  +
    DEB_REGALO_MAMA    + DEB_REGALO_BABY   + DEB_EMPANADAS     + DEB_CAFE_MARLEY;
  // = 81.927 + 152.000 + 10.000 + 14.530 + 20.000 + 7.000 + 50.000 + 20.000 + 20.000 + 11.000
  // = 386.457

  const vars_ajuste_mensual = DEB_COMPLETOS;
  // = 11.000 (BALANCE_ADJUST_MONTHLY cuenta como gasto del período)

  const gastos_totales =
    gastos_fijos + ahorros + vars_usuario + vars_ajuste_mensual;
  // = 1.313.000 + 800.000 + 386.457 + 11.000 = 2.510.457

  const pendientes_debito = DEB_CUMPLEANOS;
  // = 120.000

  const expected_balance           = ingresos_debito - gastos_totales; // 3.093.253 - 2.510.457 = 582.796
  const expected_balance_con_pend  = expected_balance - pendientes_debito; // 582.796 - 120.000 = 462.796

  const result = computeAccountBalance(debito, incomes, expenses, installments, allPlans, YEAR, MONTH);

  it("balance = $582.796",                  () => expect(result.balance).toBe(expected_balance));
  it("pendingSpent = $120.000",             () => expect(result.pendingSpent).toBe(pendientes_debito));
  it("balance con pendientes = $462.796",   () => expect(result.balance - result.pendingSpent).toBe(expected_balance_con_pend));
  it("totalRemainingDebt = 0 (no crédito)", () => expect(result.totalRemainingDebt).toBe(0));
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — BANCO CONSORCIO
// ═════════════════════════════════════════════════════════════════════════════

describe("Banco Consorcio", () => {
  //
  // Solo tiene un ingreso, sin gastos ni cuotas.
  //
  const expected_balance = ING_CONSORCIO; // 256.000

  const result = computeAccountBalance(consorcio, incomes, expenses, installments, allPlans, YEAR, MONTH);

  it("balance = $256.000",                  () => expect(result.balance).toBe(expected_balance));
  it("sin pendientes",                      () => expect(result.pendingSpent).toBe(0));
  it("totalRemainingDebt = 0 (no crédito)", () => expect(result.totalRemainingDebt).toBe(0));
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — BANCO SANTANDER CRÉDITO
// ═════════════════════════════════════════════════════════════════════════════

describe("Banco Santander Crédito", () => {
  //
  // balance (tarjeta de crédito) =
  //   -(instSpent + adjExpenses - adjIncomes + postAdjUserSpent)
  //
  // donde:
  //   instSpent        = cuota del período actual (de PeriodInstallment)
  //   adjExpenses      = sum(expenses con source=BALANCE_ADJUST_TOTAL)
  //   adjIncomes       = sum(incomes  con source=BALANCE_ADJUST_TOTAL)
  //   postAdjUserSpent = sum(expenses con source=USER y type≠PENDING)
  //                      → SIN filtro por fecha (ver SYSTEM_CONTEXT.md)
  //
  // totalRemainingDebt =
  //   plansDebt + adjExpenses - adjIncomes + postAdjUserSpent
  //
  // donde:
  //   plansDebt = cuotas_restantes × installmentAmount
  //             = 1 × 40.000 = 40.000

  // Cuota del período
  const inst_spent = BICICLETA_CUOTA; // 40.000

  // Deuda total del plan (cuotas futuras)
  const planes_deuda = BICICLETA_CUOTAS_RESTANTES * BICICLETA_CUOTA; // 1 × 40.000 = 40.000

  // Ajustes BALANCE_ADJUST_TOTAL
  const adj_expenses = CRED_ADJ_1 + CRED_ADJ_2; // 42.104 + 3.688 = 45.792
  const adj_incomes  = 0;

  // Gastos USER no pendientes (todos, sin filtro por fecha)
  const post_adj_fijos = CRED_CAE;                                       // 256.000
  const post_adj_vars  = CRED_SALIDA_FAM + CRED_SUBWAY + CRED_JEANS + CRED_UBER;
  // = 79.687 + 13.700 + 66.864 + 5.807 = 166.058
  const post_adj_user_spent = post_adj_fijos + post_adj_vars;            // 422.058

  // Pendientes
  const pendientes_credito = CRED_NBA_TV + CRED_CLADE; // 15.950 + 23.900 = 39.850

  // Valores esperados
  const expected_balance =
    -(inst_spent + adj_expenses - adj_incomes + post_adj_user_spent);
  // = -(40.000 + 45.792 - 0 + 422.058) = -507.850

  const expected_total_deuda =
    planes_deuda + adj_expenses - adj_incomes + post_adj_user_spent;
  // = 40.000 + 45.792 - 0 + 422.058 = 507.850

  const expected_balance_con_pend  = expected_balance    - pendientes_credito; // -507.850 - 39.850 = -547.700
  const expected_total_con_pend    = expected_total_deuda + pendientes_credito; // 507.850 + 39.850 = 547.700

  const result = computeAccountBalance(credito, incomes, expenses, installments, allPlans, YEAR, MONTH);

  it("balance = -$507.850",                      () => expect(result.balance).toBe(expected_balance));
  it("pendingSpent = $39.850",                   () => expect(result.pendingSpent).toBe(pendientes_credito));
  it("balance con pendientes = -$547.700",       () => expect(result.balance - result.pendingSpent).toBe(expected_balance_con_pend));
  it("totalRemainingDebt = $507.850",            () => expect(result.totalRemainingDebt).toBe(expected_total_deuda));
  it("totalRemainingDebt con pendientes = $547.700", () => expect(result.totalRemainingDebt + result.pendingSpent).toBe(expected_total_con_pend));
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — RESUMEN DEL PERÍODO (lo que ve el usuario en pantalla)
// ═════════════════════════════════════════════════════════════════════════════

describe("Resumen del período — Mayo 2026", () => {
  //
  // Estos son los valores que se muestran en el dashboard.
  // Todos se calculan manualmente desde las constantes de arriba.
  //

  const total_income =
    (ING_SUELDO + ING_CARGA_MES_ANT) + ING_CONSORCIO;
  // = 3.093.253 + 256.000 = 3.349.253

  const total_fixed =
    (DEB_PORTON_REJA + DEB_ARRIENDO + DEB_LIDER + DEB_PAGO_SANTANDER) + CRED_CAE;
  // = 1.313.000 + 256.000 = 1.569.000

  const total_savings =
    DEB_RACIONAL + DEB_VIAJE + DEB_EMERGENCIA;
  // = 800.000

  const total_variable =
    // Débito — USER
    DEB_AJUSTE_SALDO_1 + DEB_CLASES_TENIS + DEB_AJUSTE_SALDO_2 +
    DEB_PIAZZA_PIZZA   + DEB_REMEDIOS_INTI + DEB_CATRIEL_PACO  +
    DEB_REGALO_MAMA    + DEB_REGALO_BABY   + DEB_EMPANADAS     + DEB_CAFE_MARLEY +
    // Débito — BALANCE_ADJUST_MONTHLY
    DEB_COMPLETOS +
    // Crédito — USER variables
    CRED_SALIDA_FAM + CRED_SUBWAY + CRED_JEANS + CRED_UBER +
    // Crédito — BALANCE_ADJUST_TOTAL (aparecen en la lista de variables)
    CRED_ADJ_1 + CRED_ADJ_2;
  // = 386.457 + 11.000 + 166.058 + 45.792 = 609.307

  const total_pending_installments = BICICLETA_CUOTA; // 40.000

  const total_pending =
    DEB_CUMPLEANOS + CRED_NBA_TV + CRED_CLADE;
  // = 120.000 + 15.950 + 23.900 = 159.850

  // Saldo por cuenta (resumen de los bloques de arriba)
  const debito_balance   = ING_SUELDO + ING_CARGA_MES_ANT
    - (DEB_PORTON_REJA + DEB_ARRIENDO + DEB_LIDER + DEB_PAGO_SANTANDER)
    - (DEB_RACIONAL + DEB_VIAJE + DEB_EMERGENCIA)
    - (DEB_AJUSTE_SALDO_1 + DEB_CLASES_TENIS + DEB_AJUSTE_SALDO_2 +
       DEB_PIAZZA_PIZZA + DEB_REMEDIOS_INTI + DEB_CATRIEL_PACO +
       DEB_REGALO_MAMA + DEB_REGALO_BABY + DEB_EMPANADAS + DEB_CAFE_MARLEY)
    - DEB_COMPLETOS;
  // = 3.093.253 - 2.510.457 = 582.796

  const consorcio_balance = ING_CONSORCIO; // 256.000

  const credito_balance = -(
    BICICLETA_CUOTA +
    (CRED_ADJ_1 + CRED_ADJ_2) - 0 +
    (CRED_CAE + CRED_SALIDA_FAM + CRED_SUBWAY + CRED_JEANS + CRED_UBER)
  ); // = -(40.000 + 45.792 + 422.058) = -507.850

  // remaining = totalPositive + totalNegative
  const total_positivo = debito_balance + consorcio_balance; // 582.796 + 256.000 = 838.796
  const total_negativo = credito_balance;                     // -507.850
  const remaining = total_positivo + total_negativo;          // 838.796 - 507.850 = 330.946

  // Con pendientes: sum de min(0, balance - pendingSpent) para cada cuenta
  // Débito:   min(0, 582.796 - 120.000) = min(0, 462.796) = 0
  // Consorcio: min(0, 256.000 - 0)      = 0
  // Crédito:  min(0, -507.850 - 39.850) = min(0, -547.700) = -547.700
  const con_pendientes = 0 + 0 + (credito_balance - (CRED_NBA_TV + CRED_CLADE));
  // = -547.700

  // Días restantes: mayo tiene 31 días, hoy es 12 → 31 - 12 = 19
  const dias_restantes = 31 - 12; // 19

  const daily_budget             = Math.floor(remaining / dias_restantes);
  const daily_budget_with_pending = Math.floor((remaining - total_pending) / dias_restantes);

  // effectiveTotalVariable = max(0, totalIncome - totalFixed - totalSavings - totalPendingInstallments - remaining)
  const effective_total_variable = Math.max(
    0,
    total_income - total_fixed - total_savings - total_pending_installments - remaining,
  );
  // = max(0, 3.349.253 - 1.569.000 - 800.000 - 40.000 - 330.946) = max(0, 609.307) = 609.307

  const s = computePeriodSummary(accounts, incomes, expenses, installments, allPlans, YEAR, MONTH, TODAY);

  // Totales de ingresos y gastos
  it("totalIncome = $3.349.253",               () => expect(s.totalIncome).toBe(total_income));
  it("totalFixed = $1.569.000",                () => expect(s.totalFixed).toBe(total_fixed));
  it("totalSavings = $800.000",                () => expect(s.totalSavings).toBe(total_savings));
  it("totalVariable = $609.307",               () => expect(s.totalVariable).toBe(total_variable));
  it("totalPendingInstallments = $40.000",     () => expect(s.totalPendingInstallments).toBe(total_pending_installments));
  it("totalPending = $159.850",                () => expect(s.totalPending).toBe(total_pending));

  // Saldo y gasto diario
  it("remaining = $330.946",                   () => expect(s.remaining).toBe(remaining));
  it("daysLeftInMonth = 19",                   () => expect(s.daysLeftInMonth).toBe(dias_restantes));
  it("dailyBudget",                            () => expect(s.dailyBudget).toBe(daily_budget));
  it("dailyBudgetWithPending",                 () => expect(s.dailyBudgetWithPending).toBe(daily_budget_with_pending));
  it("effectiveTotalVariable = $609.307",      () => expect(s.effectiveTotalVariable).toBe(effective_total_variable));

  // Saldo por cuenta (los valores del cuadro "Saldo en cuentas")
  it("Débito balance = $582.796",              () => expect(s.accountBalances.find((b) => b.accountId === DEBITO_ID)?.balance).toBe(debito_balance));
  it("Consorcio balance = $256.000",           () => expect(s.accountBalances.find((b) => b.accountId === CONSORCIO_ID)?.balance).toBe(consorcio_balance));
  it("Crédito balance = -$507.850",            () => expect(s.accountBalances.find((b) => b.accountId === CREDITO_ID)?.balance).toBe(credito_balance));
  it("Crédito totalRemainingDebt = $507.850",  () => expect(s.accountBalances.find((b) => b.accountId === CREDITO_ID)?.totalRemainingDebt).toBe(-credito_balance));

  // Totales visibles en el header "Saldo en cuentas"
  it("total positivo = $838.796",              () => expect(s.accountBalances.filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0)).toBe(total_positivo));
  it("total negativo = -$507.850",             () => expect(s.accountBalances.filter((b) => b.balance < 0).reduce((s, b) => s + b.balance, 0)).toBe(total_negativo));

  // Fila "Con pendientes" del dashboard
  it("con pendientes = -$547.700", () => {
    const result = s.accountBalances.reduce((sum, b) => sum + Math.min(0, b.balance - b.pendingSpent), 0);
    expect(result).toBe(con_pendientes);
  });
});
