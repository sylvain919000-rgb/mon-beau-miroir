"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ATTRIBUTES, type AttributeKind } from "@/lib/constants";
import { copy } from "@/lib/copy";
import { RATING_MILESTONES, appUrl, notifyUserByEmail } from "@/lib/email/notifications";
import type { BirthSex } from "@/lib/database.types";

export interface SubmitRatingInput {
  photoId: string;
  score: number;
  /** Optional attribute scores, e.g. { eyes: 8, jawline: 7 }. */
  attributes: Partial<Record<AttributeKind, number>>;
}

export interface SubmitRatingResult {
  error: string | null;
}

function isValidScore(value: unknown): value is number {
  // The offered scale is 3-10 without 7 (no 1/2 cruelty scores, no
  // fence-sitting 7) — enforced here too so the UI rule can't be
  // bypassed by a raw request. Historical 1/2/7 rows remain valid data.
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 3 &&
    value <= 10 &&
    value !== 7
  );
}

export interface SaveDemographicsInput {
  birthSex: BirthSex;
  birthMonth: number;
  birthYear: number;
}

/**
 * Persists the one-time demographics answers from the pre-rating gate.
 * The 18+ check happens here (months since birth ≥ 216); the database
 * adds range checks, all-or-none, and the write-once lock (migration 0005).
 */
export async function saveDemographics(
  input: SaveDemographicsInput
): Promise<{ error: string | null }> {
  if (
    (input.birthSex !== "male" && input.birthSex !== "female") ||
    !Number.isInteger(input.birthMonth) ||
    input.birthMonth < 1 ||
    input.birthMonth > 12 ||
    !Number.isInteger(input.birthYear) ||
    input.birthYear < 1900
  ) {
    return { error: copy.demographics.incomplete };
  }

  const now = new Date();
  const ageInMonths =
    (now.getFullYear() - input.birthYear) * 12 + (now.getMonth() + 1 - input.birthMonth);
  if (ageInMonths < 18 * 12) {
    return { error: copy.demographics.underage };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };

  const { error } = await supabase
    .from("profiles")
    .update({
      birth_sex: input.birthSex,
      birth_month: input.birthMonth,
      birth_year: input.birthYear,
    })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("DEMOGRAPHICS_LOCKED")) {
      return { error: "Your answers are already saved and can't be changed." };
    }
    return { error: "Saving didn't work. Please try again." };
  }
  return { error: null };
}

/**
 * Validates the payload, then delegates to the submit_rating RPC, which
 * writes the rating and its attribute scores in ONE transaction.
 * The 9/10 confirmation is a UI concern and has already happened by now.
 */
export async function submitRating(input: SubmitRatingInput): Promise<SubmitRatingResult> {
  if (!isValidScore(input.score)) {
    return { error: "Scores must be whole numbers from 3 to 10 — and 7 isn't offered." };
  }
  const attributes: Record<string, number> = {};
  for (const [attribute, score] of Object.entries(input.attributes)) {
    if (!ATTRIBUTES.includes(attribute as AttributeKind) || !isValidScore(score)) {
      return { error: "Scores must be whole numbers from 3 to 10 — and 7 isn't offered." };
    }
    attributes[attribute] = score;
  }

  const supabase = await createClient();

  // The demographics gate is unskippable in the UI; this makes it
  // unskippable for hand-crafted requests too.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_sex")
    .eq("id", user.id)
    .single();
  if (!profile?.birth_sex) {
    return { error: "Answer the quick questions about yourself first, then rate away." };
  }

  const { error } = await supabase.rpc("submit_rating", {
    p_photo: input.photoId,
    p_score: input.score,
    p_attributes: attributes,
  });

  if (error) {
    if (error.message.includes("ALREADY_RATED")) {
      return { error: "You've already rated this one." };
    }
    if (error.message.includes("PHOTO_NOT_RATABLE")) {
      return { error: "This photo is no longer available to rate." };
    }
    return { error: "Your rating didn't go through. It's back in your queue." };
  }

  await maybeSendMilestoneEmail(input.photoId);
  return { error: null };
}

/**
 * After a successful rating: if the photo just reached a milestone
 * count (1st, 3rd, 5th, 10th), congratulate the owner by email.
 * Service role because the rater's session can't see other people's
 * rating rows (by design). Best-effort — never fails the rating.
 */
async function maybeSendMilestoneEmail(photoId: string): Promise<void> {
  try {
    const service = createServiceClient();
    const { count } = await service
      .from("ratings")
      .select("id", { count: "exact", head: true })
      .eq("photo_id", photoId);
    if (!count || !RATING_MILESTONES.includes(count)) return;

    const { data: photo } = await service
      .from("photos")
      .select("owner_id")
      .eq("id", photoId)
      .single();
    if (!photo) return;

    await notifyUserByEmail(
      photo.owner_id,
      copy.emails.milestoneSubject(count),
      copy.emails.milestoneBody(count, appUrl())
    );
  } catch (error) {
    console.error("Milestone email failed", error);
  }
}
