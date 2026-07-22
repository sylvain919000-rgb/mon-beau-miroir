"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getModerationProvider } from "@/lib/moderation/provider";

interface ActionResult {
  error: string | null;
}

/**
 * Called AFTER the client has uploaded the new image file to storage.
 * Soft-removes any current active photo, then registers the new one.
 * Order matters: the partial unique index forbids two active rows, so the
 * old row must flip to 'removed' before the new row is inserted.
 */
export async function activateUploadedPhoto(storagePath: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  // Defense in depth: the path must live inside the caller's own folder.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { error: "Invalid photo path." };
  }

  const { error: retireError } = await supabase
    .from("photos")
    .update({ status: "removed" })
    .eq("owner_id", user.id)
    .eq("status", "active");
  if (retireError) return { error: "Could not replace your previous photo. Please try again." };

  const { error: insertError } = await supabase
    .from("photos")
    .insert({ owner_id: user.id, storage_path: storagePath });
  if (insertError) return { error: "Could not save your new photo. Please try again." };

  await runModerationIntake(user.id, storagePath);

  revalidatePath("/me");
  return { error: null };
}

/**
 * Moderation intake: asks the configured provider for a verdict.
 * With the default ManualReviewProvider the photo simply stays
 * 'pending' for the /admin queue; an automated provider's verdict is
 * applied by the SERVICE role (owners cannot touch the moderation
 * column — column grants, migration 0001).
 */
async function runModerationIntake(ownerId: string, storagePath: string) {
  try {
    const service = createServiceClient();
    const { data: signed } = await service.storage
      .from("photos")
      .createSignedUrl(storagePath, 120);
    if (!signed) return; // stays pending → manual queue

    const verdict = await getModerationProvider().review({ signedUrl: signed.signedUrl });
    if (verdict.decision === "manual_review") return;

    await service
      .from("photos")
      .update({ moderation: verdict.decision } as never)
      .eq("owner_id", ownerId)
      .eq("storage_path", storagePath);
  } catch (error) {
    // Never block an upload on moderation plumbing; pending is the safe state.
    console.error("Moderation intake failed", error);
  }
}

/** Removes the user's active photo without replacing it. */
export async function removeMyPhoto(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("photos")
    .update({ status: "removed" })
    .eq("owner_id", user.id)
    .eq("status", "active");
  if (error) return { error: "Could not remove your photo. Please try again." };

  revalidatePath("/me");
  return { error: null };
}

/**
 * Flips the owner's "Make sub-attribute ratings public" switch.
 * RLS + column grants guarantee only the owner can do this, and only
 * on the status / attributes_public columns.
 */
export async function setAttributeVisibility(
  photoId: string,
  makePublic: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("photos")
    .update({ attributes_public: makePublic })
    .eq("id", photoId)
    .eq("owner_id", user.id);
  if (error) return { error: "Could not update visibility. Please try again." };

  revalidatePath("/me");
  return { error: null };
}
