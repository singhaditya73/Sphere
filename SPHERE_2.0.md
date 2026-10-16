# Sphere 2.0 — Implementation Notes & Checklist

This document tracks the Sphere 2.0 build: universal media, integrated video
calling, instant joining, social interactions, an AI room companion, privacy /
moderation, and production readiness.

> The native song-search + collaborative queue work (commit `932ca12`) is the
> foundation this builds on. Nothing in it was duplicated or replaced — the new
> features reuse the same queue, providers, auth, polling and components.

## Feature map

| Area | What shipped | Where |
| --- | --- | --- |
| Universal media | One queue for music, music videos and videos; Music / Videos / All-media filter | `lib/media.ts`, `lib/music/*`, `components/song-search-dialog.tsx` |
| Reliable rooms | Authoritative full-state `GET`, heartbeat presence, stale-response guard | `lib/room-access.ts`, `app/api/rooms/[roomId]/route.ts` |
| Video calls | LiveKit tokens minted server-side, custom call dock, screen share | `lib/call.ts`, `components/video-call.tsx`, `app/api/rooms/[roomId]/call/token/route.ts` |
| Instant joining | Opaque invite tokens, QR + link + room code, rotate/revoke | `lib/invite-token.ts`, `components/room-invite.tsx`, `app/join/[token]/page.tsx` |
| Party Mode | TV-friendly read-only display with QR and privacy toggles | `app/room/[roomId]/display/page.tsx` |
| Social | Reactions, polls, song/video battles (separate from upvotes) | `components/room-reactions.tsx`, `components/room-activities.tsx` |
| AI companion | OpenAI-compatible provider, suggestions only, never auto-queues | `lib/ai/*`, `components/ai-companion.tsx`, `app/api/ai/suggest/route.ts` |
| Privacy / moderation | Visibility, lock, chat/add modes, kick / ban / mute, saved rooms, recap | `lib/room-policy.ts`, `components/room-moderation.tsx`, `app/api/rooms/[roomId]/{moderation,favorite,recap}/route.ts` |

## Phases

### Phase A — Universal media foundation
- [x] Extend `Track`/provider types with a media kind + category.
- [x] YouTube provider: category-aware search (music / video / all) + availability.
- [x] `Stream.mediaType` + `Stream.category` columns.
- [x] Search API accepts `category`; dialog gets Music / Videos / All filter tabs.
- [x] Graceful handling for unavailable / non-embeddable / restricted media.

### Phase B — Reliable rooms
- [x] Central `lib/room-access.ts` (auth + membership + host checks).
- [x] `lib/room-policy.ts` pure policy helpers (lock, add-mode, chat-mode, visibility).
- [x] Participant presence (heartbeat + stale cleanup) via `RoomParticipant`.
- [x] Authorization on every mutating route (queue, playback, chat, moderation).
- [x] Stale-response guard on the client poll loop (existing seq guard, kept).
- [x] Consolidated room state returned from `GET /api/rooms/[roomId]` (with `viewer` flags).

### Phase C — Video calling (LiveKit)
- [x] Server token endpoint with membership + host grants.
- [x] Client call dock (tiles, mute, camera, screen share, device pickers, leave).
- [x] Graceful "not configured" state; secrets stay server-side.
- [x] Independent leave (leave the call, stay in the room).

### Phase D — Instant joining + Party Mode
- [x] `RoomInvite` model with expiry / rotation / revocation / max-uses.
- [x] `/api/rooms/[roomId]/invite` (create/rotate/revoke) + `/api/invite/[token]` validate.
- [x] `/join/[token]` landing route (sign-in CTA when needed).
- [x] Server-side QR generation (`qrcode`), room-code fallback, copy link.
- [x] `/room/[roomId]/display` Party Mode (TV-friendly, read-only, privacy toggles).

### Phase E — Social interactions
- [x] Reactions (`Reaction`) with rate limiting, kept separate from upvotes.
- [x] Chat hardening: mute modes, rate limits, empty/disabled states.
- [x] Polls (`Poll`/`PollOption`/`PollVote`) with deadlines + one vote per user.
- [x] Song/video battles (`Battle`/`BattleEntry`/`BattleVote`), distinct from upvotes.

### Phase F — AI discovery
- [x] `lib/ai` provider interface (OpenAI-compatible, env-driven).
- [x] `/api/ai/suggest` runs the model's *queries* against the real provider; never invents ids.
- [x] Suggestions shown for approval; adding reuses `/api/streams`.
- [x] Graceful handling when AI credentials are absent (`AI_NOT_CONFIGURED`).

### Phase G — Persistence + polish
- [x] Room privacy (`visibility`), description, category.
- [x] Saved/favorite rooms (`RoomFavorite`).
- [x] Session recap (`/api/rooms/[roomId]/recap`).
- [x] Moderation: bans, kicks, chat mute, add restrictions.
- [x] Docs: this file, `.env.example`, `README.md`.
- [x] Tests for pure logic (policy, invites, reactions, AI parsing, media types).

## How to enable the optional services

Everything below is optional. With none of it set, Sphere still runs: search
falls back to keyless iTunes previews, calls hide themselves, and the AI dialog
explains it is disabled.

### Video calling — LiveKit
```
LIVEKIT_URL="wss://your-project.livekit.cloud"
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
```
- Create a project at [livekit.io](https://livekit.io). Secrets are read **server-side only**.
- `GET/POST /api/rooms/[roomId]/call/token` returns a short-lived, room-scoped JWT.
- Recording is **off by default** and never initiated by Sphere.

### AI room companion (Groq)
```
GROQ_API_KEY="..."                    # from https://console.groq.com/keys
AI_MODEL=""                           # optional, default openai/gpt-oss-20b
AI_BASE_URL=""                        # optional, default https://api.groq.com/openai/v1
AI_TIMEOUT_MS=""                      # optional, default 20000
```
- Defaults to **Groq** (fast, cheap, OpenAI-compatible). `AI_API_KEY` is accepted
  as an alias for `GROQ_API_KEY`.
- `openai/gpt-oss-20b` is the fast default; set `AI_MODEL=openai/gpt-oss-120b`
  for the larger model. Any OpenAI-compatible endpoint still works via `AI_BASE_URL`.
- The model returns search *queries*; Sphere resolves them with the real provider.
- If a model rejects `response_format`, the provider retries once without it.

### Full-length YouTube
```
YOUTUBE_API_KEY="..."   # enable "YouTube Data API v3"
```

## Deploying (Vercel)

The database schema must exist in the database Vercel points at — it is **not**
the same database as your local `.env.local` unless you point both at the same
Neon project.

The `vercel-build` script keeps it in sync automatically:

```
prisma generate && prisma db push --skip-generate && next build
```

So every Vercel deploy applies any schema changes to `DATABASE_URL` before
building. `prisma db push` **refuses to run** (and fails the build) if a change
would lose data, so it will never silently drop columns.

To apply the schema to production manually, once:

```bash
cd Sphere
# either pull the value from Vercel…
npx vercel env pull .env.production.local --environment=production
export DATABASE_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2- | tr -d '"')"
# …or paste it directly
# export DATABASE_URL="postgresql://…"

# preview the SQL that will run (look for any DROP)
npx prisma migrate diff --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma --script

# apply it
npx prisma db push
```

> The migration history is intentionally not used (`prisma migrate` would replay
> the old migrations and fail). Schema changes are applied with `db push`, and a
> hand-written SQL file is kept in `prisma/migrations/` for reference.

## Privacy & moderation model

- **Visibility**: `public` (listed on the home page), `unlisted` (link only,
  default), `private` (valid invitation required). Only `public` rooms appear in
  the directory.
- **Host email** is only ever returned to the room owner; everyone else sees a
  display name.
- **Enforcement is server-side.** The `viewer` flags from
  `GET /api/rooms/[roomId]` only hide controls the server would reject anyway.
- **Invitations** are opaque tokens (never derived from the room id) and can be
  rotated or revoked at any time. Redemption creates a `RoomParticipant` row that
  grants access to private rooms. Sphere has no anonymous guest accounts.
- **Reactions, poll votes and battle votes are stored separately from queue
  upvotes** and never affect ranking.

## Database

Schema changes live in `prisma/schema.prisma` with a hand-written migration at
`prisma/migrations/20261017120000_sphere2_social/migration.sql`. The deployed
Neon database is kept in sync with `prisma db push` (the migration history is
intentionally not replayed). See `README.md` for the setup commands.

## Verification

- [x] `npm test` — 59/59 passing (includes `tests/sphere2.test.ts`).
- [x] `npm run typecheck` — clean.
- [x] `npm run build` — succeeds (run with the dev server stopped).

## Requires external configuration (documented, not verifiable in this environment)

- **LiveKit**: a real project + a multi-device audio/video/screen-share test.
- **AI**: a real `GROQ_API_KEY` to exercise `/api/ai/suggest` end-to-end.
- **YouTube full-length**: `YOUTUBE_API_KEY` (set locally).

## Known gaps (honest status)

- The call/mic integration is code-complete and type-checked, but a real
  multi-device LiveKit call has not been exercised here.
- The AI companion and Groq provider are wired and unit-tested against a mocked
  endpoint, but a live Groq call has not been exercised here.

## UI coverage (Sphere 2.0 surface)

- **Host controls** (`components/room-moderation.tsx`): lock, end session,
  visibility, chat mode, add mode, per-participant mute/remove/ban, and a
  **banned-users list with one-click unban** (`GET` + `unban` on
  `/api/rooms/[roomId]/moderation`).
- **Room settings after creation**: visibility (`public` / `unlisted` /
  `private`) can now be changed live from the host panel via the
  `set-visibility` action.
- **Session recap** (`/room/[roomId]/recap`): a dedicated screen rendering the
  `/recap` API — session length, items queued/played, participants, messages,
  most-upvoted tracks, artists on rotation and top contributors.
- **Party Mode** (`/room/[roomId]/display`): floating reaction animations,
  animated equalizer, marquee for long titles, gradient progress, poll/battle
  bars and auto-hiding chrome in fullscreen.
- **Dashboard**: at-a-glance stats (hosting / joined / saved) and a
  join-by-code input alongside Create Room.
- **Landing page**: hero and feature grid updated for universal media, calling,
  Party Mode, polls/battles, the AI companion and host controls.
