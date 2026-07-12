-- SENTRA FX Database Schema — Phase 1 Foundation
-- Enable RLS on all tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Broker connections
CREATE TABLE IF NOT EXISTS public.broker_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  broker TEXT NOT NULL DEFAULT 'IC Markets',
  platform TEXT NOT NULL DEFAULT 'cTrader',
  environment TEXT NOT NULL CHECK (environment IN ('demo', 'live')),
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'disconnected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own broker connections" ON public.broker_connections
  FOR ALL USING (auth.uid() = user_id);

-- Trading accounts
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broker_connection_id UUID NOT NULL REFERENCES public.broker_connections(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL,
  account_currency TEXT DEFAULT 'USD',
  balance DECIMAL(18, 2) DEFAULT 0,
  equity DECIMAL(18, 2) DEFAULT 0,
  free_margin DECIMAL(18, 2) DEFAULT 0,
  leverage INTEGER DEFAULT 500,
  is_selected BOOLEAN DEFAULT FALSE,
  synchronized_at TIMESTAMPTZ
);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trading accounts" ON public.trading_accounts
  FOR ALL USING (
    broker_connection_id IN (
      SELECT id FROM public.broker_connections WHERE user_id = auth.uid()
    )
  );

-- Trading settings
CREATE TABLE IF NOT EXISTS public.trading_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  selected_symbol TEXT DEFAULT 'EURUSD',
  trading_mode TEXT DEFAULT 'paper',
  manual_threshold INTEGER DEFAULT 60,
  automatic_threshold INTEGER DEFAULT 75,
  risk_percent DECIMAL(5, 2) DEFAULT 1.0,
  daily_loss_percent DECIMAL(5, 2) DEFAULT 3.0,
  daily_profit_lock_percent DECIMAL(5, 2) DEFAULT 5.0,
  maximum_trades_per_day INTEGER DEFAULT 5,
  maximum_consecutive_losses INTEGER DEFAULT 3,
  maximum_spread DECIMAL(10, 6) DEFAULT 0.0003,
  minimum_reward_risk DECIMAL(5, 2) DEFAULT 1.5,
  cooldown_minutes INTEGER DEFAULT 15,
  allowed_sessions JSONB DEFAULT '["london", "new_york", "london_ny_overlap"]'::jsonb,
  signal_expiration_minutes INTEGER DEFAULT 5,
  emergency_stop BOOLEAN DEFAULT FALSE,
  auto_mode_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trading_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trading settings" ON public.trading_settings
  FOR ALL USING (auth.uid() = user_id);

-- Strategy versions
CREATE TABLE IF NOT EXISTS public.strategy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  configuration_json JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read strategy versions" ON public.strategy_versions
  FOR SELECT TO authenticated USING (true);

-- Market candles
CREATE TABLE IF NOT EXISTS public.market_candles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  open DECIMAL(18, 6) NOT NULL,
  high DECIMAL(18, 6) NOT NULL,
  low DECIMAL(18, 6) NOT NULL,
  close DECIMAL(18, 6) NOT NULL,
  volume DECIMAL(18, 2) DEFAULT 0,
  spread DECIMAL(10, 6),
  source TEXT DEFAULT 'mock',
  UNIQUE (symbol, timeframe, open_time, source)
);

ALTER TABLE public.market_candles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market candles" ON public.market_candles
  FOR SELECT TO authenticated USING (true);

-- Signals
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  strategy_version_id UUID REFERENCES public.strategy_versions(id),
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  trust_score INTEGER NOT NULL,
  entry_min DECIMAL(18, 6),
  entry_max DECIMAL(18, 6),
  stop_loss DECIMAL(18, 6),
  take_profit DECIMAL(18, 6),
  reward_risk DECIMAL(5, 2),
  score_breakdown_json JSONB DEFAULT '[]'::jsonb,
  reasons_json JSONB DEFAULT '[]'::jsonb,
  warnings_json JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own signals" ON public.signals
  FOR ALL USING (auth.uid() = user_id);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.signals(id),
  broker_account_id UUID REFERENCES public.trading_accounts(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  external_order_id TEXT,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  order_type TEXT DEFAULT 'market',
  requested_volume DECIMAL(10, 4) NOT NULL,
  filled_volume DECIMAL(10, 4),
  requested_price DECIMAL(18, 6),
  fill_price DECIMAL(18, 6),
  stop_loss DECIMAL(18, 6),
  take_profit DECIMAL(18, 6),
  environment TEXT DEFAULT 'demo',
  mode TEXT DEFAULT 'paper',
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  filled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id);

-- Positions
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  external_position_id TEXT,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DECIMAL(18, 6) NOT NULL,
  current_price DECIMAL(18, 6),
  volume DECIMAL(10, 4) NOT NULL,
  stop_loss DECIMAL(18, 6),
  take_profit DECIMAL(18, 6),
  unrealized_profit DECIMAL(18, 2) DEFAULT 0,
  realized_profit DECIMAL(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own positions" ON public.positions
  FOR ALL USING (auth.uid() = user_id);

-- Daily risk state
CREATE TABLE IF NOT EXISTS public.daily_risk_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  trading_date DATE NOT NULL,
  starting_equity DECIMAL(18, 2) DEFAULT 0,
  realized_profit_loss DECIMAL(18, 2) DEFAULT 0,
  unrealized_profit_loss DECIMAL(18, 2) DEFAULT 0,
  trades_count INTEGER DEFAULT 0,
  consecutive_losses INTEGER DEFAULT 0,
  trading_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, trading_date)
);

ALTER TABLE public.daily_risk_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily risk state" ON public.daily_risk_state
  FOR ALL USING (auth.uid() = user_id);

-- Alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.signals(id),
  alert_type TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app',
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts" ON public.alerts
  FOR ALL USING (auth.uid() = user_id);

-- Audit logs (immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create user profile and settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.trading_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
