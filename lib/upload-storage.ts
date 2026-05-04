import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function saveUploadedFile(file: File, folder: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeFolder = folder
    .split("/")
    .map((part) => sanitizePathPart(part))
    .filter(Boolean)
    .join("/");
  const fileName = `${Date.now()}-${sanitizePathPart(file.name)}`;
  const relativeDir = path.posix.join("uploads", safeFolder);
  const relativePath = path.posix.join(relativeDir, fileName);
  const outputDir = path.join(process.cwd(), "public", ...relativeDir.split("/"));

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, fileName), bytes);

  return {
    storageKey: relativePath,
    publicUrl: `/${relativePath}`
  };
}

function sanitizePathPart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
