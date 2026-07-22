"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/me";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "magic-sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function logInWithPassword() {
    setStatus("busy");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      router.push(next);
      router.refresh();
    }
  }

  async function logInWithMagicLink() {
    setStatus("busy");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("magic-sent");
    }
  }

  async function logInWithGoogle() {
    setStatus("busy");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    }
  }

  if (status === "magic-sent") {
    return <p className="mt-6 text-sm text-success">Check your email — your sign-in link is on its way.</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={logInWithPassword} disabled={!email || !password} loading={status === "busy"}>
        Log in
      </Button>
      <Button variant="ghost" onClick={logInWithMagicLink} disabled={!email} loading={status === "busy"}>
        Email me a magic link
      </Button>
      <Button variant="ghost" onClick={logInWithGoogle} loading={status === "busy"}>
        Continue with Google
      </Button>
    </div>
  );
}
