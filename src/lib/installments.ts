/** Returns the 1-based installment number for a given viewing period. */
export function installmentNumberForPeriod(
  plan: { startYear: number; startMonth: number },
  year: number,
  month: number
): number {
  const periodOffset = year * 12 + (month - 1);
  const startOffset = plan.startYear * 12 + (plan.startMonth - 1);
  return periodOffset - startOffset + 1;
}
