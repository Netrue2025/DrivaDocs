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

  if (process.env.UPLOAD_PROVIDER?.toLowerCase() === "supabase") {
    return saveToSupabaseStorage(bytes, file, relativePath);
  }

  const outputDir = path.join(process.cwd(), "public", ...relativeDir.split("/"));

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, fileName), bytes);

  return {
    storageKey: relativePath,
    publicUrl: `/${relativePath}`
  };
}

async function saveToSupabaseStorage(bytes: Buffer, file: File, storageKey: string) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new Error("Supabase upload storage is not configured");
  }

  const contentType = file.type || contentTypeFor(file.name);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${storageKey}`;
  const body = new Blob([new Uint8Array(bytes)], { type: contentType });
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "false"
    },
    body
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase upload failed: ${response.status} ${message}`);
  }

  return {
    storageKey,
    publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${storageKey}`
  };
}

function sanitizePathPart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function contentTypeFor(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  return "image/jpeg";
}
