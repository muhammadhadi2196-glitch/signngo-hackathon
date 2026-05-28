import { Resend } from "resend";

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it in .env.local before sending email."
    );
  }
  _resend = new Resend(apiKey);
  return _resend;
}

// Lazy proxy so Next.js's page-data collection during `next build` doesn't
// crash when RESEND_API_KEY is absent. The client is constructed only on
// the first property access (e.g. `resend.emails.send(...)`).
export const resend: Resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    const client = getResendClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
