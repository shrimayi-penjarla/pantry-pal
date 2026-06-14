import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a recipe / pantry image to the recipe-images bucket and return
 * a long-lived signed URL ready to drop into an <img src>.
 *
 * Files are stored under `<user_id>/...` so storage RLS can restrict
 * access to the owning user only.
 */
export async function uploadRecipeImage(file: File, prefix = "recipe"): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw userErr ?? new Error("You must be signed in to upload images.");
  }
  const userId = userData.user.id;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.length > 4 ? "jpg" : ext;
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.${safeExt}`;

  const { error: upErr } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  // Bucket is private — create a signed URL valid ~10 years.
  const { data, error: signErr } = await supabase.storage
    .from("recipe-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr || !data?.signedUrl) throw signErr ?? new Error("Could not sign URL");

  return data.signedUrl;
}
