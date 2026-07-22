"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoFallback } from "@/components/fallbacks/photo-fallback";
import { cn } from "@/lib/cn";

interface SafePhotoProps {
  photoId: string;
  alt: string;
  className?: string;
}

/**
 * The one way to render a member photo: goes through the signed-URL
 * endpoint and guarantees a token-styled fallback on load failure.
 * Reserves the 3:4 aspect ratio either way, so nothing shifts.
 */
export function SafePhoto({ photoId, alt, className }: SafePhotoProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <PhotoFallback className={className} />;
  return (
    <Image
      src={`/api/photo-url/${photoId}`}
      alt={alt}
      width={600}
      height={800}
      unoptimized
      className={cn("aspect-[3/4] w-full rounded-lg object-cover shadow-card", className)}
      onError={() => setFailed(true)}
    />
  );
}
