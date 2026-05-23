import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function uploadFile(
  bucket: string,
  path: string,
  fileOrBuffer: Buffer | Uint8Array | Blob,
  contentType: string
): Promise<{ path: string }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileOrBuffer, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { path };
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl)
    throw new Error(`Failed to create signed URL: ${error?.message}`);

  return data.signedUrl;
}

export function getPublicUrl(bucket: string, path: string): string {
  const supabase = getSupabaseAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}

export async function createSignedUploadUrl(
  bucket: string,
  path: string
): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data)
    throw new Error(`Failed to create signed upload URL: ${error?.message}`);

  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}
