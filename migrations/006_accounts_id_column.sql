-- @auth/pg-adapter expects every adapter table to have a surrogate `id`
-- column it can use as a stable primary key — even on tables like
-- `accounts` whose natural composite key is (provider, providerAccountId).
-- Migration 002 used the composite as the PK and omitted `id`, which
-- breaks linkAccount() at sign-in time:
--
--   AdapterError: column "id" does not exist
--     at linkAccount (...)
--
-- Fix: drop the composite PK, add an `id` TEXT primary key (UUID), and
-- preserve the (provider, providerAccountId) uniqueness via a regular
-- constraint so the same OAuth account still can't be linked twice.

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_pkey;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS id TEXT NOT NULL DEFAULT gen_random_uuid()::text;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

-- Preserve the natural uniqueness so we don't accidentally link the same
-- OAuth account to two users.
ALTER TABLE accounts
  ADD CONSTRAINT accounts_provider_account_unique UNIQUE (provider, "providerAccountId");
