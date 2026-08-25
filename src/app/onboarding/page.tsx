import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requirePageUser } from "@/lib/auth/page-session";
import { database } from "@/lib/db/client";
import { notFound } from "next/navigation";

type OnboardingPageProps = {
  searchParams: Promise<{ organizationId?: string | string[] }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { user } = await requirePageUser();
  const organizationIdValue = (await searchParams).organizationId;
  const organizationId =
    typeof organizationIdValue === "string" && organizationIdValue.length > 0
      ? organizationIdValue
      : null;
  let initialStage: "address" | "document" | "review" | undefined;

  if (organizationId) {
    const membership = await database.organizationMembership.findFirst({
      where: {
        organizationId,
        userId: user.id,
        status: "ACTIVE",
        role: { in: ["OWNER", "ORG_ADMIN"] },
        organization: {
          status: { not: "ARCHIVED" },
          verificationStatus: { in: ["DRAFT", "NEEDS_CHANGES"] },
        },
      },
      select: {
        organization: {
          select: {
            verificationStatus: true,
            addresses: { where: { type: "HEADQUARTERS" }, select: { id: true }, take: 1 },
            verificationApplications: {
              where: { status: { in: ["DRAFT", "NEEDS_CHANGES"] } },
              orderBy: { version: "desc" },
              take: 1,
              select: { documents: { select: { id: true }, take: 1 } },
            },
          },
        },
      },
    });
    if (!membership) notFound();
    const application = membership.organization.verificationApplications[0];
    if (!application) notFound();
    initialStage =
      membership.organization.addresses.length === 0
        ? "address"
        : membership.organization.verificationStatus === "NEEDS_CHANGES" ||
            application.documents.length === 0
          ? "document"
          : "review";
  }
  return (
    <main id="ana-icerik" className="dashboard-page" tabIndex={-1}>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">İşletme onboarding</p>
          <h1>İşletmenizi doğrulamaya hazırlayın.</h1>
        </div>
        <a className="button button-secondary" href="/panel">
          Panele dön
        </a>
      </header>
      {organizationId && initialStage ? (
        <OnboardingFlow initialOrganizationId={organizationId} initialStage={initialStage} />
      ) : (
        <OnboardingFlow />
      )}
    </main>
  );
}
