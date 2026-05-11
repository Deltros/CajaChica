export const ExpenseType = {
  FIXED: "FIXED",
  VARIABLE: "VARIABLE",
  SAVING: "SAVING",
  PENDING: "PENDING",
} as const;
export type ExpenseType = (typeof ExpenseType)[keyof typeof ExpenseType];

export const EntrySource = {
  USER: "USER",
  BALANCE_ADJUST_TOTAL: "BALANCE_ADJUST_TOTAL",
  BALANCE_ADJUST_MONTHLY: "BALANCE_ADJUST_MONTHLY",
} as const;
export type EntrySource = (typeof EntrySource)[keyof typeof EntrySource];

export const AccountType = {
  BANK: "BANK",
  CASH: "CASH",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];
