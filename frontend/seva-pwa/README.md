# Seva — Safer rides, every ride

> A real-time emergency tracking PWA for women in transit. Seva verifies your driver, watches the route, and reaches the people you trust the instant something feels off.

Built with Next.js 14 (App Router) + TypeScript + Tailwind, with an **editorial-luxe aesthetic** — warm ink black, cream, signature terracotta, Fraunces display type, asymmetric layouts, and a quietly insistent pulse ring on the SOS control.

---

## ✨ What's inside

### The signature moments
- **SOS button** — press-and-hold to confirm, three breathing concentric pulse rings, hold-progress arc rendered as SVG dasharray.
- **Voice trigger** — Web Speech API wrapper. Say your codeword ("lavender") aloud and your circle is alerted silently.
- **Tracking map** — `react-leaflet` over a dark Carto basemap, terracotta dashed route polyline, cream/ochre origin and destination markers.
- **Editorial dashboard** — asymmetric grids, serif numerals as ordinal markers (`01`, `02`, `03`), and hairline dividers in place of heavy borders.

### Pages
| Route | What it shows |
|---|---|
| `/` | Editorial landing page with three promise pillars |
| `/login`, `/register` | Auth flow with a permanent invocation sidebar |
| `/(dashboard)` | Home — greeting, quick actions, active trip strip, recent trips |
| `/(dashboard)/trip` | Live map, driver card, SOS, voice trigger, dispatch modal |
| `/(dashboard)/history` | Archive of completed rides with totals |
| `/(dashboard)/profile` | Voice codeword, emergency contacts, safety preferences |

### Design tokens
- **Palette** — `#0E0C0A` ink · `#F5EFE6` cream · `#E2725B` terracotta · `#6B8E6B` sage · `#D4A574` ochre
- **Type** — Fraunces (variable, axes: `opsz`/`SOFT`/`WONK`) for display · DM Sans for body · JetBrains Mono for coordinates/data
- **Grain overlay** — SVG `feTurbulence` noise at 6% opacity, `overlay` blend mode, fixed across viewport
- **Pulse ring** — three staggered `border` rings around the SOS control, `pulseRing` keyframes at 2.4s

### Architecture
```
src/
├── app/
│   ├── (auth)/       # login + register + shared invocation layout
│   └── (dashboard)/  # protected app surface
├── components/
│   ├── common/       # Button, Input, Card, Modal, StatusPill
│   ├── emergency/    # SOSButton, VoiceTrigger
│   ├── layout/       # Sidebar, TopNavigation
│   └── map/          # TrackingMap (dynamic-imported react-leaflet)
├── hooks/            # useGeolocation, useEmergencyContacts (localStorage-backed)
├── services/         # api.ts — mock REST surface
├── store/            # Zustand trip store
├── types/            # Shared TS types
├── utils/            # cn, format
└── __tests__/        # Jest + React Testing Library
```

---

## 🚀 Getting started

```bash
# Install
npm install

# Dev server
npm run dev          # → http://localhost:3000

# Tests
npm test
npm run test:watch

# Build
npm run build
npm start
```

> **Note:** `react-leaflet` is dynamically imported inside `TrackingMap.tsx` so SSR doesn't blow up on `window` access.

---

## 🧪 Tests

Four test files live under `src/__tests__/`:

- `utils/format.test.ts` — date/time, phone, and coordinate formatters
- `components/Button.test.tsx` — variants, sizes, disabled, click handling
- `components/SOSButton.test.tsx` — press-and-hold trigger with fake timers, cancellation, tap rejection
- `components/StatusPill.test.tsx` — tone variants

Run with `npm test`.

---

## 🔌 What's mocked vs. real

| Concern | Status |
|---|---|
| UI / interactions | Real |
| Map tiles (Carto) | Real CDN |
| Web Speech API | Real (browser-gated) |
| Geolocation | Real `navigator.geolocation` |
| Auth / trips / SOS dispatch | Mocked in `services/api.ts` — swap to your backend |
| Emergency contacts persistence | `localStorage` in the browser |

Wire `services/api.ts` to Supabase, a Node service, or whatever you ship behind the curtain.

---

## 🌍 PWA bits

`public/manifest.json` is wired into `<head>` via Next.js metadata. Drop your `icon-192.png` and `icon-512.png` into `public/icons/` before shipping. Add a service worker (Workbox or `next-pwa`) when you're ready for offline.

---

## 🪶 A note on the aesthetic

Seva is built around a single design hunch: emergency software shouldn't *feel* like emergency software. The cold-tech-blue safety-app trope reads as alarming before anything is actually wrong. So Seva borrows from editorial fashion magazines and Cameroonian terracotta instead — calm authority over panic, asymmetric type-driven layouts over dashboard grids, and a single signature emergency moment (the SOS pulse) that carries the urgent weight so the rest of the surface can stay quiet.

The headline framing — *a circle of three, a watcher of one* — runs through copy across the app. Three emergency contacts, three promise pillars on the landing, three rings on the SOS button.

---

## 📄 License

MIT — see `LICENSE` if you add one.
