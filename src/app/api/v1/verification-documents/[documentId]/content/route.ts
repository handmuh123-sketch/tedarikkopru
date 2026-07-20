import { requireUser } from "@/lib/auth/access";
import { database } from "@/lib/db/client";
import { errorResponse, HttpError } from "@/lib/http/errors";
import { getPrivateDocument } from "@/lib/storage/private-documents";

type Context = { params: Promise<{ documentId: string }> };
const adminRoles = [
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "PLATFORM_OPERATIONS",
  "PLATFORM_SUPPORT",
] as const;

export async function GET(request: Request, context: Context) {
  try {
    const { documentId } = await context.params;
    const { user } = await requireUser(request);
    const isAdmin = adminRoles.includes(user.platformRole as (typeof adminRoles)[number]);
    const document = await database.verificationDocument.findFirst({
      where: {
        id: documentId,
        ...(isAdmin
          ? {}
          : {
              application: {
                organization: { memberships: { some: { userId: user.id, status: "ACTIVE" } } },
              },
            }),
      },
      select: { storageKey: true, mimeType: true, checksum: true },
    });
    if (!document) throw new HttpError(404, "Belge bulunamadı.", "DOCUMENT_NOT_FOUND");
    const bytes = await getPrivateDocument(document.storageKey);
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": document.mimeType,
        "content-disposition": "inline",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        etag: `\"${document.checksum}\"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
