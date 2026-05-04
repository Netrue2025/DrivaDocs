import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Log in - DrivaDocs"
};

export default function LoginPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-220px)] max-w-6xl place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded border border-brand-900/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-black uppercase text-brand-700">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Log in to DrivaDocs</h1>
        <Suspense fallback={<div className="mt-6 h-40 rounded bg-brand-50" />}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
