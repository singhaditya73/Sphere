# Native Song Search & Queue Additions

Sphere can search for songs **inside a room** (no more copy/pasting URLs) while
reusing the existing shared queue, voting, room modes and playback.

Search works **out of the box with no API key**: when `YOUTUBE_API_KEY` is unset,
Sphere uses the keyless **iTunes Search API** and plays Apple's official
**30-second previews**. Set `YOUTUBE_API_KEY` and the same UI/queue transparently
switches to **full-length YouTube** playback.

## What was added

- **Add Song dialog** in the room page — a polished modal (bottom-sheet on
  mobile) with debounced search, loading/empty/error/retry states, artwork,
  keyboard navigation and per-result "Add" buttons.
- **Provider abstraction** (`lib/music/`) so the UI and queue are not coupled to
  a single service. Providers: **iTunes Search** (keyless, default) and the
  **official YouTube Data API v3** (when a key is configured).
- **`GET /api/search`** rewritten on top of the provider (was a scraper).
- **`POST /api/streams`** now accepts either a pasted URL (unchanged), a YouTube
  search result, **or** an iTunes search result, with duplicate protection.
- **Preview playback** — the room player drives a hidden `<audio>` element for
  provider-hosted previews, with play/pause, seek, skip and Listen Together sync
  matching the YouTube player.
- **New `Stream` columns** `artist`, `duration` and `previewUrl`, plus an index
  for duplicate lookups (see the migrations below).

## Architecture

| File | Responsibility |
| --- | --- |
| `lib/music/types.ts` | Provider-agnostic `Track` / `MusicProvider` / error codes |
| `lib/music/errors.ts` | `MusicError` (typed, maps to HTTP status) |
| `lib/music/http.ts` | Shared JSON transport (timeout, cancellation, error mapping) |
| `lib/music/cache.ts` | Small in-process TTL cache (protects provider quota) |
| `lib/music/youtube-parse.ts` | Pure YouTube parsing/normalization/ranking helpers |
| `lib/music/youtube.ts` | `YouTubeMusicProvider` (official Data API, injectable `fetch`) |
| `lib/music/itunes-parse.ts` | Pure iTunes parsing helpers |
| `lib/music/itunes.ts` | `ItunesMusicProvider` (keyless Search API, injectable `fetch`) |
| `lib/music/index.ts` | `getMusicProvider()` / `getMusicProviderById()` / config detection |
| `lib/queue.ts` | Pure `findDuplicateStream` duplicate rule |
| `lib/rate-limit.ts` | Fixed-window rate limiter |
| `components/song-search-dialog.tsx` | The Add Song UI |

Adding another provider later means implementing `MusicProvider` and returning
it from `getMusicProvider()` — no UI or queue changes required.

## Setup

### 1. Environment variable (optional)

Search works without any key. To upgrade from previews to full-length YouTube
playback, add a server-side key to `.env.local` (copy from `.env.example`):

```bash
YOUTUBE_API_KEY="your-key"
```

Get one from the [Google Cloud Console](https://console.cloud.google.com/):

1. Create (or pick) a project.
2. **APIs & Services → Library → YouTube Data API v3 → Enable.**
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Recommended: restrict the key to the *YouTube Data API v3*.

The key is read **only** on the server (`lib/music/index.ts`). It is never sent
to the browser and must never be prefixed with `NEXT_PUBLIC_`.

> **Without the key**, search uses the keyless iTunes Search API and returns
> 30-second previews. Adding songs by pasted URL keeps working either way.

### 2. Database migration

Two additive migrations add the track metadata columns:

```
prisma/migrations/20261017060000_add_stream_track_metadata/migration.sql
prisma/migrations/20261017070000_add_itunes_preview/migration.sql
```

They contain only additive statements (nullable columns, an index and a new
`StreamType` enum value), so they are **non-destructive** and existing rows are
preserved:

```sql
ALTER TABLE "Stream" ADD COLUMN     "artist" TEXT,
ADD COLUMN     "duration" INTEGER;
CREATE INDEX "Stream_roomId_extractedId_idx" ON "Stream"("roomId", "extractedId");

ALTER TYPE "StreamType" ADD VALUE IF NOT EXISTS 'Itunes';
ALTER TABLE "Stream" ADD COLUMN "previewUrl" TEXT;
```

> ⚠️ **Pre-existing migration drift.** The earlier migrations in this repo are out
> of sync with `prisma/schema.prisma` (the Room `code`/`mode`/playback columns,
> the `Message` table and `User.username` were created with `prisma db push`, not
> a migration). As a result, `prisma migrate deploy` on a *brand-new* database
> does not fully reproduce the schema. This is unrelated to the song-search
> change.

Pick the path that matches your database:

**A. Existing database that already matches the previous schema (most common —
e.g. a Neon/Supabase/`db push` database).** Baseline the older migrations, then
apply the new ones:

```bash
for m in 20250413130726_init 20250413132156_added_id_s 20250414110932_init \
         20250414114732_init 20250414115939_sync_schema 20251128205315_add_rooms; do
  npx prisma migrate resolve --applied "$m"
done
npx prisma migrate deploy      # applies add_stream_track_metadata + add_itunes_preview
npx prisma generate
```

**B. Local development database.** Just let Prisma sync the schema directly
(this is how Sphere was built historically):

```bash
npx prisma db push
npx prisma generate
```

**C. Fresh database + `migrate dev`** (interactive, needs a shadow DB): run
`npx prisma migrate dev`, then `npx prisma db push` once to fill in the
pre-existing drift above.

Either way, `npx prisma generate` is required so the client knows about
`artist`, `duration` and `previewUrl`.

### 3. Run

```bash
npm install
npx prisma generate
npm run dev      # http://localhost:3000
```

## Testing the feature

1. Sign in with Google and open/create a room.
2. Click **Add Song** (also available from the queue header).
3. Type an artist or title — results appear after a short debounce.
4. Use ↑ / ↓ + Enter, or click **Add** on a row.
5. The track lands in the shared queue for every participant (polling picks it
   up within ~2s; your own addition appears immediately).
6. Upvote it — ordering is unchanged (upvotes desc, then oldest first).
7. The **Paste link** tab still accepts YouTube and Spotify URLs.

With no `YOUTUBE_API_KEY`, results are labelled **30s preview** and the player
plays Apple's preview clip (the now-playing card shows a "30s preview" badge).

## API

### `GET /api/search?q=...&limit=`

Auth required. Validates and normalizes the query (2–100 chars), rate limits per
user (30/min), and returns the active `provider` plus normalized results.

iTunes (keyless default):

```json
{
  "provider": "itunes",
  "query": "blinding lights",
  "results": [
    {
      "provider": "itunes",
      "id": "1542842761",
      "title": "Blinding Lights (Remix)",
      "artist": "The Weeknd & ROSALÍA",
      "thumbnail": "https://is1-ssl.mzstatic.com/.../100x100bb.jpg",
      "artwork": "https://is1-ssl.mzstatic.com/.../600x600bb.jpg",
      "durationSeconds": 216,
      "url": "https://music.apple.com/us/album/.../1542842761",
      "embeddable": true,
      "previewUrl": "https://audio-ssl.itunes.apple.com/.../preview.m4a",
      "source": "itunes-search-api"
    }
  ]
}
```

YouTube (when `YOUTUBE_API_KEY` is set) returns the same shape with
`"provider": "youtube"`, `"source": "youtube-data-api"` and no `previewUrl`.

Errors always include a stable `code`: `UNAUTHORIZED`, `INVALID_QUERY`,
`QUOTA_EXCEEDED`, `RATE_LIMITED`, `TIMEOUT`, `PROVIDER_UNAVAILABLE`,
`INVALID_RESPONSE`, `PROVIDER_NOT_CONFIGURED` (only when a *specific* provider
such as YouTube is requested without a key). Internal details/stack traces are
never returned.

### `POST /api/streams`

Auth required. Accepts one of:

```json
{ "roomId": "BEAT-K7M2", "url": "https://youtu.be/..." }                        // pasted link
{ "roomId": "BEAT-K7M2", "provider": "youtube", "trackId": "4NRXx6U8ABQ" }     // YouTube search
{ "roomId": "BEAT-K7M2", "provider": "itunes", "trackId": "1542842761" }        // iTunes search
```

Responses: `{ id, duplicate }`. Re-adding a track already in the unplayed queue
returns `200` with `duplicate: true` and the existing id (idempotent). Concurrent
identical requests are collapsed server-side, so a room never gets two copies.

## Quota, limits & policy

- **iTunes Search API** (default) needs **no key**. Results are cached for 5
  minutes and searches are rate limited to 30/min per user. Playback uses
  Apple's own 30-second preview clips.
- **YouTube Data API** (opt-in) `search.list` costs **100 units**; the default
  quota is **10,000 units/day**, i.e. roughly **100 searches/day**.
  `videos.list` (used for duration/embedding) costs 1 unit per call.
- Searches are restricted to `type=video`, `videoEmbeddable=true`,
  `safeSearch=moderate`, and the **Music category (10)** first, widening once if
  that returns nothing. (`videoSyndicated` is intentionally **not** set: official
  VEVO/artist uploads are embeddable but often not syndicated, so filtering on it
  hides the real track behind lyric re-uploads.)
- YouTube channel names are **not** treated as verified artist identity — the UI
  labels them as the uploading channel. iTunes reports the actual track artist.
- Only the official Data API / public Search API and **permitted playback**
  (embedded YouTube player, Apple preview clips) are used. No audio extraction,
  stream scraping, or paywall bypass.
- A video being non-embeddable, private, deleted, age- or region-restricted is a
  provider decision; those tracks may fail inside Sphere.

## Security notes

- Provider calls and the API key live entirely server-side.
- All mutation endpoints check the NextAuth session; room existence is verified
  before writing.
- Search/inputs are validated with Zod and length-limited.
- Provider responses are validated before persistence/rendering.
- Thumbnails are rendered as plain `<img src>` from trusted image hosts (no
  untrusted HTML, no `dangerouslySetInnerHTML`).

## Tests

```bash
npm test          # node:test — provider parsing, errors, caching, duplicates
npm run typecheck # tsc --noEmit
npm run lint
npm run build
```

Automated tests **mock the provider** (`fetch`) so they never hit the network.

## Known limitations

- The provider/timeout/caching test suite mocks the network. The iTunes provider
  was also verified against the live public API; live **YouTube** verification
  requires a real `YOUTUBE_API_KEY`.
- Without a key, tracks play as **30-second previews** rather than full songs.
- In-memory cache, rate limiter and in-flight de-duplication are per server
  instance. A multi-instance deployment should move these to Redis.
- Synchronization is still polling-based (~2s, paused when the tab is hidden).
  Real-time upgrades are intentionally out of scope for this change.
- Duration/artist are fetched best-effort; older pasted-link rows may have them
  empty.
