'use client';
import { useState } from 'react';
import { Phone, Plus, Trash2, ShieldCheck, User2, Edit3, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import type { EmergencyContact } from '@/types';
import { formatPhone } from '@/utils/format';

const initialContacts: EmergencyContact[] = [
  { id: 'c1', name: 'Sister Bih', relation: 'Sister', phone: '+237 677 442 199', isPrimary: true },
  { id: 'c2', name: 'Mama Florence', relation: 'Mother', phone: '+237 699 008 312' },
  { id: 'c3', name: 'Tanto Eric', relation: 'Uncle', phone: '+237 651 220 904' },
];

export default function ProfilePage() {
  const { theme, toggleTheme } = useTheme();
  const { contacts, addContact, removeContact } = useEmergencyContacts(initialContacts);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [codeword, setCodeword] = useState('lavender');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    addContact({ name: name.trim(), relation: relation.trim() || 'Contact', phone: phone.trim() });
    setName(''); setRelation(''); setPhone('');
    setModalOpen(false);
  }

  return (
    <div className="space-y-14">
      {/* Editorial header */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-3">Your circle</p>
          <h1 className="font-display text-display-lg tracking-tight">
            Your trusted<br/>
            <span className="italic">circle of safety</span>.
          </h1>
        </div>
        <div className="lg:col-span-5 lg:text-right">
          <div className="inline-flex items-center gap-4 rounded-2xl border border-cream/10 px-5 py-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-terracotta to-ochre flex items-center justify-center font-display text-lg">
              A
            </div>
            <div className="text-left">
              <p className="font-display text-lg tracking-tight">Amara Nkeng</p>
              <p className="text-xs text-cream/55">+237 670 112 880</p>
            </div>
            <button aria-label="Edit profile" className="ml-3 text-cream/55 hover:text-cream">
              <Edit3 size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="hairline" />

      {/* Voice codeword */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-3">
            <span className="numeral text-terracotta mr-2">01</span>Voice codeword
          </p>
          <h2 className="font-display text-2xl tracking-tight mb-3">
            One word.<br/><span className="italic">Yours.</span>
          </h2>
          <p className="text-sm text-cream/55 leading-relaxed">
            Said out loud during a ride, this word silently alerts your circle. Choose one you'd never use casually.
          </p>
        </div>
        <Card className="lg:col-span-8 !p-7">
          <p className="eyebrow mb-2">Current codeword</p>
          <p className="font-display text-display-md tracking-tight mb-6 italic">
            "{codeword}"
          </p>
          <Input
            label="Change codeword"
            name="codeword"
            value={codeword}
            onChange={(e) => setCodeword(e.target.value)}
            placeholder="something unforgettable"
            hint="One distinctive word works best. Avoid common phrases."
          />
        </Card>
      </section>

      {/* Emergency contacts */}
      <section>
        <div className="flex items-baseline justify-between mb-7">
          <h2 className="font-display text-2xl tracking-tight">
            <span className="numeral text-terracotta mr-3">02</span>Emergency contacts
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary !text-sm inline-flex items-center gap-2"
          >
            <Plus size={14} /> Add contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <Card className="text-center !py-12">
            <p className="font-display text-xl tracking-tight mb-2">No watchers yet.</p>
            <p className="text-cream/55 text-sm">Add at least one person you'd want to know if something felt off.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((c, i) => (
              <Card key={c.id} className="!p-6 group">
                <div className="flex items-start gap-4">
                  <span className="numeral text-3xl text-cream/25 leading-none w-10 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-display text-xl tracking-tight">{c.name}</p>
                      {c.isPrimary && <StatusPill tone="active">Primary</StatusPill>}
                    </div>
                    <p className="text-sm text-cream/55 mb-3">{c.relation}</p>
                    <p className="flex items-center gap-2 text-sm text-cream/75 font-mono">
                      <Phone size={12} className="text-cream/45" />
                      {formatPhone(c.phone)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeContact(c.id)}
                    aria-label={`Remove ${c.name}`}
                    className="text-cream/35 hover:text-terracotta transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Safety preferences */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <p className="eyebrow mb-3">
            <span className="numeral text-terracotta mr-2">03</span>Preferences
          </p>
          <h2 className="font-display text-2xl tracking-tight mb-3">
            Small choices.<br/><span className="italic">Big peace of mind.</span>
          </h2>
        </div>
        <div className="lg:col-span-8 space-y-3">
          <ThemeToggleRow theme={theme} onToggle={toggleTheme} />
          <PreferenceRow
            title="Notify on route deviation"
            description="Your circle is pinged if the driver strays more than 500m from the agreed route."
            defaultOn
          />
          <PreferenceRow
            title="Auto-record audio on SOS"
            description="When SOS fires, your phone begins recording locally for evidence."
            defaultOn
          />
          <PreferenceRow
            title="Share location continuously while in motion"
            description="High accuracy GPS pings every 10 seconds while a trip is active."
          />
        </div>
      </section>

      {/* Add contact modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add to your circle">
        <form onSubmit={handleAdd} className="space-y-6">
          <Input
            label="Their name"
            name="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Mama Florence"
          />
          <Input
            label="Relation"
            name="contact-relation"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            placeholder="Sister, partner, friend"
          />
          <Input
            label="Phone"
            name="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="+237 6xx xxx xxx"
          />
          <Button type="submit" fullWidth size="lg">Add to circle</Button>
        </form>
      </Modal>
    </div>
  );
}

function ThemeToggleRow({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  return (
    <div className="flex items-start gap-5 rounded-2xl border border-cream/8 bg-ink-700/40 px-6 py-5">
      <Palette size={18} className="text-cream/50 mt-1 shrink-0" strokeWidth={1.5} />
      <div className="flex-1">
        <p className="font-display text-base tracking-tight">Theme mode</p>
        <p className="text-xs text-cream/55 mt-1 leading-relaxed">Switch between light and dark appearance modes.</p>
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={theme === 'dark'}
        className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
          theme === 'dark' ? 'bg-terracotta' : 'bg-cream/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-transform ${
            theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function PreferenceRow({
  title, description, defaultOn = false,
}: { title: string; description: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start gap-5 rounded-2xl border border-cream/8 bg-ink-700/40 px-6 py-5">
      <ShieldCheck size={18} className="text-cream/50 mt-1 shrink-0" strokeWidth={1.5} />
      <div className="flex-1">
        <p className="font-display text-base tracking-tight">{title}</p>
        <p className="text-xs text-cream/55 mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={() => setOn(!on)}
        role="switch"
        aria-checked={on}
        className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
          on ? 'bg-terracotta' : 'bg-cream/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
