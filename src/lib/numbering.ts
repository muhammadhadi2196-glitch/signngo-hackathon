import { prisma } from "./prisma";

export async function getNextInvoiceNumber(userId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.businessProfile.findUniqueOrThrow({ where: { userId } });
    let counter = profile.nextInvoiceNumber;
    let number = `${profile.invoiceNumberPrefix}${counter}`;
    while (await tx.invoice.findFirst({ where: { userId, invoiceNumber: number } })) {
      counter++;
      number = `${profile.invoiceNumberPrefix}${counter}`;
    }
    await tx.businessProfile.update({
      where: { userId },
      data: { nextInvoiceNumber: counter + 1 },
    });
    return number;
  });
}

export async function getNextQuoteNumber(userId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.businessProfile.findUniqueOrThrow({ where: { userId } });
    let counter = profile.nextQuoteNumber;
    let number = `${profile.quoteNumberPrefix}${counter}`;
    while (await tx.quote.findFirst({ where: { userId, quoteNumber: number } })) {
      counter++;
      number = `${profile.quoteNumberPrefix}${counter}`;
    }
    await tx.businessProfile.update({
      where: { userId },
      data: { nextQuoteNumber: counter + 1 },
    });
    return number;
  });
}
