# Google + GitHub Auth + Favorites — Design

**Date:** 2026-05-16
**Status:** Draft for review
**Scope:** Add user accounts to the BTS Next.js app with Google + GitHub sign-in, plus a polymorphic favorites table so logged-in users can save catalog entities.

---

## Goals

- Let visitors create an account by signing in with Google or GitHub.
- Persist sessions server-side; sign-out works and revokes immediately.
- Logged-in users can favorite/unfavorite productions, people, scenes, and keyframes.
- Simple, conventional implementation — no exotic configuration.

## Non-goals

- Email/password sign-in.
- Roles, permissions, or admin features.
- Account deletion UI (defer until needed).
- Real OAuth roundtrip in CI (manual smoke test instead).

---

## Stack

- **Library:** `next-auth@beta` (Auth.js v5) + `@auth/drizzle-adapter`.
- **Session strategy:** `database` (rows in `sessions` table) — revocable, joinable, no JWT key rotation pain.
- **Providers:** Google, GitHub. `allowDangerousEmailAccountLinking: true` so a user with the same verified email on both providers gets one account.

## Database changes

New file `packages/db/src/schema/auth.ts`, exported from `packages/db/src/schema/index.ts`. Drizzle migration generated via `pnpm db:generate`.

### Auth.js standard tables

- `users` — `id (uuid pk)`, `name`, `email (unique)`, `email_verified (timestamptz)`, `image`, `created_at`
- `accounts` — provider linkage: `user_id`, `type`, `provider`, `provider_account_id`, OAuth token fields. PK `(provider, provider_account_id)`.
- `sessions` — `session_token (pk)`, `user_id`, `expires`
- `verification_tokens` — `(identifier, token)` PK, `expires` (required by adapter even if unused)

### Favorites

```
favorites (
  user_id        uuid     references users(id) on delete cascade,
  entity_type    favorite_entity_type not null,   -- enum
  entity_id      uuid     not null,
  created_at     timestamptz default now(),
  primary key (user_id, entity_type, entity_id)
)

create type favorite_entity_type as enum (
  'production', 'person', 'scene', 'keyframe'
);
```

Index on `(user_id, created_at desc)` for the "my favorites" listing page.

`entity_id` is not a FK because it points at four different tables. Integrity is enforced in the server action (verify the row exists before inserting).

## Next.js wiring (`apps/web/`)

| File | Purpose |
|---|---|
| `auth.ts` | Configures Auth.js: providers, Drizzle adapter, callbacks. Exports `auth`, `handlers`, `signIn`, `signOut`. |
| `app/api/auth/[...nextauth]/route.ts` | Mounts Auth.js handlers. |
| `middleware.ts` | Protects `/account/*` — redirects to `/signin` when unauthenticated. |
| `app/signin/page.tsx` | Two-button sign-in page (Google, GitHub). Server component; buttons are client components calling `signIn("google")` etc. |
| `app/account/page.tsx` | Shows user info, linked providers, sign-out button. |
| `app/account/favorites/page.tsx` | Lists the current user's favorites grouped by entity type. |
| `components/UserMenu.tsx` | Avatar dropdown in the existing site header — shows "Sign in" or user avatar + menu. |
| `app/actions/favorites.ts` | Server actions `addFavorite`, `removeFavorite`, `toggleFavorite`. |
| `components/FavoriteButton.tsx` | Client component with optimistic toggle, calls the server action. |

Session access:
- **Server components / actions:** `const session = await auth()` from `auth.ts`.
- **Client components:** wrap layout in `<SessionProvider>` only on pages that need reactive session (most pages don't — the avatar can be rendered server-side).

## Favorites server actions

```ts
// app/actions/favorites.ts
"use server";
export async function toggleFavorite(entityType: FavoriteEntityType, entityId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await rateLimit(session.user.id);   // existing @upstash/ratelimit
  // verify entity exists in its table
  // upsert or delete in favorites
  revalidatePath("/account/favorites");
}
```

Rate limit: 30 toggles/minute per user via existing Upstash setup.

## Environment variables

Documented in `apps/web/.env.example`:

```
AUTH_SECRET=                # openssl rand -base64 32
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

OAuth redirect URIs to register:
- Google: `https://<host>/api/auth/callback/google`
- GitHub: `https://<host>/api/auth/callback/github`

A short `docs/auth-setup.md` will walk through creating the OAuth apps.

## Testing

- **Vitest** (`packages/db`): schema compiles, migration applies, favorites unique-constraint works.
- **Vitest** (`apps/web`): server actions — mocked `auth()` returning a user, asserts insert/delete and unauthorized rejection.
- **Playwright**: `/signin` renders both provider buttons; `/account` redirects to `/signin` when logged out. OAuth roundtrip is manually smoke-tested, not in CI.

## Error handling

- OAuth callback failure → redirect to `/signin?error=<code>` with a human message.
- Server action without session → throw, caught by Next.js error boundary; client shows a toast.
- Duplicate favorite → server action treats as no-op (idempotent).

## Rollout

1. Migration runs in dev (`pnpm db:migrate`).
2. Set env vars locally, register OAuth apps in Google Cloud + GitHub.
3. Manual smoke test: sign in with each provider, link both to one account, favorite an item, sign out, sign back in, favorite is still there.
4. Deploy with production OAuth credentials + `AUTH_URL` set to the prod hostname.

## Open questions

- None for v1. (Account deletion, roles, and email/password are explicitly deferred.)
