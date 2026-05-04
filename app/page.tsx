import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Car,
  ClipboardCheck,
  CreditCard,
  FileText,
  Headphones,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Truck
} from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { ScrollReveal } from "@/components/scroll-reveal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const services = [
  "Vehicle document renewal",
  "New vehicle registration",
  "Change of ownership",
  "Other vehicle papers/permits",
  "Local government papers",
  "Signage",
  "Reprint of faded number plate",
  "New driver's license",
  "Driver's license renewal",
  "International driver's license",
  "New motorcycle rider's license",
  "Motorcycle rider's license renewal"
];

const reasons = [
  { icon: ClipboardCheck, label: "Seamless process" },
  { icon: Truck, label: "Home/office delivery" },
  { icon: BadgeCheck, label: "75% upfront, 25% on delivery" },
  { icon: Bell, label: "Renewal reminders" },
  { icon: ShieldCheck, label: "Document verification links" },
  { icon: MessageCircle, label: "WhatsApp/call support" }
];

const howItWorks = [
  {
    icon: ClipboardCheck,
    title: "Choose a service",
    description: "Pick renewal, registration, ownership change, permits, licensing, or fleet support."
  },
  {
    icon: Car,
    title: "Add details",
    description: "Submit vehicle, driver, biodata, document, and delivery information in a guided flow."
  },
  {
    icon: CreditCard,
    title: "Pay securely",
    description: "Pay in full or start with 75% upfront while the remaining 25% stays for delivery."
  },
  {
    icon: Truck,
    title: "Track and receive",
    description: "Follow the request status, get renewal reminders, and receive documents at home or work."
  }
];

const fallbackFaqs = [
  {
    question: "Can DrivaDocs handle renewals for a fleet?",
    answer: "Yes. Business accounts can add multiple vehicles and drivers, then track compliance and bulk renewals from one dashboard."
  },
  {
    question: "Do I pay everything upfront?",
    answer: "You can pay fully or use the 75% upfront option, with the remaining 25% paid when the completed document is delivered."
  },
  {
    question: "Will I get reminders before documents expire?",
    answer: "Yes. Expiry dates are stored against vehicles and drivers so email, SMS, WhatsApp, and dashboard reminders can be triggered."
  }
];

const fallbackTestimonials = [
  {
    name: "Adeola Martins",
    role: "Fleet Manager",
    quote: "DrivaDocs helped us track renewals without chasing papers across different offices.",
    company: null,
    rating: 5
  },
  {
    name: "Chinedu Okafor",
    role: "Private vehicle owner",
    quote: "The pricing was clear, payment was simple, and my renewed documents arrived at my office.",
    company: null,
    rating: 5
  },
  {
    name: "Tola Adebayo",
    role: "Operations Lead",
    quote: "The process feels built for Nigerian vehicle owners who are tired of uncertainty.",
    company: null,
    rating: 5
  }
];

const partners = [
  {
    name: "AutoReg",
    logo: "/images/partners/autoreg.jpg"
  },
  {
    name: "Federal Road Safety Corps",
    logo: "/images/partners/frsc.png"
  },
  {
    name: "Vehicle Inspection Service",
    logo: "/images/partners/vis.png"
  },
  {
    name: "Nigerian Insurance Industry Portal",
    logo: "/images/partners/niip.png"
  }
];

async function getHomeContent() {
  const [managedFaqs, managedTestimonials] = await Promise.all([
    prisma.faqItem.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
      select: { question: true, answer: true }
    }).catch(() => []),
    prisma.testimonial.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: { name: true, role: true, company: true, quote: true, rating: true }
    }).catch(() => [])
  ]);

  return {
    faqs: managedFaqs.length ? managedFaqs : fallbackFaqs,
    testimonials: managedTestimonials.length ? managedTestimonials : fallbackTestimonials
  };
}

export default async function HomePage() {
  const { faqs, testimonials } = await getHomeContent();

  return (
    <>
      <section className="relative min-h-[620px] overflow-hidden bg-ink text-white">
        <Image
          src="/images/drivadocs-hero.png"
          alt="DrivaDocs vehicle documentation and home office delivery service"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/78 to-ink/12" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/38 via-transparent to-transparent" />
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="animate-rise max-w-3xl">
            <div className="inline-flex w-fit items-center gap-2 rounded bg-white/12 px-3 py-2 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur">
              <PackageCheck size={16} /> Fast documentation and delivery
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              DrivaDocs - Vehicle Documentation, Made Easy & Fast With Home/Office Delivery
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-white/78">
              Renew vehicle papers, register new vehicles, process licenses, manage permits,
              and receive completed documents without losing productive hours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" variant="primary">
                Get Started <ArrowRight className="ml-2" size={18} />
              </ButtonLink>
              <ButtonLink href="/pricing" variant="secondary">
                Check Pricing
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost">
                Contact Support
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <ScrollReveal>
      <section id="how-it-works" className="section-grid scroll-mt-24 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="Get vehicle papers in four clear steps"
            description="The flow is built to feel like a service desk in your pocket: choose, submit, pay, and track until delivery."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {howItWorks.map(({ icon: Icon, title, description }, index) => (
              <article
                key={title}
                className={`animate-rise interactive-lift rounded border border-brand-900/10 bg-white p-5 shadow-sm animate-rise-delay-${Math.min(index, 3)}`}
              >
                <div className="grid h-12 w-12 place-items-center rounded bg-brand-700 text-white">
                  <Icon size={24} />
                </div>
                <p className="mt-5 text-xl font-black">{title}</p>
                <p className="mt-3 text-sm leading-6 text-ink/62">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="section-road py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Services"
            title="All major vehicle documentation workflows in one place"
            description="Start with a pricing estimate, submit requirements, pay securely, track status, and receive completed documents."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service} className="interactive-lift flex items-center gap-3 rounded border border-brand-900/10 bg-white/95 p-4 shadow-sm backdrop-blur">
                <FileText className="text-brand-700" size={20} />
                <span className="font-semibold text-ink/78">{service}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="section-green-band py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why DrivaDocs"
            title="Built around convenience, transparency, and compliance"
            tone="inverse"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map(({ icon: Icon, label }) => (
              <div key={label} className="interactive-lift rounded border border-white/12 bg-white/10 p-5 backdrop-blur">
                <Icon className="text-road" size={28} />
                <p className="mt-4 text-lg font-black">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="section-green-band py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-black uppercase text-road">Discover DrivaDocs</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              See how simple vehicle documentation can feel
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-white/72">
              Watch a quick overview of the DrivaDocs process, from selecting a service
              to tracking documents and receiving delivery at home or work.
            </p>
          </div>
          <div className="overflow-hidden rounded border border-white/12 bg-ink shadow-soft">
            <div className="aspect-video">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/L3HmeV2P-5I"
                title="Discover DrivaDocs"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="section-document py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeading eyebrow="Partners" title="Agencies and verifiable partners" />
              <p className="mt-4 text-ink/65">We collaborate with trusted agencies and verifiable partners to ensure compliance and quality.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {partners.map((partner) => (
                <div key={partner.name} className="grid h-28 place-items-center rounded border border-brand-900/10 bg-white p-4 shadow-sm">
                  <Image
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    width={180}
                    height={90}
                    className="max-h-20 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="section-muted-map py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Testimonials" title="Trusted by individuals and fleet operators" />
          <div className="testimonial-marquee mt-8 py-6">
            <div className="testimonial-marquee-track">
              {[...testimonials, ...testimonials].map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                className="testimonial-marquee-card rounded border border-brand-900/10 bg-white p-5"
                style={{ animationDelay: `${index * -4.33}s` }}
              >
                <p className="leading-7 text-ink/70">"{item.quote}"</p>
                <p className="mt-5 font-black">{item.name}</p>
                <p className="text-sm text-brand-700">{item.role}</p>
              </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="section-road py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <SectionHeading eyebrow="FAQ" title="Quick answers before you start" />
            <div className="mt-6 flex gap-3">
              <ButtonLink href="/pricing" variant="primary" motion={false}>Estimate now</ButtonLink>
              <ButtonLink href="/contact" variant="ghost" motion={false}>Talk to support</ButtonLink>
            </div>
          </div>
          <div className="grid gap-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="interactive-lift rounded border border-brand-900/10 bg-white/95 p-5 shadow-sm backdrop-blur">
                <summary className="cursor-pointer font-black">{faq.question}</summary>
                <p className="mt-3 leading-7 text-ink/65">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="bg-brand-800 px-4 py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-3xl font-black">Ready to handle your next document?</p>
            <p className="mt-2 text-white/70">Get a transparent estimate and start your request in minutes.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup" variant="secondary">Get Started</ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              <Headphones className="mr-2" size={18} /> Support
            </ButtonLink>
          </div>
        </div>
      </section>
      </ScrollReveal>
    </>
  );
}
