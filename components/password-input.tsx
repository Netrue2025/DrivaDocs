"use client";

import { useState } from "react";
import type React from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  labelClassName?: string;
  inputClassName?: string;
};

export function PasswordInput({
  label,
  labelClassName = "grid gap-2 text-sm font-bold text-ink/75",
  inputClassName = "min-h-11 rounded border border-brand-900/15 px-3 pr-11 focus-ring",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <label className={labelClassName}>
      {label}
      <span className="relative block">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={`${inputClassName} w-full`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-ink/55 transition hover:bg-brand-50 hover:text-brand-800"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <Icon size={18} />
        </button>
      </span>
    </label>
  );
}
