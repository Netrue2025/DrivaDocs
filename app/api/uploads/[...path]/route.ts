import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canAccessUploadStorageKey, isSafeUploadStorageKey } from "@/lib/upload-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const storageKey = ["uploads", ...(params.path || [])].join("/");
  if (!isSafeUploadKey(storageKey)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canAccess = await canAccessUploadStorageKey(prisma, storageKey, session.user);
  if (!canAccess) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const fileName = params.path?.at(-1) || "document";

  try {
    const bytes = process.env.UPLOAD_PROVIDER?.toLowerCase() === "supabase"
      ? await readFromSupabase(storageKey)
      : await readFromLocalPublic(storageKey);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentTypeFor(fileName),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${sanitizeHeaderFileName(fileName)}"`,
        "Cache-Control": "private, max-age=300"
      }
    });
  } catch (error) {
    console.error("Document fetch failed", error);
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}

async function readFromLocalPublic(storageKey: string) {
  const root = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(process.cwd(), "public", ...storageKey.split("/"));
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid upload path");
  }
  return readFile(resolvedFile);
}

async function readFromSupabase(storageKey: string) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!supabaseUrl || !serviceRoleKey || !bucket) {
    throw new Error("Supabase upload storage is not configured");
  }

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${storageKey}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase download failed: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function isSafeUploadKey(storageKey: string) {
  return isSafeUploadStorageKey(storageKey);
}

function sanitizeHeaderFileName(fileName: string) {
  return fileName.replace(/["\r\n]/g, "_");
}

function contentTypeFor(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return "application/octet-stream";
}
