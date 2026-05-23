import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Disable auto-hyphenation for all text in invoice PDFs. react-pdf's default
// engine breaks words mid-letter to fit column width; returning [word] tells it
// there are no valid break points within any word.
Font.registerHyphenationCallback((word) => [word]);
import type {
  Invoice,
  InvoiceLineItem,
  BusinessProfile,
  Customer,
} from "@prisma/client";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0F172A" },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  bizBlock: { width: "60%" },
  metaBlock: { width: "35%", fontSize: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaLabel: { fontWeight: 700, color: "#475569" },
  logo: { width: 80, height: 80, marginBottom: 8 },
  bizName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  bizLine: { color: "#475569", marginBottom: 2 },
  addrRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  addrBlock: { width: "48%" },
  addrLabel: { fontWeight: 700, marginBottom: 4, color: "#475569" },
  table: { marginBottom: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colQty: { width: "8%" },
  colDesc: { width: "52%" },
  colPrice: { width: "15%", textAlign: "right" },
  colTax: { width: "10%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: "40%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    fontWeight: 700,
  },
  notes: { marginTop: 24, color: "#475569" },
  notesHeading: { fontWeight: 700, fontSize: 11, marginBottom: 4, color: "#0F172A" },
  footer: { marginTop: 24, fontSize: 9, color: "#94A3B8", textAlign: "center" },
});

type InvoiceWithRels = Invoice & {
  lineItems: InvoiceLineItem[];
  customer: Customer | null;
};

interface Props {
  invoice: InvoiceWithRels;
  business: BusinessProfile;
  logoUrl: string | null;
}

function fmt(n: unknown): string {
  const num = typeof n === "number" ? n : Number(String(n));
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvoicePdf({ invoice, business, logoUrl }: Props) {
  const lines = invoice.lineItems ?? [];
  const totalQty = lines.reduce((sum, li) => sum + Number(String(li.quantity)), 0);
  const totalQtyDisplay = parseFloat(totalQty.toFixed(4)).toString();

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Invoice</Text>

        <View style={styles.headerRow}>
          <View style={styles.bizBlock}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            <Text style={styles.bizName}>
              {business.displayName || business.businessName || ""}
            </Text>
            {business.address ? <Text style={styles.bizLine}>{business.address}</Text> : null}
            {business.phone ? <Text style={styles.bizLine}>{business.phone}</Text> : null}
            {business.email ? <Text style={styles.bizLine}>{business.email}</Text> : null}
            {business.website ? <Text style={styles.bizLine}>{business.website}</Text> : null}
          </View>

          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text>{fmtDate(invoice.date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No.:</Text>
              <Text>{invoice.invoiceNumber}</Text>
            </View>
            {invoice.dueDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date:</Text>
                <Text>{fmtDate(invoice.dueDate)}</Text>
              </View>
            ) : null}
            {invoice.purchaseOrderNumber ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>PO #:</Text>
                <Text>{invoice.purchaseOrderNumber}</Text>
              </View>
            ) : null}
            {invoice.salesperson ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Salesperson:</Text>
                <Text>{invoice.salesperson}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.addrRow}>
          <View style={styles.addrBlock}>
            <Text style={styles.addrLabel}>Bill To</Text>
            {invoice.customer?.name ? <Text>{invoice.customer.name}</Text> : null}
            {invoice.billingAddress ? <Text>{invoice.billingAddress}</Text> : null}
          </View>
          <View style={styles.addrBlock}>
            <Text style={styles.addrLabel}>Ship To</Text>
            <Text>{invoice.shippingAddress || invoice.billingAddress || ""}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTax}>Tax</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {lines.map((li) => (
            <View key={li.id} style={styles.row}>
              <Text style={styles.colQty}>{String(li.quantity)}</Text>
              <View style={styles.colDesc}>
                {li.name ? <Text style={{ fontWeight: 700 }}>{li.name}</Text> : null}
                {li.description ? <Text>{li.description}</Text> : null}
              </View>
              <Text style={styles.colPrice}>{fmt(li.unitPrice)}</Text>
              <Text style={styles.colTax}>{String(li.taxRate)}%</Text>
              <Text style={styles.colTotal}>{fmt(li.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={{ fontWeight: 700 }}>Total Quantity</Text>
            <Text>{totalQtyDisplay}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmt(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>{business.taxNumber ? "GST" : "Tax"}</Text>
            <Text>{fmt(invoice.taxTotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text>Total</Text>
            <Text>{fmt(invoice.total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Balance Due</Text>
            <Text>{fmt(invoice.balance)}</Text>
          </View>
        </View>

        {invoice.publicNote ? (
          <View style={styles.notes}>
            <Text style={styles.notesHeading}>Notes</Text>
            {invoice.publicNote.split("\n").map((line, i) => (
              <Text key={i}>{line || " "}</Text>
            ))}
          </View>
        ) : null}

        {business.taxNumber ? (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: "#475569" }}>GST No: {business.taxNumber}</Text>
          </View>
        ) : null}

        {invoice.footerNote || business.defaultFooter ? (
          <Text style={styles.footer}>
            {invoice.footerNote || business.defaultFooter}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
