import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";
import type { Quote, BusinessProfile, Customer } from "@prisma/client";

interface Props {
  quote: Quote & { customer: Customer | null };
  business: BusinessProfile;
  logoUrl: string | null;
  downloadUrl: string;
  customMessage?: string;
  recurring?: boolean;
}

function fmt(n: unknown): string {
  return Number(String(n)).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function QuoteEmail({
  quote,
  business,
  logoUrl,
  downloadUrl,
  customMessage,
  recurring,
}: Props) {
  const bizName =
    business.displayName || business.businessName || "Your business";
  const greetingName = quote.customer?.name || "there";

  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#F8FAFC",
          fontFamily: "Inter, Arial, sans-serif",
          color: "#0F172A",
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: 32 }}>
          <Section style={{ textAlign: "center", marginBottom: 24 }}>
            {logoUrl ? (
              <Img src={logoUrl} alt={bizName} width="80" />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: 700 }}>{bizName}</Text>
            )}
          </Section>

          <Section
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 32,
            }}
          >
            <Heading
              style={{ fontSize: 20, marginTop: 0, color: "#0F172A" }}
            >
              Quote {quote.quoteNumber}
            </Heading>
            <Text style={{ color: "#475569" }}>Hi {greetingName},</Text>
            <Text>
              {customMessage ||
                `${bizName} sent you a quote for ${fmt(quote.total)}.`}
            </Text>
            {recurring ? (
              <Text
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  backgroundColor: "#F1F5F9",
                  borderRadius: 6,
                  padding: "8px 12px",
                  margin: "0 0 16px 0",
                }}
              >
                This quote is sent automatically on a recurring schedule.
              </Text>
            ) : null}

            <Section
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: 8,
                padding: 16,
                margin: "24px 0",
              }}
            >
              <Text style={{ margin: 0, color: "#475569", fontSize: 13 }}>
                Quote total
              </Text>
              <Text style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                {fmt(quote.total)}
              </Text>
              {quote.validUntil ? (
                <Text
                  style={{ margin: "8px 0 0 0", color: "#475569", fontSize: 13 }}
                >
                  Valid until{" "}
                  {new Date(quote.validUntil).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              ) : null}
            </Section>

            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button
                href={downloadUrl}
                style={{
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  padding: "12px 24px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                View quote
              </Button>
            </Section>

            <Text style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, margin: 0 }}>
              PDF also attached to this email.
            </Text>
          </Section>

          <Hr style={{ borderColor: "#E2E8F0", margin: "32px 0" }} />
          <Text
            style={{ textAlign: "center", color: "#94A3B8", fontSize: 12 }}
          >
            Sent via signNGO on behalf of {bizName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
