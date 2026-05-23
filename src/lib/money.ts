import { Prisma } from "@prisma/client";

export type Money = Prisma.Decimal;

export function toDecimal(value: unknown): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) return value;
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(0);
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(n.toFixed(2));
}

export function decimalToNumber(d: Prisma.Decimal | number | string | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return Number(d.toString());
}

export function formatCurrency(value: Prisma.Decimal | number | string, currency = "USD", locale = "en-US"): string {
  const n = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
}
