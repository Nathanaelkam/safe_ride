import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden bg-ink dark:bg-ink light:bg-white text-cream dark:text-cream light:text-ink">
      {/* Editorial sidebar — visible md+ */}
      <aside className="hidden lg:flex lg:col-span-5 relative bg-ink-700/60 dark:bg-ink-700/60 light:bg-gray-50/60 border-r border-cream/8 dark:border-cream/8 light:border-ink/8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-terracotta/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-ochre/10 blur-3xl" />
        </div>

        <div className="flex flex-col justify-between p-14 w-full">
          <Link href="/" className="font-display text-2xl tracking-tight text-cream dark:text-cream light:text-ink">Seva</Link>

          <div>
            <p className="eyebrow mb-6">An invocation</p>
            <p className="font-display text-display-lg tracking-tight max-w-md leading-[1.05] text-cream dark:text-cream light:text-ink">
              <span className="italic">She</span> rides,<br/>
              <span className="numeral text-terracotta">three</span> watch,<br/>
              <span className="italic text-cream/80 dark:text-cream/80 light:text-ink/80">none</span> alone.
            </p>
            <p className="mt-8 text-sm text-cream/55 dark:text-cream/55 light:text-ink/55 max-w-sm leading-relaxed">
              A quiet promise between you and the people who love you. Seva does the watching, so they can sleep.
            </p>
          </div>

          <p className="text-xs text-cream/40 dark:text-cream/40 light:text-ink/40 font-mono">No drama. Just attentive software.</p>
        </div>
      </aside>

      {/* Form column */}
      <section className="col-span-1 lg:col-span-7 flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          {children}
        </div>
      </section>
    </div>
  );
}
