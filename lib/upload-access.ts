import type { PrismaClient } from "@prisma/client";

type UploadAccessUser = {
  id: string;
  role?: string | null;
};

export function isSafeUploadStorageKey(storageKey: string) {
  return storageKey.startsWith("uploads/") && !storageKey.split("/").some((part) => part === ".." || part === "");
}

export function isClientUploadStorageKey(storageKey: string, userId: string) {
  return isSafeUploadStorageKey(storageKey) && storageKey.startsWith(`uploads/client/${userId}/`);
}

export function isOwnedUploadStorageKey(storageKey: string, userId: string) {
  return (
    isClientUploadStorageKey(storageKey, userId) ||
    (isSafeUploadStorageKey(storageKey) && storageKey.startsWith(`uploads/profiles/${userId}/`))
  );
}

export function isAdminUploadUser(user: UploadAccessUser) {
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

export async function canAccessUploadStorageKey(prisma: PrismaClient, storageKey: string, user: UploadAccessUser) {
  if (!isSafeUploadStorageKey(storageKey)) return false;
  if (isAdminUploadUser(user) || isOwnedUploadStorageKey(storageKey, user.id)) return true;

  const document = await prisma.uploadedDocument.findFirst({
    where: { storageKey, userId: user.id },
    select: { id: true }
  });

  return Boolean(document);
}
