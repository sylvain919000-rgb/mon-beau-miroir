/**
 * Hand-written TypeScript mirror of supabase/migrations/0001_init.sql.
 * If you change the SQL schema, update this file in the same commit.
 */

export type AttributeKind =
  | "hair" | "forehead" | "eyes" | "nose" | "lips" | "jawline"
  | "chest" | "arms" | "abs" | "hands" | "thighs" | "butt" | "feet"
  | "fashion";

export type PhotoStatus = "active" | "removed";
export type ModerationStatus = "pending" | "approved" | "rejected";
export type EntitlementType = "message_credit" | "read_pass" | "subscription" | "gender_reveal";
export type ProductKind =
  | "single_message"
  | "read_pass"
  | "gender_insight"
  | "sub_monthly"
  | "sub_annual";
export type TransactionStatus = "pending" | "succeeded" | "failed" | "refunded";
export type ReportStatus = "open" | "reviewed" | "actioned" | "dismissed";
export type BirthSex = "male" | "female";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  is_over_18: boolean;
  tos_accepted_at: string | null;
  /** Set by the service role at first purchase; users cannot write it. */
  stripe_customer_id: string | null;
  /** Service-managed; absent from the user UPDATE grant (migration 0004). */
  is_admin: boolean;
  /** Demographics (migration 0005): null until the pre-rating gate is
   *  answered, then locked by a DB trigger. All three set together. */
  birth_sex: BirthSex | null;
  birth_month: number | null;
  birth_year: number | null;
  created_at: string;
}

export type Photo = {
  id: string;
  owner_id: string;
  storage_path: string;
  status: PhotoStatus;
  moderation: ModerationStatus;
  attributes_public: boolean;
  created_at: string;
}

export type Rating = {
  id: string;
  photo_id: string;
  rater_id: string;
  score: number;
  created_at: string;
}

export type AttributeRating = {
  id: string;
  rating_id: string;
  attribute: AttributeKind;
  score: number;
}

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

export type UserEntitlement = {
  id: string;
  user_id: string;
  type: EntitlementType;
  credits_remaining: number | null;
  expires_at: string | null;
  stripe_subscription_id: string | null;
  active: boolean;
  created_at: string;
}

export type Transaction = {
  id: string;
  user_id: string;
  product: ProductKind;
  amount_cents: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: TransactionStatus;
  created_at: string;
}

export type ProcessedStripeEvent = {
  /** Stripe event id, e.g. evt_... */
  id: string;
  created_at: string;
};

export type ModerationAudit = {
  id: string;
  actor_id: string;
  photo_id: string | null;
  report_id: string | null;
  action: string;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  photo_id: string | null;
  message_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
}

/** Helper: the shape supabase-js expects for one table. */
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/** Supabase client type map: supabase.from("photos") returns Photo rows, etc. */
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string; username: string }, Partial<Profile>>;
      photos: Table<Photo, Partial<Photo> & { owner_id: string; storage_path: string }, Partial<Photo>>;
      ratings: Table<Rating, Omit<Rating, "id" | "created_at">, Partial<Rating>>;
      attribute_ratings: Table<AttributeRating, Omit<AttributeRating, "id">, Partial<AttributeRating>>;
      // Message inserts happen through the send_message RPC only.
      messages: Table<Message, never, never>;
      // Entitlements and transactions are written by the service role only.
      user_entitlements: Table<UserEntitlement, never, never>;
      transactions: Table<Transaction, never, never>;
      reports: Table<Report, Omit<Report, "id" | "created_at" | "status">, never>;
      // Webhook idempotency ledger (service role only).
      processed_stripe_events: Table<ProcessedStripeEvent, { id: string }, never>;
      // Written by admin server actions via the service role only.
      moderation_audit: Table<ModerationAudit, Omit<ModerationAudit, "id" | "created_at">, never>;
    };
    Views: Record<string, never>;
    Functions: {
      send_message: { Args: { p_recipient: string; p_body: string }; Returns: string };
      get_inbox_teasers: {
        Args: Record<string, never>;
        Returns: { message_id: string; sender_username: string; created_at: string }[];
      };
      has_read_access: { Args: { uid: string }; Returns: boolean };
      has_send_access: { Args: { uid: string }; Returns: boolean };
      submit_rating: {
        Args: { p_photo: string; p_score: number; p_attributes?: Record<string, number> };
        Returns: string;
      };
      get_photo_stats: { Args: { p_photo: string }; Returns: PhotoStats | null };
      reveal_gender_split: { Args: Record<string, never>; Returns: GenderSplitStats };
    };
    Enums: {
      attribute_kind: AttributeKind;
      photo_status: PhotoStatus;
      moderation_status: ModerationStatus;
      entitlement_type: EntitlementType;
      product_kind: ProductKind;
      transaction_status: TransactionStatus;
      report_status: ReportStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

/** One bucket of the gender split: raters of one sex. */
export type GenderSplitBucket = {
  /** null when this bucket has no ratings yet. */
  avg_score: number | null;
  rating_count: number;
};

/**
 * Shape returned by the reveal_gender_split RPC (migration 0006).
 * "ok" is the only status that carries data — and the only one that
 * ever consumes a reveal credit.
 */
export type GenderSplitStats =
  | { status: "locked" | "no_photo" | "no_ratings" }
  | { status: "ok"; male: GenderSplitBucket; female: GenderSplitBucket; unknown: GenderSplitBucket };

/** Shape returned by the get_photo_stats RPC (migration 0002). */
export type PhotoStats = {
  overall: { avg_score: number | null; rating_count: number };
  /** null when the owner keeps the breakdown private and you are not the owner. */
  attributes:
    | { attribute: AttributeKind; avg_score: number; rating_count: number }[]
    | null;
  attributes_public: boolean;
};
