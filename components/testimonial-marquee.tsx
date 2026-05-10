"use client";

import { useState } from "react";

type Testimonial = {
  name: string;
  role?: string | null;
  quote: string;
};

const previewLength = 170;

export function TestimonialMarquee({ testimonials }: { testimonials: Testimonial[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="testimonial-marquee mt-8 py-6">
      <div className="testimonial-marquee-track">
        {[...testimonials, ...testimonials].map((item, index) => {
          const key = `${item.name}-${index}`;
          const canExpand = item.quote.length > previewLength;
          const isExpanded = Boolean(expanded[key]);

          return (
            <article
              key={key}
              className="testimonial-marquee-card rounded border border-brand-900/10 bg-white p-5"
              style={{ animationDelay: `${index * -4.33}s` }}
            >
              <p className={`testimonial-quote leading-7 text-ink/70 ${isExpanded ? "is-expanded" : ""}`}>&ldquo;{item.quote}&rdquo;</p>
              {canExpand ? (
                <button
                  type="button"
                  onClick={() => setExpanded((current) => ({ ...current, [key]: !current[key] }))}
                  className="mt-3 text-sm font-black text-brand-700 transition hover:text-brand-900 focus-ring"
                >
                  {isExpanded ? "Read less" : "Read more"}
                </button>
              ) : null}
              <p className="mt-5 font-black">{item.name}</p>
              {item.role ? <p className="text-sm text-brand-700">{item.role}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
