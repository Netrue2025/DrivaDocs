import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/upload-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "pdf"]);
const maxBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isAllowedFile = allowedTypes.has(file.type) || allowedExtensions.has(extension);
    if (!isAllowedFile || file.size > maxBytes) {
      return NextResponse.json({ error: "Only PDF/JPG/PNG files up to 5MB are allowed" }, { status: 400 });
    }
    const mimeType = file.type || (extension === "pdf" ? "application/pdf" : extension === "png" ? "image/png" : "image/jpeg");

    const stored = await saveUploadedFile(file, `client/${session.user.id}`);

    return NextResponse.json({
      storageKey: stored.storageKey,
      publicUrl: stored.publicUrl,
      fileName: file.name,
      mimeType,
      fileSize: file.size
    });
  } catch (error) {
    console.error("Upload failed", error);
    const message = error instanceof Error ? error.message : "Unable to upload file";
    const isStorageConfigError = message.toLowerCase().includes("supabase upload storage is not configured");
    const isStorageAuthError = message.includes("Supabase upload failed: 401") || message.includes("Supabase upload failed: 403");
    const isMissingBucket = message.includes("Supabase upload failed: 404");
    const isLargeUpload = message.includes("Supabase upload failed: 413");
    const isBadStorageRequest = message.includes("Supabase upload failed: 400");
    return NextResponse.json(
      {
        error: isStorageConfigError
          ? "Upload storage is not configured. Please check the Supabase storage environment variables."
          : isStorageAuthError
            ? "Supabase rejected the upload. Please use a server secret/service-role key, not the publishable key."
            : isMissingBucket
              ? "Supabase storage bucket was not found. Please check SUPABASE_STORAGE_BUCKET in Vercel."
              : isLargeUpload
                ? "This file is too large for upload. Please use a PDF/JPG/PNG file under 5MB."
                : isBadStorageRequest
                  ? "Supabase could not accept this upload. Please check the bucket name and storage settings."
                  : "Unable to upload file. Please check your file and try again."
      },
      { status: 500 }
    );
  }
}
