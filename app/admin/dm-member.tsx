"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USERNAME_REGEX } from "@/lib/constants";

/**
 * Admin shortcut into any member's thread. Looks the username up first
 * so a typo gets a clear error instead of a 404. The actual free-send
 * privilege lives in the send_message RPC (migration 0008) — this is
 * just the door.
 */
export function DmMember() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openThread() {
    const target = username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(target)) {
      setError("Usernames are 3-24 characters: a-z, 0-9, underscore.");
      return;
    }
    setChecking(true);
    setError(null);

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", target)
      .maybeSingle();

    setChecking(false);
    if (!profile) {
      setError(`No member named @${target}.`);
      return;
    }
    router.push(`/inbox/${profile.username}`);
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") openThread();
            }}
            placeholder="e.g. chrisou"
          />
        </div>
        <Button onClick={openThread} loading={checking} disabled={!username.trim()}>
          Open thread
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Admins message without credits — use it for moderation and support
        outreach only.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
