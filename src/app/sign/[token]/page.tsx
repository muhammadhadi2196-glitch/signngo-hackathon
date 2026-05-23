import { Metadata } from "next";
import dynamic from "next/dynamic";

const SigningSurface = dynamic(
  () => import("@/components/sign/SigningSurface").then((m) => ({ default: m.SigningSurface })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading document…
      </div>
    ),
  }
);

export const metadata: Metadata = { title: "Sign document — signNGO" };

async function fetchSigningData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/sign/${token}`, { cache: "no-store" });
  return { status: res.status, data: await res.json() };
}

export default async function SignPage({ params }: { params: { token: string } }) {
  const { status, data } = await fetchSigningData(params.token);

  if (status === 404) {
    return <ErrorScreen title="Link not found" message="This signing link is invalid or has been removed." />;
  }
  if (status === 410) {
    return <ErrorScreen title="Link expired" message="This signing link has expired. Contact the sender for a new link." />;
  }
  if (status === 409) {
    return <ErrorScreen title="Already signed" message="This document has already been signed." success />;
  }
  if (status !== 200) {
    return <ErrorScreen title="Something went wrong" message="Unable to load the signing page. Please try again." />;
  }

  return (
    <SigningSurface
      token={params.token}
      request={data.request}
      document={data.document}
      sender={data.sender}
    />
  );
}

function ErrorScreen({
  title,
  message,
  success = false,
}: {
  title: string;
  message: string;
  success?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className={`h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${success ? "bg-green-100" : "bg-slate-100"}`}>
          {success ? "✓" : "✕"}
        </div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <a
          href="/"
          className="mt-6 inline-block text-sm text-blue-600 hover:text-blue-800"
        >
          Powered by signNGO
        </a>
      </div>
    </div>
  );
}
