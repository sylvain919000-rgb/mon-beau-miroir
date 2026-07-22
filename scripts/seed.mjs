/**
 * Development seed: creates fake raters and ratings against YOUR photo so
 * the insights dashboard has data you can verify with plain SQL.
 *
 * Usage:
 *   node scripts/seed.mjs <your-user-id> [raterCount]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (they are read from .env.local automatically).
 * NEVER run against production.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Minimal .env.local loader (no extra dependency).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
} catch {
  // .env.local is optional if the vars are already exported.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerId = process.argv[2];
const raterCount = Number(process.argv[3] ?? 12);

if (!url || !serviceKey || !ownerId) {
  console.error("Usage: node scripts/seed.mjs <your-user-id> [raterCount]");
  process.exit(1);
}

const service = createClient(url, serviceKey, { auth: { persistSession: false } });

const ATTRIBUTES = ["hair","forehead","eyes","nose","lips","jawline","chest","arms","abs","hands","thighs","butt","feet"];
const randomScore = () => 1 + Math.floor(Math.random() * 10);

async function main() {
  // Find (and approve) the owner's active photo.
  const { data: photo, error: photoError } = await service
    .from("photos")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .maybeSingle();
  if (photoError || !photo) {
    console.error("No active photo for that user id. Upload one first.");
    process.exit(1);
  }
  await service.from("photos").update({ moderation: "approved" }).eq("id", photo.id);

  for (let index = 0; index < raterCount; index++) {
    // 1. A confirmed fake auth user (the profiles trigger fires automatically).
    const email = `seed-rater-${Date.now()}-${index}@example.com`;
    const { data: created, error: userError } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      password: `seed-${crypto.randomUUID()}`,
    });
    if (userError || !created.user) {
      console.error("Could not create seed user:", userError?.message);
      continue;
    }
    const raterId = created.user.id;

    // 2. An overall rating spread across the last 30 days.
    const createdAt = new Date(
      Date.now() - Math.floor(Math.random() * 30) * 86_400_000
    ).toISOString();
    const { data: rating, error: ratingError } = await service
      .from("ratings")
      .insert({ photo_id: photo.id, rater_id: raterId, score: randomScore(), created_at: createdAt })
      .select("id")
      .single();
    if (ratingError || !rating) {
      console.error("Rating insert failed:", ratingError?.message);
      continue;
    }

    // 3. Attribute scores for a random subset of attributes.
    const shuffled = [...ATTRIBUTES].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 3 + Math.floor(Math.random() * 6));
    const rows = chosen.map((attribute) => ({
      rating_id: rating.id,
      attribute,
      score: randomScore(),
    }));
    const { error: attrError } = await service.from("attribute_ratings").insert(rows);
    if (attrError) console.error("Attribute insert failed:", attrError.message);

    console.log(`rater ${index + 1}/${raterCount} done`);
  }

  console.log("\nVerify against the dashboard with:");
  console.log(`  select round(avg(score),1), count(*) from ratings where photo_id = '${photo.id}';`);
  console.log(`  select attribute, round(avg(ar.score),1), count(*) from attribute_ratings ar
    join ratings r on r.id = ar.rating_id where r.photo_id = '${photo.id}' group by attribute order by attribute;`);
}

main();
