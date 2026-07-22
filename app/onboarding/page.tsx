import { AppNav } from "@/components/app-nav";
import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="font-display text-2xl text-ink">Pick your name</h1>
        <p className="mt-2 text-sm text-ink-soft">
          One last step before your mirror goes up.
        </p>
        <OnboardingForm />
      </main>
    </>
  );
}
