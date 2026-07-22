import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/photo-url/:photoId
 *
 * The photos bucket is private: nobody loads images from storage directly.
 * This endpoint checks authorization first, then redirects to a short-lived
 * signed URL:
 *   - the owner may always see their own photo (any moderation state)
 *   - everyone else only sees photos that are active AND approved
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // RLS already hides rows the caller may not see, but we re-check
  // explicitly so the rule is visible right here in the code.
  const { data: photo } = await supabase
    .from("photos")
    .select("owner_id, storage_path, status, moderation")
    .eq("id", photoId)
    .maybeSingle();

  const isOwner = photo?.owner_id === user.id;
  const isPubliclyVisible = photo?.status === "active" && photo?.moderation === "approved";

  // Admins may view any photo (moderation desk). RLS hides pending photo
  // ROWS from them, so pending photos are re-fetched with the service role.
  let visiblePhoto = photo;
  let isAdmin = false;
  if (!isOwner && !isPubliclyVisible) {
    const { data: me } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = Boolean(me?.is_admin);
    if (isAdmin && !visiblePhoto) {
      const { data: adminPhoto } = await createServiceClient()
        .from("photos")
        .select("owner_id, storage_path, status, moderation")
        .eq("id", photoId)
        .maybeSingle();
      visiblePhoto = adminPhoto;
    }
  }

  if (!visiblePhoto || (!isOwner && !isPubliclyVisible && !isAdmin)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only the service role can sign URLs for a private bucket.
  const service = createServiceClient();
  const { data: signed, error } = await service.storage
    .from("photos")
    .createSignedUrl(visiblePhoto.storage_path, 60);

  if (error || !signed) {
    return NextResponse.json({ error: "Could not load photo" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
