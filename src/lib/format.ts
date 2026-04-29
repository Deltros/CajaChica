export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function daysLeftInMonth(year: number, month: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const totalDays = new Date(year, month, 0).getDate();

  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return totalDays;
  }
  if (year === currentYear && month === currentMonth) {
    return totalDays - now.getDate();
  }
  return 0;
}
