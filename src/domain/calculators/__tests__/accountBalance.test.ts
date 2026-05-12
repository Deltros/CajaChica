import { describe, it, expect } from "vitest";
import { computeAccountBalance } from "../accountBalance";
import {
  accounts, incomes, expenses, installments, allPlans,
  DEBITO_ID, CONSORCIO_ID, CREDITO_ID,
  YEAR, MONTH,
} from "./fixtures/may2026";

const debito   = accounts.find((a) => a.id === DEBITO_ID)!;
const consorcio = accounts.find((a) => a.id === CONSORCIO_ID)!;
const credito  = accounts.find((a) => a.id === CREDITO_ID)!;

describe("computeAccountBalance — Mayo 2026", () => {
  describe("Banco Santander Débito", () => {
    const result = computeAccountBalance(debito, incomes, expenses, installments, allPlans, YEAR, MONTH);

    it("balance correcto", () => expect(result.balance).toBe(613_796));
    it("pendingSpent correcto", () => expect(result.pendingSpent).toBe(150_000));
    it("totalRemainingDebt es 0 (cuenta débito sin cuotas)", () => expect(result.totalRemainingDebt).toBe(0));
    it("balance con pendientes correcto", () => expect(result.balance - result.pendingSpent).toBe(463_796));
  });

  describe("Banco Consorcio", () => {
    const result = computeAccountBalance(consorcio, incomes, expenses, installments, allPlans, YEAR, MONTH);

    it("balance correcto", () => expect(result.balance).toBe(256_000));
    it("sin pendientes", () => expect(result.pendingSpent).toBe(0));
    it("totalRemainingDebt es 0", () => expect(result.totalRemainingDebt).toBe(0));
  });

  describe("Banco Santander Crédito", () => {
    const result = computeAccountBalance(credito, incomes, expenses, installments, allPlans, YEAR, MONTH);

    it("balance correcto", () => expect(result.balance).toBe(-504_162));
    it("pendingSpent correcto (NBA TV + Clade)", () => expect(result.pendingSpent).toBe(39_850));
    it("totalRemainingDebt correcto", () => expect(result.totalRemainingDebt).toBe(504_162));
    it("balance con pendientes correcto", () => expect(result.balance - result.pendingSpent).toBe(-544_012));
    it("totalRemainingDebt con pendientes correcto", () => expect(result.totalRemainingDebt + result.pendingSpent).toBe(544_012));
  });
});
