import Link from 'next/link';
import { MapPin, ShieldAlert, Phone, Headphones, Plus, ArrowUpRight, Clock } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { StatusPill } from '@/components/common/StatusPill';
import { AboutSection } from '@/components/about/AboutSection';
import { ContactSection } from '@/components/contact/ContactSection';
import { api } from '@/services/api';
import { formatRelativeTime, formatTripDuration } from '@/utils/format';

export default async function DashboardHome() {
  const [activeTrip, history] = await Promise.all([
    api.fetchActiveTrip(),
    api.fetchHistory(),
  ]);

  const recent = history.slice(0, 3);

  return (
    <div className="space-y-14">
      {/* Editorial greeting */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-4">Good evening, Amara</p>
          <h1 className="font-display text-display-lg tracking-tight">
            Where to,<br/>
            <span className="italic">tonight?</span>
          </h1>
        </div>
        <div className="lg:col-span-5 lg:text-right">
          <p className="text-xs uppercase tracking-[0.22em] text-cream/45 mb-2">Watchers on standby</p>
          <p className="numeral text-6xl text-cream">03</p>
          <p className="text-sm text-cream/55 mt-1">all reached on average in 4s</p>
        </div>
      </section>

      <div className="hairline" />

      {/* Quick actions — asymmetric grid */}
      <section>
        <div className="flex items-baseline justify-between mb-7">
          <h2 className="font-display text-2xl tracking-tight">
            <span className="numeral text-terracotta mr-3">01</span>Begin a ride
          </h2>
          <p className="text-xs text-cream/45 uppercase tracking-[0.22em]">Quick actions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <QuickAction
            href="/trip"
            title="Start tracking"
            body="Open the live map and share your route with your circle."
            icon={<MapPin size={20} strokeWidth={1.5} />}
            tone="primary"
          />
          <QuickAction
            href="/trip"
            title="Voice arm"
            body="Activate your codeword listener. A single spoken word triggers your circle."
            icon={<Headphones size={20} strokeWidth={1.5} />}
          />
          <QuickAction
            href="/profile"
            title="Add a watcher"
            body="Widen your circle. Add up to five trusted contacts."
            icon={<Plus size={20} strokeWidth={1.5} />}
          />
        </div>

        {/* About Us Section */}
        <div className="hairline mt-14" />
        <div className="mt-14">
          <div className="mb-8">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="numeral text-terracotta mr-3">02</span>About the team
            </h2>
          </div>
          <AboutSection />
        </div>

        {/* Contact Us Section */}
        <div className="hairline mt-14" />
        <div className="mt-14">
          <div className="mb-8">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="numeral text-terracotta mr-3">03</span>Get in touch
            </h2>
          </div>
          <ContactSection />
        </div>
      </section>

      {/* Active trip (if any) */}
      {activeTrip && (
        <section>
          <div className="flex items-baseline justify-between mb-7">
            <h2 className="font-display text-2xl tracking-tight">
              <span className="numeral text-terracotta mr-3">04</span>On the road, right now
            </h2>
            <StatusPill tone="active" pulse>Trip live</StatusPill>
          </div>
          <Card className="!p-7">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7">
                <p className="eyebrow mb-2">From → To</p>
                <p className="font-display text-2xl tracking-tight">
                  {activeTrip.origin.label}
                </p>
                <p className="text-cream/45 text-sm my-1">↓ in motion</p>
                <p className="font-display text-2xl tracking-tight text-cream/85">
                  {activeTrip.destination.label}
                </p>
              </div>
              <div className="md:col-span-3">
                <p className="eyebrow mb-2">Duration</p>
                <p className="numeral text-4xl">{formatTripDuration(activeTrip.startedAt)}</p>
              </div>
              <div className="md:col-span-2 md:text-right">
                <Link href="/trip" className="btn-primary inline-flex items-center gap-2 !text-sm">
                  Open <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Recent trips */}
      <section>
        <div className="flex items-baseline justify-between mb-7">
          <h2 className="font-display text-2xl tracking-tight">
            <span className="numeral text-terracotta mr-3">{activeTrip ? '05' : '04'}</span>Recent trips
          </h2>
          <Link href="/history" className="text-xs uppercase tracking-[0.22em] text-cream/55 hover:text-cream">
            View all →
          </Link>
        </div>

        <div className="space-y-3">
          {recent.map((trip, i) => (
            <Link
              key={trip.id}
              href="/history"
              className="group flex items-center gap-6 rounded-2xl border border-cream/8 bg-ink-700/40 px-6 py-5 hover:border-cream/20 transition-colors"
            >
              <span className="numeral text-3xl text-cream/30 w-12">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg tracking-tight truncate">
                  {trip.origin.label} <span className="text-cream/40">→</span> {trip.destination.label}
                </p>
                <p className="text-xs text-cream/50 mt-1 flex items-center gap-3">
                  <Clock size={12} />
                  {formatRelativeTime(trip.startedAt)}
                  <span className="text-cream/25">·</span>
                  {formatTripDuration(trip.startedAt, trip.endedAt)}
                </p>
              </div>
              <p className="font-mono text-sm text-cream/55 hidden sm:block">
                {trip.fare ? `${trip.fare.toLocaleString()} XAF` : ''}
              </p>
              <ArrowUpRight size={16} className="text-cream/30 group-hover:text-cream transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* Tip strip */}
      <div className="hairline" />
      <div className="flex items-start gap-4 py-2 text-sm text-cream/55">
        <ShieldAlert size={18} className="text-terracotta shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="max-w-2xl">
          Tip — choose a codeword you'd never accidentally say in conversation.
          "Lavender" works better than "help".
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  href, title, body, icon, tone = 'default',
}: { href: string; title: string; body: string; icon: React.ReactNode; tone?: 'default' | 'primary' }) {
  const isPrimary = tone === 'primary';
  return (
    <Link
      href={href}
      className={`group block rounded-2xl p-6 border transition-all duration-300 ${
        isPrimary
          ? 'border-terracotta/40 bg-terracotta/8 hover:bg-terracotta/12 hover:-translate-y-0.5'
          : 'border-cream/10 bg-ink-700/40 hover:border-cream/25 hover:-translate-y-0.5'
      }`}
    >
      <div className={`mb-5 ${isPrimary ? 'text-terracotta' : 'text-cream/65'}`}>{icon}</div>
      <h3 className="font-display text-lg tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-cream/55 leading-relaxed">{body}</p>
      <p className={`mt-5 text-xs uppercase tracking-[0.22em] flex items-center gap-2 ${
        isPrimary ? 'text-terracotta' : 'text-cream/50 group-hover:text-cream'
      } transition-colors`}>
        Open <ArrowUpRight size={12} />
      </p>
    </Link>
  );
}
