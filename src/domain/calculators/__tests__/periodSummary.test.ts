import { describe, it, expect } from "vitest";
import { computePeriodSummary } from "../periodSummary";
import {
  accounts, incomes, expenses, installments, allPlans,
  YEAR, MONTH, TODAY,
} from "./fixtures/may2026";

describe("computePeriodSummary — Mayo 2026", () => {
  const s = computePeriodSummary(accounts, incomes, expenses, installments, allPlans, YEAR, MONTH, TODAY);

  describe("Totales de ingresos y gastos", () => {
    it("totalIncome", () => expect(s.totalIncome).toBe(3_349_253));
    it("totalFixed",  () => expect(s.totalFixed).toBe(1_569_000));
    it("totalSavings", () => expect(s.totalSavings).toBe(800_000));
    it("totalVariable", () => expect(s.totalVariable).toBe(996_677));
    it("totalPendingInstallments", () => expect(s.totalPendingInstallments).toBe(40_000));
    it("totalPending", () => expect(s.totalPending).toBe(189_850));
  });

  describe("Saldo y gasto diario", () => {
    it("remaining (disponible)", () => expect(s.remaining).toBe(365_634));
    it("daysLeftInMonth",        () => expect(s.daysLeftInMonth).toBe(21));
    it("dailyBudget",            () => expect(s.dailyBudget).toBe(17_411));
    it("dailyBudgetWithPending", () => expect(s.dailyBudgetWithPending).toBe(8_370));
    it("effectiveTotalVariable", () => expect(s.effectiveTotalVariable).toBe(574_619));
  });

  describe("Saldo por cuenta", () => {
    it("3 cuentas activas", () => expect(s.accountBalances).toHaveLength(3));

    it("Banco Santander Débito — balance",        () => expect(s.accountBalances.find((b) => b.balance > 0 && b.balance !== 256_000)?.balance).toBe(613_796));
    it("Banco Consorcio — balance",               () => expect(s.accountBalances.find((b) => b.balance === 256_000)?.balance).toBe(256_000));
    it("Banco Santander Crédito — balance",       () => expect(s.accountBalances.find((b) => b.balance < 0)?.balance).toBe(-504_162));
    it("Banco Santander Crédito — pendingSpent",  () => expect(s.accountBalances.find((b) => b.balance < 0)?.pendingSpent).toBe(39_850));
    it("Banco Santander Crédito — totalRemainingDebt", () => expect(s.accountBalances.find((b) => b.balance < 0)?.totalRemainingDebt).toBe(504_162));
  });
});
