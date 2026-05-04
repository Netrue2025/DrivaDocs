import { clsx } from "clsx";

const tones = {
  green: "bg-brand-50 text-brand-800 ring-brand-700/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-700/20",
  gray: "bg-slate-100 text-slate-700 ring-slate-500/20",
  red: "bg-red-50 text-red-700 ring-red-600/20"
};

export function Badge({
  children,
  tone = "green"
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span className={clsx("inline-flex rounded px-2.5 py-1 text-xs font-bold ring-1", tones[tone])}>
      {children}
    </span>
  );
}
