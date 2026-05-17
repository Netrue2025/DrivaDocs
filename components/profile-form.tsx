"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";

type Profile = {
  name: string;
  email: string;
  phone: string;
  image: string | null;
};

type Status = "idle" | "loading" | "success" | "error";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { update } = useSession();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>("idle");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(profile.image);
  const initials = useMemo(() => {
    const source = profile.name || profile.email || "DD";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile.email, profile.name]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      body: new FormData(event.currentTarget)
    });

    if (response.ok) {
      setStatus("success");
      setMessage("Profile updated.");
      await update();
      router.refresh();
      return;
    }

    const payload = await response.json().catch(() => null);
    setStatus("error");
    setMessage(payload?.error || "Unable to update profile.");
  }

  async function onPasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPasswordStatus("loading");
    setPasswordMessage("");

    const formData = new FormData(form);
    const response = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword")
      })
    });

    if (response.ok) {
      setPasswordStatus("success");
      setPasswordMessage("Password updated.");
      form.reset();
      return;
    }

    const payload = await response.json().catch(() => null);
    setPasswordStatus("error");
    setPasswordMessage(payload?.error || "Unable to update password.");
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={onSubmit} className="rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-4">
            {preview ? (
              // The preview can be a temporary object URL from a local file input.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-road/70" />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-700 text-2xl font-black text-white ring-4 ring-road/70">
                {initials || "DD"}
              </span>
            )}
            <label className="grid gap-2 text-sm font-bold text-ink/75">
              Profile picture
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setPreview(URL.createObjectURL(file));
                }}
                className="max-w-full rounded border border-brand-900/15 p-2 text-sm focus-ring"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-ink/75">
            Full name
            <input name="name" defaultValue={profile.name} required className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/75">
            Email
            <input name="email" type="email" defaultValue={profile.email} required className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink/75">
            Phone number
            <input name="phone" defaultValue={profile.phone} className="min-h-11 rounded border border-brand-900/15 px-3 focus-ring" />
          </label>

          {message ? (
            <p className={status === "success" ? "text-sm font-bold text-brand-700" : "text-sm font-bold text-red-700"}>{message}</p>
          ) : null}
          <button type="submit" disabled={status === "loading"} className="min-h-11 rounded bg-brand-700 px-5 font-bold text-white hover:bg-brand-800 disabled:opacity-60">
            {status === "loading" ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>

      <form onSubmit={onPasswordSubmit} className="rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4">
          <div>
            <p className="text-sm font-black uppercase text-brand-700">Security</p>
            <h2 className="mt-1 text-xl font-black">Change password</h2>
          </div>
          <PasswordInput name="currentPassword" label="Current password" autoComplete="current-password" />
          <PasswordInput name="newPassword" label="New password" minLength={8} required autoComplete="new-password" />
          <PasswordInput name="confirmPassword" label="Confirm new password" minLength={8} required autoComplete="new-password" />
          {passwordMessage ? (
            <p className={passwordStatus === "success" ? "text-sm font-bold text-brand-700" : "text-sm font-bold text-red-700"}>{passwordMessage}</p>
          ) : null}
          <button type="submit" disabled={passwordStatus === "loading"} className="min-h-11 rounded bg-ink px-5 font-bold text-white hover:bg-brand-900 disabled:opacity-60">
            {passwordStatus === "loading" ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
