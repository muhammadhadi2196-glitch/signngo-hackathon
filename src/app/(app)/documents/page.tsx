import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentsList } from "@/components/documents/DocumentsList";
import Link from "next/link";

export const metadata = { title: "Documents — signNGO" };

export default async function DocumentsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const docs = await prisma.document.findMany({
    where: { userId: session.profile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      signingRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          recipientName: true,
          recipientEmail: true,
          completedAt: true,
          completedFilePath: true,
          token: true,
        },
      },
    },
  });

  const documents = docs.map((d) => ({
    id: d.id,
    title: d.title,
    originalFilename: d.originalFilename,
    createdAt: d.createdAt.toISOString(),
    latestRequest: d.signingRequests[0]
      ? {
          id: d.signingRequests[0].id,
          status: d.signingRequests[0].status as string,
          recipientName: d.signingRequests[0].recipientName,
          recipientEmail: d.signingRequests[0].recipientEmail,
          completedAt: d.signingRequests[0].completedAt?.toISOString() ?? null,
          completedFilePath: d.signingRequests[0].completedFilePath ?? null,
          token: d.signingRequests[0].token,
        }
      : null,
  }));

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Send PDFs for signature and track their status."
        action={
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            + New Document
          </Link>
        }
      />
      <DocumentsList documents={documents} />
    </div>
  );
}
