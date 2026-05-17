import { describe, it, expect } from 'vitest';
import { users, accounts, sessions, verificationTokens } from '../../src/schema/index.ts';
import { getTableConfig } from 'drizzle-orm/pg-core';

describe('auth schema', () => {
  // Drizzle 0.45 note: getTableConfig returns column objects whose `.name`
  // is the SQL column name (snake_case as defined in pgTable).
  it('users table has uuid id, unique email, name/image/emailVerified columns', () => {
    const cfg = getTableConfig(users);
    expect(cfg.name).toBe('users');
    const colNames = cfg.columns.map((c) => c.name);
    expect(colNames).toEqual(expect.arrayContaining(['id', 'email', 'email_verified', 'name', 'image', 'created_at']));
    const id = cfg.columns.find((c) => c.name === 'id')!;
    expect(id.primary).toBe(true);
    const email = cfg.columns.find((c) => c.name === 'email')!;
    expect(email.isUnique).toBe(true);
  });

  it('accounts table has composite PK (provider, providerAccountId) and FK to users', () => {
    const cfg = getTableConfig(accounts);
    expect(cfg.name).toBe('accounts');
    const pk = cfg.primaryKeys[0];
    expect(pk.columns.map((c) => c.name).sort()).toEqual(['provider', 'provider_account_id']);
  });

  it('sessions table has sessionToken PK and FK to users', () => {
    const cfg = getTableConfig(sessions);
    expect(cfg.name).toBe('sessions');
    const token = cfg.columns.find((c) => c.name === 'session_token')!;
    expect(token.primary).toBe(true);
  });

  it('verification_tokens table has composite PK (identifier, token)', () => {
    const cfg = getTableConfig(verificationTokens);
    expect(cfg.name).toBe('verification_tokens');
    const pk = cfg.primaryKeys[0];
    expect(pk.columns.map((c) => c.name).sort()).toEqual(['identifier', 'token']);
  });
});
