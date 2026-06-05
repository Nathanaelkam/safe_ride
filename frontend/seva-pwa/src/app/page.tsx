import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, MapPin, Headphones } from 'lucide-react';
import { AboutSection } from '@/components/about/AboutSection';
import { ContactSection } from '@/components/contact/ContactSection';

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-ink dark:bg-ink light:bg-white text-cream dark:text-cream light:text-ink">
      {/* Soft terracotta gradient wash */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-terracotta/15 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-[460px] w-[460px] rounded-full bg-ochre/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="px-6 lg:px-14 pt-10 pb-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <p className="font-display text-2xl tracking-tight text-cream dark:text-cream light:text-ink">Seva</p>
        <nav className="flex items-center gap-6 text-sm text-cream/70 dark:text-cream/70 light:text-ink/70">
          <Link href="/#about" className="hover:text-cream dark:hover:text-cream light:hover:text-ink transition-colors">About</Link>
          <Link href="/#contact" className="hover:text-cream dark:hover:text-cream light:hover:text-ink transition-colors">Contact</Link>
          <Link href="/login" className="hover:text-cream dark:hover:text-cream light:hover:text-ink transition-colors">Sign in</Link>
          <Link href="/register" className="btn-primary !py-2.5 !px-5 !text-sm">
            Begin
          </Link>
        </nav>
      </header>

      {/* Hero — asymmetric 12-col with editorial portrait */}
      <section className="px-6 lg:px-14 pt-12 pb-32 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-6 animate-reveal-up">A quiet kind of safety</p>

          <h1 className="font-display text-display-xl tracking-tight mb-8 animate-reveal-up">
            Safer rides,<br />
            <span className="italic text-cream/85">every</span>{' '}
            <span className="numeral text-terracotta">ride.</span>
          </h1>

          <p className="text-lg text-cream/65 dark:text-cream/65 light:text-ink/65 max-w-xl leading-relaxed mb-12 animate-reveal-up">
            Seva verifies your driver, watches the route, and reaches the people you trust
            the instant something feels off. No theatrics — just a circle of three, always.
          </p>

          <div className="flex flex-wrap items-center gap-4 animate-reveal-up">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2">
              Create my account <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn-ghost">
              I already have one
            </Link>
          </div>
        </div>

        {/* Editorial portrait — Yaoundé street, treated dark + terracotta wash */}
        <div className="lg:col-span-5 animate-reveal-up">
          <figure className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden border border-cream/10">
            <Image
              src="https://images.unsplash.com/photo-1659947234309-804b7fa01cf2?w=1200&q=85&auto=format&fit=crop"
              alt="A street scene at Carrefour Nlongkak in Yaoundé, Cameroon"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
            />
            {/* Dark wash for legibility + warmth */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
            <div className="absolute inset-0 bg-terracotta/12 mix-blend-multiply" />
            {/* Inset hairline */}
            <div className="absolute inset-3 ring-1 ring-inset ring-cream/15 rounded-2xl pointer-events-none" />

            {/* Editorial caption */}
            <figcaption className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55 dark:text-cream/55 light:text-ink/55 mb-1">
                  Carrefour Nlongkak
                </p>
                <p className="font-display text-lg tracking-tight leading-tight text-cream dark:text-cream light:text-ink">
                  Yaoundé,<br/>
                  <span className="italic text-cream/75 dark:text-cream/75 light:text-ink/75">at dusk.</span>
                </p>
              </div>
              <span className="numeral text-5xl text-terracotta leading-none">01</span>
            </figcaption>
          </figure>
          <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-cream/35 dark:text-cream/35 light:text-ink/35 text-right">
            Photo · Ariel Nathan ADA MBITA / Unsplash
          </p>
        </div>
      </section>

      {/* Three feature pillars — asymmetric editorial layout */}
      <section className="px-6 lg:px-14 pb-32 max-w-7xl mx-auto">
        <div className="hairline mb-16" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-3">
            <p className="eyebrow mb-2">What it does</p>
            <p className="font-display text-display-md tracking-tight">
              Three<br/>
              <span className="italic">small</span><br/>
              promises.
            </p>
          </div>

          <Feature
            num="01"
            icon={<ShieldCheck size={22} strokeWidth={1.5} />}
            title="Verified before you board"
            body="Driver identity, plate, and recent rating — surfaced before the door closes. If anything doesn't match, you'll know."
            className="lg:col-span-3 lg:mt-12"
          />
          <Feature
            num="02"
            icon={<MapPin size={22} strokeWidth={1.5} />}
            title="Route watched, quietly"
            body="Your trusted circle sees your route in real time, with deviation alerts if the path strays too far from the agreed one."
            className="lg:col-span-3"
          />
          <Feature
            num="03"
            icon={<Headphones size={22} strokeWidth={1.5} />}
            title="A codeword, your voice"
            body="A single spoken word — chosen by you — triggers a silent alert to your circle. No fumbling. No screen tap."
            className="lg:col-span-3 lg:mt-24"
          />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-6 lg:px-14 pb-20 max-w-7xl mx-auto">
        <div className="hairline mb-16" />
        <div className="mb-8">
          <h2 className="font-display text-2xl tracking-tight">
            <span className="numeral text-terracotta mr-3">04</span>About the team
          </h2>
        </div>
        <AboutSection />
      </section>

      {/* Contact Section */}
      <section id="contact" className="px-6 lg:px-14 pb-32 max-w-7xl mx-auto">
        <div className="hairline mb-16" />
        <div className="mb-8">
          <h2 className="font-display text-2xl tracking-tight">
            <span className="numeral text-terracotta mr-3">05</span>Get in touch
          </h2>
        </div>
        <ContactSection />
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-14 pb-10 max-w-7xl mx-auto">
        <div className="hairline mb-6" />
        <div className="flex flex-wrap justify-between gap-4 text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
          <p>© {new Date().getFullYear()} Seva. Built in Yaoundé.</p>
          <p className="font-mono text-cream/45 dark:text-cream/45 light:text-ink/45">v0.1 · editorial-preview</p>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  num, icon, title, body, className = '',
}: { num: string; icon: React.ReactNode; title: string; body: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-3 mb-5">
        <span className="numeral text-3xl text-terracotta">{num}</span>
        <span className="text-cream/40">{icon}</span>
      </div>
      <h3 className="font-display text-2xl tracking-tight mb-3">{title}</h3>
      <p className="text-sm text-cream/60 leading-relaxed">{body}</p>
    </div>
  );
}
