import { SignupForm } from "@/components/auth/signup-form";
import { Suspense } from "react";

export const metadata = {
  title: "Sign up - DrivaDocs"
};

export default function SignupPage() {
  return (
    <section className="mx-auto grid max-w-6xl place-items-center px-4 py-12">
      <div className="w-full max-w-2xl rounded border border-brand-900/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-brand-700">Create account</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Start with an individual or business account</h1>
        <Suspense fallback={<div className="mt-6 h-56 rounded bg-brand-50" />}>
          <SignupForm />
        </Suspense>
      </div>
    </section>
  );
}
