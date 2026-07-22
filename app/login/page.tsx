import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { LoginForm } from "./login-form";
import { GlassSkeleton } from "@/components/fallbacks/glass-skeleton";

export default function LoginPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="font-display text-2xl text-ink">Welcome back</h1>
        {/* LoginForm reads ?next= via useSearchParams, so it must render
            inside a Suspense boundary to be prerender-safe. */}
        <Suspense fallback={<GlassSkeleton className="mt-6 h-64 w-full" />}>
          <LoginForm />
        </Suspense>
      </main>
    </>
  );
}
