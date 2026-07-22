"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { copy } from "@/lib/copy";

/**
 * Signup with three methods, all gated behind the two consent checkboxes.
 * The checkboxes are re-confirmed and persisted server-side during
 * onboarding, so OAuth users are covered even if they land via /login.
 */
export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [tosOk, setTosOk] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "magic-sent" | "confirm-email">("idle");
  const [error, setError] = useState<string | null>(null);

  const consentsGiven = ageOk && tosOk;

  /** Computed lazily so it only runs in the browser, never during prerender. */
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function signUpWithPassword() {
    setStatus("busy");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("confirm-email");
    }
  }

  async function signUpWithMagicLink() {
    setStatus("busy");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    } else {
      setStatus("magic-sent");
    }
  }

  async function signUpWithGoogle() {
    setStatus("busy");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setError(error.message);
      setStatus("idle");
    }
  }

  if (status === "magic-sent") {
    return <p className="mt-6 text-sm text-success">Check your email — your sign-in link is on its way.</p>;
  }
  if (status === "confirm-email") {
    return <p className="mt-6 text-sm text-success">Almost there — confirm your email to activate your account.</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <CheckboxField
        label={copy.signup.checkboxAge}
        checked={ageOk}
        onChange={(e) => setAgeOk(e.target.checked)}
      />
      <CheckboxField
        label={copy.signup.checkboxTos}
        checked={tosOk}
        onChange={(e) => setTosOk(e.target.checked)}
      />

      {!consentsGiven && (
        <p className="text-xs text-ink-faint">Tick both boxes to choose a sign-up method.</p>
      )}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Password (for the password option)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        onClick={signUpWithPassword}
        disabled={!consentsGiven || !email || password.length < 8}
        loading={status === "busy"}
      >
        Sign up with password
      </Button>
      <Button
        variant="ghost"
        onClick={signUpWithMagicLink}
        disabled={!consentsGiven || !email}
        loading={status === "busy"}
      >
        Email me a magic link
      </Button>
      <Button
        variant="ghost"
        onClick={signUpWithGoogle}
        disabled={!consentsGiven}
        loading={status === "busy"}
      >
        Continue with Google
      </Button>
    </div>
  );
}
