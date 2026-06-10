# Window World Appointment Assistant

> A production-quality appointment workflow app for window/door sales reps. Replace handwritten paperwork with a fast, mobile-first digital tool.

## Features

- **Appointment Dashboard** — Today's appointments, drafts, quotes, sold jobs, and warnings
- **Customer & Job Workflow** — Full customer info, job details, and estimator/installer notes
- **Opening Entry** — All fields: dimensions, united inches, product, colors, grid, glass, options, removal
- **Specialty Shape Support** — Circle top, eyebrow, quarter arch, custom shape with validation
- **Pricing Engine** — Editable pricing tables, united inches tiers, option/labor adders, tax, deposits
- **House Elevation Map** — 4-side visual mapper with numbered opening markers
- **Contract/PDF Export** — Generate printable PDF contracts, CSV opening schedules, JSON backups
- **Validation Warnings** — Real-time warnings for missing info, dimensions, pricing issues
- **Offline Drafts** — Local persistence so work survives browser refresh
- **Mobile-First** — iPad, phone, and desktop layouts

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example server/.env

# 3. Run database migration
npm run db:migrate

# 4. Seed demo data
npm run db:seed

# 5. Start dev servers
npm run dev
```

This starts:
- **Web app**: http://localhost:5173
- **API server**: http://localhost:3001

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | nedpearson@gmail.com | admin123 |
| Demo Rep | demo@windowworld.com | demo123 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Vanilla CSS (dark mode, glassmorphism) |
| State | Zustand + localStorage persistence |
| Routing | React Router 6 |
| Backend | Express 5 + TypeScript |
| Database | SQLite via Prisma |
| PDF | jsPDF |

## Project Structure

```
WindowWorldAssistant/
├── apps/web/           # React + Vite frontend
│   └── src/
│       ├── components/ # OpeningEditor, HouseMap, PricingReview, etc.
│       ├── pages/      # Dashboard, Appointments, AppointmentDetail, PricingAdmin
│       ├── store/      # Zustand auth & draft stores
│       └── utils/      # API client
├── server/             # Express + Prisma backend
│   ├── prisma/         # Schema, migrations, seed
│   └── src/routes/     # Auth, customers, appointments, openings, pricing, exports
└── package.json        # Monorepo workspace root
```

## Data Models

Users, Customers, Appointments, Openings, Opening Photos, Pricing Tables, Pricing Items, Quote Line Items, Contracts, Signatures, Payments, House Maps, House Map Markers, Audit Logs.

## Pricing Administration

Navigate to **Pricing Admin** in the sidebar. All pricing items are editable inline. Items marked `⚠ NEEDS_VERIFICATION` were estimated from source documents and should be confirmed with actual Window World pricing sheets.
