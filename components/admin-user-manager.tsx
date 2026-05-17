"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Trash2, X } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import { Badge } from "@/components/ui/badge";

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  accountType: string;
  isActive: boolean;
  emailVerified: string | Date | null;
  createdAt: string | Date;
  businessAccount: {
    companyName: string;
    contactPerson: string;
    registrationNumber: string | null;
    taxId: string | null;
    officeAddress: string;
    fleetSize: number;
  } | null;
  _count: {
    requests: number;
    vehicles: number;
    drivers: number;
  };
};

export function AdminUserManager({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [active, setActive] = useState<AdminUserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [accountType, setAccountType] = useState("INDIVIDUAL");

  useEffect(() => {
    setAccountType(active?.accountType || "INDIVIDUAL");
  }, [active]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || saving) return;

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      role: String(formData.get("role") || "USER"),
      accountType: String(formData.get("accountType") || "INDIVIDUAL"),
      isActive: formData.get("isActive") === "true",
      emailVerified: formData.get("emailVerified") === "true",
      password: String(formData.get("password") || ""),
      businessAccount: {
        companyName: String(formData.get("companyName") || ""),
        contactPerson: String(formData.get("contactPerson") || ""),
        registrationNumber: String(formData.get("registrationNumber") || ""),
        taxId: String(formData.get("taxId") || ""),
        officeAddress: String(formData.get("officeAddress") || ""),
        fleetSize: Number(formData.get("fleetSize") || 0)
      }
    };

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || "Unable to update this user.");
        return;
      }
      setActive(body);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function setAccess(isActive: boolean) {
    if (!active || saving) return;
    const payload = {
      name: active.name || "",
      email: active.email,
      phone: active.phone || "",
      role: active.role,
      accountType: active.accountType,
      isActive,
      emailVerified: Boolean(active.emailVerified),
      password: "",
      businessAccount: active.businessAccount || undefined
    };

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || "Unable to update user access.");
        return;
      }
      setActive(body);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!active || active.isActive || active.id === currentUserId || deleting) return;
    if (!window.confirm(`Delete ${active.email} and all linked business data?`)) return;

    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${active.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || "Unable to delete this user.");
        return;
      }
      setActive(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="min-w-0 rounded border border-brand-900/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase text-brand-700">Users</p>
            <h2 className="mt-1 text-xl font-black">Verification and access control</h2>
          </div>
          <p className="rounded bg-brand-50 px-3 py-2 text-sm font-black text-brand-800">{users.length} users</p>
        </div>

        <div className="mt-5 overflow-x-auto rounded border border-brand-900/10">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-brand-50 text-ink/65">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Account</th>
                <th className="p-3">Activity</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Access</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} onClick={() => setActive(user)} className="cursor-pointer border-b border-brand-900/10 transition hover:bg-brand-50/55">
                  <td className="p-3">
                    <p className="font-bold">{user.name || "Unnamed user"}</p>
                    <p className="text-xs text-ink/55">{user.email}</p>
                    {user.phone ? <p className="text-xs text-ink/45">{user.phone}</p> : null}
                  </td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">{user.accountType}</td>
                  <td className="p-3 text-ink/62">
                    {user._count.requests} requests, {user._count.vehicles} vehicles, {user._count.drivers} drivers
                  </td>
                  <td className="p-3">
                    {user.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}
                  </td>
                  <td className="p-3">
                    {user.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                  </td>
                  <td className="p-3">
                    <PencilLine size={16} className="text-brand-700" aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length ? <p className="rounded bg-brand-50 p-4 text-sm font-semibold text-ink/65">No users found.</p> : null}
        </div>
      </section>

      {active ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/65 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand-900/10 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-brand-700">User profile</p>
                <h2 className="mt-1 break-words text-xl font-black">{active.name || active.email}</h2>
                <p className="mt-1 break-words text-sm font-semibold text-ink/55">{active.email}</p>
              </div>
              <button type="button" onClick={() => setActive(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded border border-brand-900/15 text-ink" aria-label="Close user profile">
                <X size={18} />
              </button>
            </div>

            <div className="grid min-w-0 gap-4 p-4 sm:p-5 md:grid-cols-2">
              <Input name="name" label="Full name" defaultValue={active.name || ""} />
              <Input name="email" label="Email" defaultValue={active.email} required type="email" />
              <Input name="phone" label="Phone" defaultValue={active.phone || ""} />
              <Input name="password" label="New password" type="password" minLength={8} placeholder="Leave blank to keep current password" />
              <Select name="role" label="Role" defaultValue={active.role} options={["USER", "BUSINESS", "ADMIN", "SUPER_ADMIN"]} />
              <Select name="accountType" label="Account type" defaultValue={active.accountType} options={["INDIVIDUAL", "BUSINESS"]} onChange={setAccountType} />
              <Select name="emailVerified" label="Email verification" defaultValue={active.emailVerified ? "true" : "false"} options={[["true", "Verified"], ["false", "Pending"]]} />
              <Select name="isActive" label="Access" defaultValue={active.isActive ? "true" : "false"} options={[["true", "Active"], ["false", "Inactive"]]} />

              {accountType === "BUSINESS" ? (
                <div className="rounded border border-brand-900/10 bg-brand-50/45 p-4 md:col-span-2">
                  <p className="text-sm font-black uppercase text-brand-700">Business account</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Input name="companyName" label="Company name" defaultValue={active.businessAccount?.companyName || ""} />
                    <Input name="contactPerson" label="Contact person" defaultValue={active.businessAccount?.contactPerson || ""} />
                    <Input name="registrationNumber" label="Registration number" defaultValue={active.businessAccount?.registrationNumber || ""} />
                    <Input name="taxId" label="Tax ID" defaultValue={active.businessAccount?.taxId || ""} />
                    <Input name="fleetSize" label="Fleet size" type="number" min={0} defaultValue={String(active.businessAccount?.fleetSize || 0)} />
                    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75 md:col-span-2">
                      Office address
                      <textarea name="officeAddress" defaultValue={active.businessAccount?.officeAddress || ""} rows={3} className="min-w-0 rounded border border-brand-900/15 bg-white p-3 focus-ring" />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="rounded border border-brand-900/10 p-4 text-sm md:col-span-2">
                <p className="font-black">Activity</p>
                <p className="mt-2 text-ink/62">
                  {active._count.requests} requests, {active._count.vehicles} vehicles, {active._count.drivers} drivers
                </p>
                <p className="mt-1 text-ink/50">Created {new Date(active.createdAt).toLocaleDateString("en-NG")}</p>
              </div>

              {error ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 md:col-span-2">{error}</p> : null}
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-brand-900/10 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button
                type="button"
                onClick={deleteUser}
                disabled={active.isActive || active.id === currentUserId || deleting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-red-200 px-4 font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete inactive user"}
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setAccess(!active.isActive)}
                  disabled={active.id === currentUserId || saving}
                  className={`min-h-11 rounded px-5 font-black disabled:cursor-not-allowed disabled:opacity-45 ${active.isActive ? "bg-red-700 text-white" : "bg-road text-ink"}`}
                >
                  {active.isActive ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => setActive(null)} className="min-h-11 rounded border border-brand-900/15 px-5 font-black">
                  Close
                </button>
                <button type="submit" disabled={saving} className="min-h-11 rounded bg-brand-700 px-5 font-black text-white disabled:opacity-60">
                  {saving ? "Saving..." : "Update user"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  if (props.type === "password") {
    const { type: _type, ...passwordProps } = props;
    return (
      <PasswordInput
        {...passwordProps}
        label={label}
        labelClassName="grid min-w-0 gap-2 text-sm font-bold text-ink/75"
        inputClassName="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 pr-11 focus-ring"
      />
    );
  }

  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label}
      <input {...props} className="min-h-11 min-w-0 rounded border border-brand-900/15 px-3 focus-ring" />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  options,
  onChange
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[] | [string, string][];
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-ink/75">
      {label}
      <select name={name} defaultValue={defaultValue} onChange={(event) => onChange?.(event.target.value)} className="min-h-11 min-w-0 rounded border border-brand-900/15 bg-white px-3 focus-ring">
        {options.map((option) => {
          const value = Array.isArray(option) ? option[0] : option;
          const labelText = Array.isArray(option) ? option[1] : option;
          return <option key={value} value={value}>{labelText}</option>;
        })}
      </select>
    </label>
  );
}
