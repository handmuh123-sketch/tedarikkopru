import { AuthShell } from "@/components/auth/auth-shell";
import { InvitationAccept } from "@/components/onboarding/invitation-accept";
import { requirePageUser } from "@/lib/auth/page-session";
export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  await requirePageUser();
  const { token = "" } = await searchParams;
  return (
    <AuthShell
      eyebrow="Üyelik daveti"
      title="İşletmeye katılın."
      description="Davet yalnız e-posta adresinizle eşleşen doğrulanmış hesap tarafından bir kez kullanılabilir."
    >
      <InvitationAccept token={token} />
    </AuthShell>
  );
}
