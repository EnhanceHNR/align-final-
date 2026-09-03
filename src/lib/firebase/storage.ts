'use server';

import { adminStorage } from '@/lib/firebaseAdmin';

export async function uploadFile(file: File, path: string): Promise<string> {
  console.log(`uploadFile called for path: ${path}`);
  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(path);

  console.log('Converting file to buffer...');
  // Convert File to Buffer for admin SDK
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  console.log(`Saving to bucket: ${bucket.name}...`);
  await fileRef.save(buffer, {
    resumable: false,
    metadata: {
      contentType: file.type,
    },
  });
  console.log('File saved successfully.');

  // The download URL below is a plain public-media URL (no signed token). It
  // only resolves if the object itself is publicly readable, which matters
  // for the /shared/[id] page: external viewers hit it with no Firebase Auth
  // session at all.
  try {
    await fileRef.makePublic();
  } catch (err) {
    console.error('Failed to make uploaded file public:', err);
  }

  // Make the file publicly accessible or get a signed URL
  // Since the app seems to expect a direct URL, we can use a signed URL or public URL
  // For Firebase storage buckets, the public URL pattern is:
  // https://firebasestorage.googleapis.com/v0/b/[BUCKET_NAME]/o/[PATH]?alt=media
  
  const encodedPath = encodeURIComponent(path);
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
  
  return downloadURL;
}
