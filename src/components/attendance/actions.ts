"use server";
import { adminStorage } from "@/lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

export async function uploadAttendancePhoto(base64Image: string): Promise<string | null> {
  if (!base64Image) return null;
  
  try {
    const bucket = adminStorage.bucket();
    const fileName = `attendance/${uuidv4()}.jpg`;
    const file = bucket.file(fileName);
    
    // Extract base64 data
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    await file.save(buffer, {
      metadata: { contentType: "image/jpeg" },
      public: true,
    });
    
    const [publicUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2100'
    });
    
    return publicUrl;
  } catch (error) {
    console.error("Error uploading attendance photo:", error);
    return null;
  }
}
