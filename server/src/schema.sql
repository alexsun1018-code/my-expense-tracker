CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  current_month TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT,
  currency TEXT NOT NULL DEFAULT 'TWD',
  parent_account_id TEXT,
  PRIMARY KEY (id, user_id)
);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TWD';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS parent_account_id TEXT;
DO $$ BEGIN
  ALTER TABLE accounts ADD CONSTRAINT accounts_parent_fk
    FOREIGN KEY (parent_account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  flow TEXT NOT NULL CHECK (flow IN ('income','expense')),
  category TEXT,
  account_id TEXT NOT NULL,
  payment_method_id TEXT,
  merchant TEXT,
  note TEXT,
  necessary BOOLEAN,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (id, user_id),
  FOREIGN KEY (account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT
);
