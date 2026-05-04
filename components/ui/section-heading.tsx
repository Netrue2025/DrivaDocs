export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "default"
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: "default" | "inverse";
}) {
  const eyebrowClass = tone === "inverse" ? "text-road" : "text-brand-700";
  const titleClass = tone === "inverse" ? "text-white" : "text-ink";
  const descriptionClass = tone === "inverse" ? "text-white/70" : "text-ink/65";

  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className={`text-sm font-black uppercase ${eyebrowClass}`}>{eyebrow}</p> : null}
      <h2 className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${titleClass}`}>{title}</h2>
      {description ? <p className={`mt-4 text-base leading-7 ${descriptionClass}`}>{description}</p> : null}
    </div>
  );
}
