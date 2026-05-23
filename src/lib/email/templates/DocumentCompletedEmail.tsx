import {
  Html, Head, Body, Container, Section,
  Heading, Text, Button, Hr, Img,
} from "@react-email/components";

interface Props {
  recipientName: string;
  documentTitle: string;
  senderName: string;
  downloadUrl: string;
  logoUrl: string | null;
  forParty: "recipient" | "sender";
}

export function DocumentCompletedEmail({
  recipientName,
  documentTitle,
  senderName,
  downloadUrl,
  logoUrl,
  forParty,
}: Props) {
  const heading =
    forParty === "recipient"
      ? `Here's your signed copy of ${documentTitle}`
      : `${recipientName} signed your document`;

  const body =
    forParty === "recipient"
      ? `Hi ${recipientName || "there"}, your signed copy of ${documentTitle} is ready to download.`
      : `${recipientName} has signed ${documentTitle}. Download the completed copy below.`;

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
            <Heading style={{ fontSize: 20, marginTop: 0 }}>{heading}</Heading>
            <Text style={{ color: "#475569" }}>{body}</Text>
            <Section style={{ textAlign: "center", margin: "24px 0" }}>
              <Button
                href={downloadUrl}
                style={{
                  backgroundColor: "#16A34A",
                  color: "#FFFFFF",
                  padding: "12px 24px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Download signed PDF
              </Button>
            </Section>
            <Text style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, margin: 0 }}>
              Signed PDF also attached to this email.
            </Text>
          </Section>
          <Hr style={{ borderColor: "#E2E8F0", margin: "32px 0" }} />
          <Text style={{ textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
            Powered by signNGO
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
