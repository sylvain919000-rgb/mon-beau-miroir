"use client";

import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { copy } from "@/lib/copy";

const initialState: OnboardingState = { error: null };

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(completeOnboarding, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <Input
        label="Username"
        name="username"
        placeholder="e.g. sunny_amber"
        autoComplete="username"
        required
      />
      <Input label="Display name (optional)" name="display_name" placeholder="How others see you" />

      {/* Consents recorded server-side — the legal source of truth. */}
      <CheckboxField label={copy.signup.checkboxAge} name="age_ok" required />
      <CheckboxField label={copy.signup.checkboxTos} name="tos_ok" required />

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" loading={pending}>
        Enter Mon Beau Miroir
      </Button>
    </form>
  );
}
