"use server";
import { adminStorage } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

export async function uploadAttendancePhoto(base64Image: string): Promise<string | null> {
  if (!base64Image) return null;

  try {
    const bucket = adminStorage.bucket();
    const fileName = `attendance/${randomUUID()}.jpg`;
    const file = bucket.file(fileName);

    // Extract base64 data
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Uniform Bucket-Level Access rejects `public: true`; use a long-lived
    // signed URL instead (same fix already applied in
    // src/components/employees/actions.ts).
    await file.save(buffer, {
      metadata: { contentType: "image/jpeg" },
    });

    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    return signedUrl;
  } catch (error) {
    console.error("Error uploading attendance photo:", error);
    return null;
  }
}

// Accepts a data: URL (as produced by the camera-capture / file-upload UI in
// the ported attendance components), uploads it to Firebase Storage via the
// Admin SDK, and returns a long-lived signed URL. Mirrors the pattern used
// in src/components/employees/actions.ts.
export async function uploadAttendanceImageAction(
  employeeProfileId: string,
  dataUrl: string,
  type: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
    if (!match || !match[1] || !match[2]) {
      return { success: false, error: "Invalid image data." };
    }
    const contentType: string = match[1];
    const buffer = Buffer.from(match[2], "base64");

    const bucket = adminStorage.bucket();
    const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
    const fileName = `attendance/${employeeProfileId}/${type}_${Date.now()}.${ext}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, { metadata: { contentType } });
    const [signedUrl] = await fileRef.getSignedUrl({
      action: "read",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    return { success: true, url: signedUrl };
  } catch (error: any) {
    console.error("uploadAttendanceImageAction failed:", error);
    return { success: false, error: error?.message || "Failed to upload photo." };
  }
}
