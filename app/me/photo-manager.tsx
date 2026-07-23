"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { activateUploadedPhoto, removeMyPhoto } from "./actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { PhotoFallback } from "@/components/fallbacks/photo-fallback";
import { GlassSkeleton } from "@/components/fallbacks/glass-skeleton";
import { copy } from "@/lib/copy";
import { MAX_PHOTO_DIMENSION } from "@/lib/constants";
import type { ModerationStatus } from "@/lib/database.types";

interface PhotoManagerProps {
  userId: string;
  photo: { id: string; moderation: ModerationStatus } | null;
}

/**
 * The owner's single-photo workflow:
 * consent modal → pick file → client-side resize to webp → upload to the
 * private bucket → server action swaps it in as the one active photo.
 */
export function PhotoManager({ userId, photo }: PhotoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  function openConsent() {
    setConsentChecked(false);
    setError(null);
    setConsentOpen(true);
  }

  function confirmConsent() {
    setConsentOpen(false);
    fileInputRef.current?.click();
  }

  async function handleFileChosen(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await resizeToWebp(file, MAX_PHOTO_DIMENSION);
      const photoId = crypto.randomUUID();
      const storagePath = `${userId}/${photoId}.webp`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, blob, { contentType: "image/webp" });
      if (uploadError) throw new Error(uploadError.message);

      const result = await activateUploadedPhoto(storagePath);
      if (result.error) throw new Error(result.error);
      setImageFailed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold text-ink">Your photo</h2>

      <div className="mt-3">
        {uploading ? (
          <GlassSkeleton className="aspect-[3/4] w-full" />
        ) : photo && !imageFailed ? (
          <div className="relative">
            <Image
              src={`/api/photo-url/${photo.id}`}
              alt="Your current photo"
              width={600}
              height={800}
              unoptimized
              className="aspect-[3/4] w-full rounded-lg object-cover shadow-card"
              onError={() => setImageFailed(true)}
            />
            {photo.moderation === "pending" && (
              <p className="mt-2 rounded-md bg-surface-2 p-3 text-sm text-ink-soft">
                {copy.moderation.pending}
              </p>
            )}
            {photo.moderation === "approved" && (
              <p className="mt-2 rounded-md bg-surface-2 p-3 text-sm text-success">
                ✓ {copy.moderation.approved}
              </p>
            )}
            {photo.moderation === "rejected" && (
              <p className="mt-2 rounded-md bg-surface-2 p-3 text-sm text-danger">
                {copy.moderation.rejected}
              </p>
            )}
          </div>
        ) : (
          <PhotoFallback />
        )}
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex gap-3">
        <Button onClick={openConsent} loading={uploading}>
          {photo ? "Replace photo" : "Upload your photo"}
        </Button>
        {photo && (
          <Button
            variant="ghost"
            loading={removing}
            onClick={() =>
              startRemoving(async () => {
                const result = await removeMyPhoto();
                if (result.error) setError(result.error);
              })
            }
          >
            Remove
          </Button>
        )}
      </div>

      {/* Hidden file input, opened only after consent is confirmed */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChosen(e.target.files?.[0])}
      />

      <Modal open={consentOpen} onClose={() => setConsentOpen(false)} title={copy.upload.title}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          {copy.upload.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <CheckboxField
          className="mt-4"
          label={copy.upload.checkbox}
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConsentOpen(false)}>
            {copy.upload.cancel}
          </Button>
          <Button onClick={confirmConsent} disabled={!consentChecked}>
            {copy.upload.confirm}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

/**
 * Downscales an image in the browser so its longest edge is at most
 * maxDimension pixels, and re-encodes it as webp. Keeps uploads small
 * and strips original metadata as a side effect.
 */
async function resizeToWebp(file: File, maxDimension: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process this image.");
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image."))),
      "image/webp",
      0.85
    );
  });
}
