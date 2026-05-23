import "server-only";
import { resend } from "./resend";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
  attachments,
}: {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}) {
  const from = process.env.EMAIL_FROM || "signNGO <onboarding@resend.dev>";
  const html = await render(react);

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
    ...(attachments?.length ? { attachments } : {}),
  });

  if (error) throw new Error(error.message || "Email send failed");
  return data;
}
