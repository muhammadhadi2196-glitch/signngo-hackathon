import { Prisma } from "@prisma/client";
import { toDecimal } from "./money";

export interface LineItemMath {
  quantity: number | string | Prisma.Decimal;
  unitPrice: number | string | Prisma.Decimal;
  taxRate: number | string | Prisma.Decimal;
}

export interface LineItemResult {
  lineSubtotal: Prisma.Decimal;
  lineTax: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

export function computeLineItem(input: LineItemMath): LineItemResult {
  const qty = toDecimal(input.quantity);
  const price = toDecimal(input.unitPrice);
  const rate = toDecimal(input.taxRate);

  const subtotal = qty.mul(price);
  const tax = subtotal.mul(rate).div(100);
  const total = subtotal.add(tax);

  return {
    lineSubtotal: new Prisma.Decimal(subtotal.toFixed(2)),
    lineTax: new Prisma.Decimal(tax.toFixed(2)),
    lineTotal: new Prisma.Decimal(total.toFixed(2)),
  };
}

export interface DocTotals {
  subtotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
}

export function computeDocTotals(items: LineItemMath[]): DocTotals {
  let subtotal = new Prisma.Decimal(0);
  let taxTotal = new Prisma.Decimal(0);

  for (const item of items) {
    const r = computeLineItem(item);
    subtotal = subtotal.add(r.lineSubtotal);
    taxTotal = taxTotal.add(r.lineTax);
  }

  return {
    subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
    taxTotal: new Prisma.Decimal(taxTotal.toFixed(2)),
    total: new Prisma.Decimal(subtotal.add(taxTotal).toFixed(2)),
  };
}
