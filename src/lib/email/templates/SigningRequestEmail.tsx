import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Img,
} from "@react-email/components";

interface Props {
  recipientName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  logoUrl: string | null;
  expiresAt: Date | null;
}

export function SigningRequestEmail({
  recipientName,
  senderName,
  documentTitle,
  signingUrl,
  logoUrl,
  expiresAt,
}: Props) {
  const greet = recipientName || "there";
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#F8FAFC", fontFamily: "Inter, Arial, sans-serif", color: "#0F172A", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: 32 }}>
          <Section style={{ textAlign: "center", marginBottom: 24 }}>
            {logoUrl ? (
              <Img src={logoUrl} alt={senderName} width="80" />
            ) : (
              <Text style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{senderName}</Text>
            )}
          </Section>
          <Section style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 32 }}>
            <Heading style={{ fontSize: 20, marginTop: 0 }}>
              {senderName} needs your signature
            </Heading>
            <Text style={{ color: "#475569" }}>Hi {greet},</Text>
            <Text>
              {senderName} has sent you a document to review and sign:{" "}
              <strong>{documentTitle}</strong>.
            </Text>
            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button
                href={signingUrl}
                style={{
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  padding: "12px 24px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Review &amp; sign
              </Button>
            </Section>
            {expiresAt && (
              <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                This link expires on{" "}
                {new Date(expiresAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                .
              </Text>
            )}
          </Section>
          <Hr style={{ borderColor: "#E2E8F0", margin: "32px 0" }} />
          <Text style={{ textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
            Sent via signNGO on behalf of {senderName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
