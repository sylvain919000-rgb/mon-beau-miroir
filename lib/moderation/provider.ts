/**
 * Photo moderation pipeline.
 *
 * Every new photo starts as moderation = 'pending' (schema default) and
 * is invisible to non-owners until 'approved'. This module decides HOW a
 * photo gets its verdict:
 *
 *   - ManualReviewProvider (default): leaves the photo 'pending' for the
 *     /admin queue. Safe, human, launch-ready at small scale.
 *   - A future AutomatedProvider can call a vision moderation API
 *     (nudity / minor / fake detection) and return an instant verdict,
 *     falling back to manual review when unsure. Implement the same
 *     interface and switch it in getModerationProvider() — no call
 *     sites change.
 */

export type ModerationDecision = "approved" | "rejected" | "manual_review";

export interface ModerationVerdict {
  decision: ModerationDecision;
  /** Short internal reason, stored in the audit trail when automated. */
  reason?: string;
}

export interface PhotoModerationProvider {
  /** Reviews one photo, reachable at a short-lived signed URL. */
  review(input: { signedUrl: string }): Promise<ModerationVerdict>;
}

/** Default: every photo waits for a human in the /admin queue. */
class ManualReviewProvider implements PhotoModerationProvider {
  async review(): Promise<ModerationVerdict> {
    return { decision: "manual_review" };
  }
}

export function getModerationProvider(): PhotoModerationProvider {
  // Later: switch on process.env.MODERATION_PROVIDER ("manual" | "vision-api").
  return new ManualReviewProvider();
}
