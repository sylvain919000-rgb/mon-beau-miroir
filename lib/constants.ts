/**
 * Product-wide constants. Change business rules here, nowhere else.
 */

/** Minutes of inbox access granted by one paid reading pass. */
export const READ_PASS_MINUTES = 15;

/** Attributes a rater may optionally score, in display order. */
export const ATTRIBUTES = [
  "hair",
  "forehead",
  "eyes",
  "nose",
  "lips",
  "jawline",
  "chest",
  "arms",
  "abs",
  "hands",
  "thighs",
  "butt",
  "feet",
  "fashion",
] as const;

export type AttributeKind = (typeof ATTRIBUTES)[number];

/** Human-readable labels for attributes. */
export const ATTRIBUTE_LABELS: Record<AttributeKind, string> = {
  hair: "Hair",
  forehead: "Forehead",
  eyes: "Eyes",
  nose: "Nose",
  lips: "Lips",
  jawline: "Jawline",
  chest: "Chest",
  arms: "Arms",
  abs: "Abs",
  hands: "Hands",
  thighs: "Thighs",
  butt: "Butt",
  feet: "Feet",
  fashion: "Fashion",
};

/** Usernames: lowercase letters, digits, underscore, 3-24 chars. */
export const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

/** Photos are resized client-side so the longest edge never exceeds this. */
export const MAX_PHOTO_DIMENSION = 1600;

/** A score of 9 or 10 always triggers the confirmation modal. */
export const HIGH_SCORE_THRESHOLD = 9;

/**
 * The scores a rater may actually give: 3-10, minus the fence-sitting 7.
 * (No 1/2 cruelty scores.) Shared by the number buttons and the radar so
 * the two input styles can never disagree about what's offered.
 */
export const OFFERED_SCORES = [3, 4, 5, 6, 8, 9, 10] as const;
