# Kassenführung (Cash Register Management)

## Overview
Web-based app for tracking cash register open/close counts. Employees open a register with starting cash balance and close it with ending balance. Admin can view, filter, delete all entries and export to CSV.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui, routed with wouter
- **Backend**: Express.js with session-based admin auth
- **Database**: PostgreSQL via Drizzle ORM
- **Language**: TypeScript throughout

## Key Pages
- `/` - Home page with navigation to open/close register
- `/shift-start` - Open register (Kasse öffnen) with store selection and cash denomination counts
- `/shift-end` - Close register (Kasse schließen), compare totals, withdrawal recommendations
- `/admin/login` - Admin login (user: admin, pass: 321!)
- `/admin` - Admin dashboard with filters (store, status, employee), delete, details, CSV export

## Business Rules
- Each employee can have max one open register
- Store selection required: JP23, KP5, TS17
- Shift type selection required: Mittag, Abend
- Validation: End total must equal Start + Barumsatz - Barentnahme
- Warning if revenue > 0 but end total <= start total
- 14-day auto-cleanup throttled to once per hour
- Withdrawal recommendations: 100€ keep 0, 50€ keep max 2, 20€ keep max 10, 10€ keep max 10
- Denominations: 100€, 50€, 20€, 10€, 5€ bills; 2€, 1€ coins; 50ct, 20ct, 10ct

## Admin Features
- Filter by store, status (open/closed), employee name
- Delete individual entries with confirmation dialog
- View denomination details per entry
- CSV export of all entries
- Withdrawal recommendations shown per closed entry

## Data Model
- `shifts` table with storeName, start/end denomination counts (incl. 100€), totals, employee name, timestamps, status, cashRevenue, cashWithdrawal

## Running
- `npm run dev` starts both frontend (Vite) and backend (Express) on port 5000
- `npm run db:push` syncs schema to database
