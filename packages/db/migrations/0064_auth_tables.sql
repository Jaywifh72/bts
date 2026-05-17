-- Migration 0064 — Auth.js tables (users, accounts, sessions, verification_tokens).
--
-- Adds the four standard Auth.js / next-auth Drizzle-adapter tables to support
-- Google OAuth sign-in. See spec docs/superpowers/specs/2026-05-16-google-auth-design.md
-- and plan docs/superpowers/plans/2026-05-16-google-auth.md (Task 2).
--
-- These tables use uuid PKs (Auth.js convention), distinct from the catalog
-- tables which use bigserial. They are independent of all existing FKs.

CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name            text,
  email           text NOT NULL,
  email_verified  timestamp with time zone,
  image           text,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                 text NOT NULL,
  provider             text NOT NULL,
  provider_account_id  text NOT NULL,
  refresh_token        text,
  access_token         text,
  expires_at           integer,
  token_type           text,
  scope                text,
  id_token             text,
  session_state        text,
  CONSTRAINT accounts_provider_provider_account_id_pk PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token  text PRIMARY KEY NOT NULL,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires        timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier  text NOT NULL,
  token       text NOT NULL,
  expires     timestamp with time zone NOT NULL,
  CONSTRAINT verification_tokens_identifier_token_pk PRIMARY KEY (identifier, token)
);
