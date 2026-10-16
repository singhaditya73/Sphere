import test from "node:test";
import assert from "node:assert/strict";

import { YouTubeMusicProvider } from "../lib/music/youtube.ts";
import { ItunesMusicProvider } from "../lib/music/itunes.ts";
import { MusicError } from "../lib/music/errors.ts";
import { TtlCache } from "../lib/music/cache.ts";
import { FixedWindowRateLimiter } from "../lib/rate-limit.ts";
import {
  getMusicProvider,
  getMusicProviderById,
  isMusicSearchConfigured,
  isYouTubeSearchConfigured,
  resetMusicProvider,
} from "../lib/music/index.ts";
import {
  buildItunesLookupUrl,
  buildItunesSearchUrl,
  classifyItunesError,
  isValidItunesId,
  parseItunesItems,
  upscaleArtwork,
} from "../lib/music/itunes-parse.ts";
import {
  buildSearchUrl,
  buildVideosUrl,
  classifyYouTubeError,
  extractVideoIds,
  formatDuration,
  isValidVideoId,
  normalizeQuery,
  parseISODuration,
  parseVideoItems,
  rankTracks,
} from "../lib/music/youtube-parse.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SEARCH_PAYLOAD = {
  items: [
    { id: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" } },
    { id: { kind: "youtube#video", videoId: "9bZkp7q19f0" } },
    { id: { kind: "youtube#video", videoId: "too-short" } },
  ],
};

const VIDEOS_PAYLOAD = {
  items: [
    {
      id: "dQw4w9WgXcQ",
      snippet: {
        title: "Rick Astley - Never Gonna Give You Up (Official Video)",
        channelTitle: "Rick Astley",
        thumbnails: {
          default: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg" },
          medium: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
          high: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" },
          maxres: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
        },
      },
      contentDetails: { duration: "PT3M33S" },
      status: { embeddable: true },
    },
    {
      id: "9bZkp7q19f0",
      snippet: {
        title: "PSY - GANGNAM STYLE(강남스타일) M/V",
        channelTitle: "officialpsy",
        thumbnails: { medium: { url: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg" } },
      },
      contentDetails: { duration: "PT4M13S" },
      status: { embeddable: true },
    },
  ],
};

const ITUNES_PAYLOAD = {
  resultCount: 3,
  results: [
    {
      wrapperType: "track",
      kind: "song",
      trackId: 1440857784,
      artistName: "Jack Johnson",
      collectionName: "In Between Dreams",
      trackName: "Better Together",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/v4/abc/preview.m4a",
      artworkUrl60: "https://is1-ssl.mzstatic.com/image/thumb/x/60x60bb.jpg",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg",
      trackTimeMillis: 207000,
      trackViewUrl: "https://music.apple.com/us/album/better-together/1440857781?i=1440857784",
      primaryGenreName: "Rock",
    },
    {
      wrapperType: "track",
      kind: "song",
      trackId: 1440857785,
      artistName: "Jack Johnson",
      trackName: "Never Fade",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/y/100x100bb.jpg",
      trackTimeMillis: 180000,
      trackViewUrl: "https://music.apple.com/us/album/never-fade/1440857781?i=1440857785",
    },
    // Non-song entries (e.g. a collection) must be skipped.
    { wrapperType: "collection", collectionId: 1440857781, collectionName: "In Between Dreams" },
  ],
};

test("normalizeQuery trims, collapses whitespace and caps length", () => {
  assert.equal(normalizeQuery("  blinding   lights  "), "blinding lights");
  assert.equal(normalizeQuery(null), "");
  assert.equal(normalizeQuery("x".repeat(500)).length, 100);
});

test("isValidVideoId accepts only 11-char youtube ids", () => {
  assert.equal(isValidVideoId("dQw4w9WgXcQ"), true);
  assert.equal(isValidVideoId("too-short"), false);
  assert.equal(isValidVideoId("has spaces!!"), false);
  assert.equal(isValidVideoId(null), false);
});

test("parseISODuration handles h/m/s combinations", () => {
  assert.equal(parseISODuration("PT3M33S"), 213);
  assert.equal(parseISODuration("PT4M13S"), 253);
  assert.equal(parseISODuration("PT1H2M3S"), 3723);
  assert.equal(parseISODuration("P1DT1H"), 90000);
  assert.equal(parseISODuration("nonsense"), null);
  assert.equal(parseISODuration(undefined), null);
});

test("formatDuration renders m:ss and h:mm:ss", () => {
  assert.equal(formatDuration(213), "3:33");
  assert.equal(formatDuration(3723), "1:02:03");
  assert.equal(formatDuration(null), "");
  assert.equal(formatDuration(-5), "");
});

test("buildSearchUrl requests video search with music focus when asked", () => {
  const musicUrl = new URL(buildSearchUrl("KEY", "daft punk", { limit: 12, musicOnly: true }));
  assert.equal(musicUrl.hostname, "www.googleapis.com");
  assert.equal(musicUrl.searchParams.get("type"), "video");
  assert.equal(musicUrl.searchParams.get("videoCategoryId"), "10");
  assert.equal(musicUrl.searchParams.get("videoEmbeddable"), "true");
  assert.equal(musicUrl.searchParams.get("safeSearch"), "moderate");
  assert.equal(musicUrl.searchParams.get("key"), "KEY");
  // Official uploads are embeddable but often not syndicated; filtering on
  // syndication hides the real track, so it must stay unset.
  assert.equal(musicUrl.searchParams.get("videoSyndicated"), null);

  const broadUrl = new URL(buildSearchUrl("KEY", "daft punk", { limit: 5, musicOnly: false }));
  assert.equal(broadUrl.searchParams.get("videoCategoryId"), null);
});

test("buildVideosUrl requests duration and status", () => {
  const url = new URL(buildVideosUrl("KEY", ["abc", "def"]));
  assert.equal(url.searchParams.get("id"), "abc,def");
  assert.match(url.searchParams.get("part") ?? "", /contentDetails/);
  assert.match(url.searchParams.get("part") ?? "", /status/);
});

test("extractVideoIds filters invalid ids and de-duplicates", () => {
  const ids = extractVideoIds({
    items: [
      { id: { videoId: "dQw4w9WgXcQ" } },
      { id: { videoId: "dQw4w9WgXcQ" } },
      { id: { videoId: "bad" } },
      { id: {} },
      {},
    ],
  });
  assert.deepEqual(ids, ["dQw4w9WgXcQ"]);
  assert.deepEqual(extractVideoIds(null), []);
});

test("parseVideoItems normalizes a videos.list payload", () => {
  const tracks = parseVideoItems(VIDEOS_PAYLOAD);
  assert.equal(tracks.length, 2);

  const first = tracks[0];
  assert.equal(first.provider, "youtube");
  assert.equal(first.id, "dQw4w9WgXcQ");
  assert.equal(first.title, "Rick Astley - Never Gonna Give You Up (Official Video)");
  assert.equal(first.artist, "Rick Astley");
  assert.equal(first.durationSeconds, 213);
  assert.equal(first.embeddable, true);
  assert.equal(first.thumbnail, "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  assert.equal(first.artwork, "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
  assert.equal(first.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
});

test("parseVideoItems falls back to ytimg thumbnails and skips malformed items", () => {
  const tracks = parseVideoItems({
    items: [
      { id: "dQw4w9WgXcQ", snippet: {}, contentDetails: {}, status: {} },
      { id: "not-valid", snippet: {} },
    ],
  });
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].title, "Untitled");
  assert.equal(tracks[0].artist, "");
  assert.equal(tracks[0].thumbnail, "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
  assert.equal(tracks[0].embeddable, null);
});

test("rankTracks prefers embeddable + music-looking channels but is stable", () => {
  const ranked = rankTracks([
    { provider: "youtube", id: "aaaaaaaaaaa", title: "A", artist: "Random Uploads", thumbnail: "", artwork: "", durationSeconds: null, url: "", embeddable: true, source: "youtube-data-api" },
    { provider: "youtube", id: "bbbbbbbbbbb", title: "B", artist: "Artist - Topic", thumbnail: "", artwork: "", durationSeconds: null, url: "", embeddable: true, source: "youtube-data-api" },
    { provider: "youtube", id: "ccccccccccc", title: "C", artist: "Blocked", thumbnail: "", artwork: "", durationSeconds: null, url: "", embeddable: false, source: "youtube-data-api" },
  ]);
  assert.deepEqual(ranked.map((t) => t.id), ["bbbbbbbbbbb", "aaaaaaaaaaa", "ccccccccccc"]);
});

test("classifyYouTubeError maps quota exhaustion and server errors", () => {
  const quota = classifyYouTubeError(403, JSON.stringify({ error: { errors: [{ reason: "quotaExceeded" }] } }));
  assert.equal(quota.code, "QUOTA_EXCEEDED");
  assert.equal(quota.retryable, false);

  const server = classifyYouTubeError(503, "");
  assert.equal(server.code, "PROVIDER_UNAVAILABLE");
  assert.equal(server.retryable, true);

  const badRequest = classifyYouTubeError(400, "");
  assert.equal(badRequest.code, "PROVIDER_UNAVAILABLE");
  assert.equal(badRequest.retryable, false);
});

test("provider searchTracks returns normalized, ranked tracks", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/search?")) return jsonResponse(SEARCH_PAYLOAD);
    if (url.includes("/videos?")) return jsonResponse(VIDEOS_PAYLOAD);
    throw new Error(`unexpected url ${url}`);
  };

  const provider = new YouTubeMusicProvider({ apiKey: "KEY", fetchImpl });
  const tracks = await provider.searchTracks("never gonna give you up");

  assert.equal(tracks.length, 2);
  assert.deepEqual(
    tracks.map((t) => t.id).sort(),
    ["9bZkp7q19f0", "dQw4w9WgXcQ"]
  );
  // Likely-official channel floats first; the non-embeddable rule is covered above.
  assert.equal(tracks[0].id, "9bZkp7q19f0");
  assert.equal(calls.length, 2);
});

test("provider widens the search when the music category returns nothing", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/search?")) {
      if (url.includes("videoCategoryId=10")) return jsonResponse({ items: [] });
      return jsonResponse(SEARCH_PAYLOAD);
    }
    return jsonResponse(VIDEOS_PAYLOAD);
  };

  const provider = new YouTubeMusicProvider({ apiKey: "KEY", fetchImpl });
  const tracks = await provider.searchTracks("some obscure track");

  assert.equal(tracks.length, 2);
  assert.equal(calls.length, 3);
  assert.ok(calls[1].includes("videoCategoryId=10") === false);
});

test("provider caches repeated searches", async () => {
  let callCount = 0;
  const fetchImpl: typeof fetch = async (input) => {
    callCount += 1;
    return String(input).includes("/search?") ? jsonResponse(SEARCH_PAYLOAD) : jsonResponse(VIDEOS_PAYLOAD);
  };
  const provider = new YouTubeMusicProvider({ apiKey: "KEY", fetchImpl });

  const first = await provider.searchTracks("cached query");
  const second = await provider.searchTracks("cached query");

  assert.equal(callCount, 2);
  assert.deepEqual(first, second);
});

test("provider rejects short queries with INVALID_QUERY", async () => {
  const provider = new YouTubeMusicProvider({
    apiKey: "KEY",
    fetchImpl: async () => jsonResponse({ items: [] }),
  });
  await assert.rejects(
    () => provider.searchTracks("a"),
    (error: unknown) => error instanceof MusicError && error.code === "INVALID_QUERY"
  );
});

test("provider surfaces quota exhaustion", async () => {
  const provider = new YouTubeMusicProvider({
    apiKey: "KEY",
    fetchImpl: async () => jsonResponse({ error: { errors: [{ reason: "quotaExceeded" }] } }, 403),
  });
  await assert.rejects(
    () => provider.searchTracks("anything"),
    (error: unknown) => error instanceof MusicError && error.code === "QUOTA_EXCEEDED"
  );
});

test("provider maps unreadable provider responses to INVALID_RESPONSE", async () => {
  const provider = new YouTubeMusicProvider({
    apiKey: "KEY",
    fetchImpl: async () => new Response("<html>oops</html>", { status: 200 }),
  });
  await assert.rejects(
    () => provider.searchTracks("anything"),
    (error: unknown) => error instanceof MusicError && error.code === "INVALID_RESPONSE"
  );
});

test("provider times out on a hanging request", async () => {
  const hangingFetch: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = (init as RequestInit | undefined)?.signal;
      signal?.addEventListener("abort", () => {
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      });
    });

  const provider = new YouTubeMusicProvider({ apiKey: "KEY", fetchImpl: hangingFetch, timeoutMs: 10 });
  await assert.rejects(
    () => provider.searchTracks("anything"),
    (error: unknown) => error instanceof MusicError && error.code === "TIMEOUT" && error.retryable
  );
});

test("getTrackDetails validates the id and returns null when the video is missing", async () => {
  const provider = new YouTubeMusicProvider({
    apiKey: "KEY",
    fetchImpl: async () => jsonResponse({ items: [] }),
  });

  await assert.rejects(
    () => provider.getTrackDetails("nope"),
    (error: unknown) => error instanceof MusicError && error.code === "INVALID_TRACK_ID"
  );

  const missing = await provider.getTrackDetails("dQw4w9WgXcQ");
  assert.equal(missing, null);
});

test("getTrackDetails returns a normalized track", async () => {
  const provider = new YouTubeMusicProvider({
    apiKey: "KEY",
    fetchImpl: async () => jsonResponse(VIDEOS_PAYLOAD),
  });
  const track = await provider.getTrackDetails("dQw4w9WgXcQ");
  assert.equal(track?.id, "dQw4w9WgXcQ");
  assert.equal(track?.artist, "Rick Astley");
});

test("isValidItunesId accepts only numeric ids", () => {
  assert.equal(isValidItunesId("1440857784"), true);
  assert.equal(isValidItunesId("dQw4w9WgXcQ"), false);
  assert.equal(isValidItunesId("12.5"), false);
  assert.equal(isValidItunesId(null), false);
});

test("buildItunesSearchUrl targets songs and carries the country", () => {
  const url = new URL(buildItunesSearchUrl("jack johnson", 12, "US"));
  assert.equal(url.hostname, "itunes.apple.com");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("term"), "jack johnson");
  assert.equal(url.searchParams.get("media"), "music");
  assert.equal(url.searchParams.get("entity"), "song");
  assert.equal(url.searchParams.get("limit"), "12");
  assert.equal(url.searchParams.get("country"), "US");

  const bare = new URL(buildItunesSearchUrl("jack johnson", 5));
  assert.equal(bare.searchParams.get("country"), null);
});

test("buildItunesLookupUrl requests a single song", () => {
  const url = new URL(buildItunesLookupUrl("1440857784"));
  assert.equal(url.pathname, "/lookup");
  assert.equal(url.searchParams.get("id"), "1440857784");
  assert.equal(url.searchParams.get("entity"), "song");
});

test("upscaleArtwork swaps the render size token", () => {
  const source = "https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg";
  assert.equal(upscaleArtwork(source, 600), "https://is1-ssl.mzstatic.com/image/thumb/x/600x600bb.jpg");
  assert.equal(upscaleArtwork(""), "");
});

test("parseItunesItems normalizes songs and skips non-tracks", () => {
  const tracks = parseItunesItems(ITUNES_PAYLOAD);
  assert.equal(tracks.length, 2);

  const first = tracks[0];
  assert.equal(first.provider, "itunes");
  assert.equal(first.id, "1440857784");
  assert.equal(first.title, "Better Together");
  assert.equal(first.artist, "Jack Johnson");
  assert.equal(first.durationSeconds, 207);
  assert.equal(first.thumbnail, "https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg");
  assert.equal(first.artwork, "https://is1-ssl.mzstatic.com/image/thumb/x/600x600bb.jpg");
  assert.equal(first.url, "https://music.apple.com/us/album/better-together/1440857781?i=1440857784");
  assert.equal(first.previewUrl, "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/v4/abc/preview.m4a");
  assert.equal(first.embeddable, true);
  assert.equal(first.source, "itunes-search-api");

  const second = tracks[1];
  assert.equal(second.previewUrl, null);
  assert.equal(second.embeddable, null);
});

test("parseItunesItems tolerates malformed payloads", () => {
  assert.deepEqual(parseItunesItems(null), []);
  assert.deepEqual(parseItunesItems({}), []);
  assert.deepEqual(parseItunesItems({ results: "nope" }), []);
});

test("classifyItunesError maps status codes", () => {
  assert.equal(classifyItunesError(429).code, "RATE_LIMITED");
  assert.equal(classifyItunesError(429).retryable, true);
  assert.equal(classifyItunesError(503).code, "PROVIDER_UNAVAILABLE");
  assert.equal(classifyItunesError(503).retryable, true);
  assert.equal(classifyItunesError(400).retryable, false);
});

test("iTunes provider returns normalized tracks and caches searches", async () => {
  let callCount = 0;
  const fetchImpl: typeof fetch = async () => {
    callCount += 1;
    return jsonResponse(ITUNES_PAYLOAD);
  };
  const provider = new ItunesMusicProvider({ fetchImpl });

  const first = await provider.searchTracks("jack johnson");
  const second = await provider.searchTracks("jack johnson");

  assert.equal(first.length, 2);
  assert.deepEqual(first, second);
  assert.equal(callCount, 1);
  assert.equal(first[0].provider, "itunes");
});

test("iTunes provider clamps the limit and rejects short queries", async () => {
  const seen: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    seen.push(String(input));
    return jsonResponse(ITUNES_PAYLOAD);
  };
  const provider = new ItunesMusicProvider({ fetchImpl });

  await provider.searchTracks("abcdef", { limit: 999 });
  const url = new URL(seen[0]);
  assert.equal(url.searchParams.get("limit"), "25");

  await assert.rejects(
    () => provider.searchTracks("a"),
    (error: unknown) => error instanceof MusicError && error.code === "INVALID_QUERY"
  );
});

test("iTunes provider resolves a single track and validates ids", async () => {
  const provider = new ItunesMusicProvider({ fetchImpl: async () => jsonResponse(ITUNES_PAYLOAD) });

  const track = await provider.getTrackDetails("1440857784");
  assert.equal(track?.id, "1440857784");
  assert.equal(track?.artist, "Jack Johnson");

  await assert.rejects(
    () => provider.getTrackDetails("not-a-number"),
    (error: unknown) => error instanceof MusicError && error.code === "INVALID_TRACK_ID"
  );

  assert.equal(await provider.validateTrack("nope"), false);
});

test("provider config: YouTube when keyed, keyless iTunes otherwise", () => {
  resetMusicProvider();
  assert.equal(isMusicSearchConfigured(), true);
  assert.equal(isYouTubeSearchConfigured({}), false);
  assert.equal(isYouTubeSearchConfigured({ YOUTUBE_API_KEY: "abc" }), true);

  const fallback = getMusicProvider({});
  assert.equal(fallback.id, "itunes");

  const keyed = getMusicProvider({ YOUTUBE_API_KEY: "abc" });
  assert.equal(keyed.id, "youtube");

  assert.equal(getMusicProviderById("itunes", {}).id, "itunes");
  assert.throws(
    () => getMusicProviderById("youtube", {}),
    (error: unknown) => error instanceof MusicError && error.code === "PROVIDER_NOT_CONFIGURED"
  );

  resetMusicProvider();
});

test("TtlCache stores, expires and evicts", () => {
  const cache = new TtlCache<number>(1000, 2);
  cache.set("a", 1);
  assert.equal(cache.get("a"), 1);
  cache.set("b", 2);
  cache.set("c", 3); // evicts "a"
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.get("c"), 3);
  cache.clear();
  assert.equal(cache.get("c"), undefined);

  const expiring = new TtlCache<number>(0);
  expiring.set("x", 1);
  assert.equal(expiring.get("x"), undefined);
});

test("FixedWindowRateLimiter blocks after the limit and resets", () => {
  const limiter = new FixedWindowRateLimiter(2, 60_000);
  assert.equal(limiter.check("user").allowed, true);
  assert.equal(limiter.check("user").allowed, true);
  const blocked = limiter.check("user");
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);

  const other = limiter.check("someone-else");
  assert.equal(other.allowed, true);
});
