import { supabase } from "@/integrations/supabase/client";

export async function signUrl(bucket: string, path: string, expires = 60 * 60) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadFile(bucket: string, path: string, file: File) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Batch sign multiple paths in one round trip. Returns a { path -> url } map. */
export async function signUrls(bucket: string, paths: string[], expires = 60 * 60) {
  const map: Record<string, string> = {};
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expires);
  if (error || !data) return map;
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}