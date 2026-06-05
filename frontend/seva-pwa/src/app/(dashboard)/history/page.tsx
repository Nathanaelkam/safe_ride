import { ArrowUpRight, Star } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { StatusPill } from '@/components/common/StatusPill';
import { api } from '@/services/api';
import { formatRelativeTime, formatTripDuration } from '@/utils/format';

export default async function HistoryPage() {
  const history = await api.fetchHistory();

  const totalMinutes = history.reduce((acc, t) => {
    const end = t.endedAt ?? t.startedAt;
    return acc + Math.round((end - t.startedAt) / 60_000);
  }, 0);

  const totalFare = history.reduce((acc, t) => acc + (t.fare ?? 0), 0);

  return (
    <div className="space-y-12">
      {/* Header */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-3">An archive of safe arrivals</p>
          <h1 className="font-display text-display-lg tracking-tight">
            <span className="numeral text-terracotta">{String(history.length).padStart(2, '0')}</span>{' '}
            <span className="italic">rides</span> watched.
          </h1>
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-5">
          <div>
            <p className="eyebrow mb-1">Total minutes</p>
            <p className="numeral text-4xl">{totalMinutes}</p>
          </div>
          <div>
            <p className="eyebrow mb-1">Spent (XAF)</p>
            <p className="numeral text-4xl">{totalFare.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <div className="hairline" />

      {/* Editorial trip list */}
      <section className="space-y-4">
        {history.map((trip, i) => (
          <Card key={trip.id} className="!p-7 group hover:border-cream/20 transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-1">
                <span className="numeral text-4xl text-cream/30">
                  {String(history.length - i).padStart(2, '0')}
                </span>
              </div>

              <div className="md:col-span-5">
                <p className="font-display text-xl tracking-tight leading-tight">
                  {trip.origin.label}
                </p>
                <p className="text-cream/40 text-sm my-0.5">↓</p>
                <p className="font-display text-xl tracking-tight leading-tight text-cream/85">
                  {trip.destination.label}
                </p>
              </div>

              <div className="md:col-span-3">
                <p className="eyebrow mb-1">When</p>
                <p className="text-sm text-cream/75">{formatRelativeTime(trip.startedAt)}</p>
                <p className="text-xs text-cream/45 mt-0.5">
                  {formatTripDuration(trip.startedAt, trip.endedAt)} · {trip.driver?.name}
                </p>
              </div>

              <div className="md:col-span-2 md:text-right">
                <StatusPill tone="safe">Completed</StatusPill>
                {trip.driver && (
                  <p className="mt-2 flex items-center justify-end gap-1.5 text-xs text-cream/55">
                    <Star size={11} className="text-ochre fill-ochre" />
                    {trip.driver.rating.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="md:col-span-1 md:text-right">
                <button
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-cream/15 text-cream/55 hover:text-cream hover:border-cream/40 transition-colors"
                  aria-label="View details"
                >
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <div className="hairline" />

      <p className="text-center text-xs text-cream/40 font-mono">
        End of archive · {history.length} entries · synced moments ago
      </p>
    </div>
  );
}
