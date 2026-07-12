# SENTRA FX

**Smart Entry, Neural Technical Risk Analyzer**

AI-assisted forex scalping and risk management platform. Analyzes one currency pair at a time, generates technical trading signals with a confluence-based trust score, and supports paper trading with single-position enforcement.

> **Important:** The trust score is a technical confluence score — not a guaranteed win probability.

## Phase 1 MVP (Current)

- Secure login (Supabase Auth)
- Responsive PWA dashboard
- Mock market data (EURUSD and major pairs)
- Multi-timeframe analysis (M1, M5, M15, H1)
- Technical indicators: EMA, RSI, MACD, ADX, ATR, Bollinger Bands
- Trust-score engine with weighted confluence breakdown
- Signal alerts (in-app sound + browser notifications)
- Paper trading with single-position enforcement
- Distributed order lock + idempotency keys
- Trade journal and basic analytics
- Emergency stop
- Broker adapter interface (Mock + cTrader stub)
- Backtesting foundation
- Supabase database schema with RLS

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Charts | Lightweight Charts |
| Data fetching | TanStack Query |
| Validation | Zod |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Broker | IC Markets cTrader (OAuth — Phase 6) |

## Getting Started

```bash
npm install
cp .env.example .env.local
# Add Supabase credentials, or run without them for demo mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase configured, the app runs in demo mode — sign in with any credentials to access the dashboard.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
├── components/             # UI components
├── lib/                    # Supabase clients, settings store
├── modules/
│   ├── auth/
│   ├── broker/             # BrokerAdapter interface + Mock + cTrader stub
│   ├── market-data/
│   ├── technical-analysis/
│   ├── signal-engine/
│   ├── risk-engine/
│   ├── order-engine/
│   ├── notifications/
│   ├── backtesting/
│   ├── trade-journal/
│   └── audit/
└── types/
supabase/migrations/        # Database schema
```

## Core Modules

### Broker Adapter

```typescript
interface BrokerAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<TradingAccount[]>;
  getQuote(symbol: string): Promise<Quote>;
  placeOrder(order: OrderRequest): Promise<BrokerOrderResult>;
  // ...
}
```

- `MockBrokerAdapter` — active for Phase 1
- `CTraderBrokerAdapter` — stub for Phase 6 demo integration

### Trading Modes (Roadmap)

1. **Analysis Only** — signals only
2. **Paper Trading** — current MVP default
3. **Demo Broker** — cTrader demo (Phase 6)
4. **Live Manual** — Phase 8
5. **Live Automatic** — Phase 9 (disabled by default)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market?type=quote` | Live quote |
| GET | `/api/analysis?endpoint=current` | Full analysis |
| GET | `/api/signals?type=current` | Current signal |
| POST | `/api/trading` | Place order, emergency stop |
| GET | `/api/broker?type=connection` | Broker status |
| GET/PUT | `/api/settings` | User settings |

## Database Setup

Apply the migration to your Supabase project:

```bash
supabase db push
# or apply supabase/migrations/20260312100000_initial_schema.sql manually
```

## Development Phases

| Phase | Status |
|-------|--------|
| 1 — Application Foundation | ✅ Current |
| 2 — Market Data & Charts | ✅ Mock data |
| 3 — Rule-Based Analysis Engine | ✅ |
| 4 — Alerts & Paper Trading | ✅ |
| 5 — Backtesting | 🔶 Foundation |
| 6 — cTrader Demo Integration | ⬜ |
| 7 — Demo Automatic Trading | ⬜ |
| 8 — Live Manual Trading | ⬜ |
| 9 — Live Automatic Trading | ⬜ |

## Safety Principles

- One pair, one position maximum
- No martingale, grid, or recovery strategies
- Emergency stop always available
- Automatic mode disabled by default
- All orders require idempotency keys
- Trust score labeled as technical confluence, not probability

## License

Private — All rights reserved.
