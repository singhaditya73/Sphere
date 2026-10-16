import test from "node:test";
import assert from "node:assert/strict";

import {
  canAddMedia,
  canChat,
  canControlPlayback,
  canCreateActivity,
  canModerate,
  canUseCall,
  canViewRoom,
  isListedPublicly,
} from "../lib/room-policy.ts";
import {
  buildInviteUrl,
  checkInviteUsable,
  defaultInviteExpiry,
  DEFAULT_INVITE_TTL_MS,
  generateInviteToken,
  isValidInviteTokenFormat,
} from "../lib/invite-token.ts";
import { ALLOWED_REACTIONS, isAllowedReaction, REACTION_LABELS } from "../lib/reactions.ts";
import {
  isEmbeddedVideo,
  mediaTypeForYoutubeCategory,
  mediaTypeLabel,
  normalizeSearchCategory,
  resolveMediaType,
  SEARCH_CATEGORIES,
  unavailableReason,
} from "../lib/media.ts";
import { parseSuggestionPlan, sanitizeQueries } from "../lib/ai/parse.ts";
import { filterTracksByCategory } from "../lib/music/youtube-parse.ts";
import type { Track } from "../lib/music/types.ts";

/* ────────────────────────────── room policy ────────────────────────────── */

test("canAddMedia respects lock and add-mode", () => {
  assert.equal(canAddMedia({ isLocked: false, addMode: "all" }, false), true);
  assert.equal(canAddMedia({ isLocked: false, addMode: "hosts" }, false), false);
  assert.equal(canAddMedia({ isLocked: false, addMode: "hosts" }, true), true);
  assert.equal(canAddMedia({ isLocked: true, addMode: "all" }, false), false);
  assert.equal(canAddMedia({ isLocked: true, addMode: "all" }, true), false);
});

test("canChat handles every chat mode and lock state", () => {
  assert.equal(canChat({ isLocked: false, chatMode: "all" }, false), true);
  assert.equal(canChat({ isLocked: false, chatMode: "hosts" }, false), false);
  assert.equal(canChat({ isLocked: false, chatMode: "hosts" }, true), true);
  assert.equal(canChat({ isLocked: false, chatMode: "muted" }, true), false);
  assert.equal(canChat({ isLocked: true, chatMode: "all" }, true), false);
});

test("playback and moderation are host-only", () => {
  assert.equal(canControlPlayback({ mode: "dj" }, false), false);
  assert.equal(canControlPlayback({ mode: "listen_together" }, true), true);
  assert.equal(canModerate({ mode: "dj" }, false), false);
  assert.equal(canModerate({ mode: "dj" }, true), true);
});

test("canUseCall requires calls enabled and an active room", () => {
  assert.equal(canUseCall({ callsEnabled: true, isActive: true }), true);
  assert.equal(canUseCall({ callsEnabled: false, isActive: true }), false);
  assert.equal(canUseCall({ callsEnabled: true, isActive: false }), false);
});

test("canCreateActivity allows host or any interactive participant", () => {
  assert.equal(canCreateActivity(false, true), true);
  assert.equal(canCreateActivity(true, false), true);
  assert.equal(canCreateActivity(false, false), false);
});

test("canViewRoom blocks banned, inactive and private-without-invite", () => {
  const active = { visibility: "public" as const, isActive: true };
  assert.deepEqual(canViewRoom(active, { isHost: false, isBanned: false, hasValidInvite: false }), {
    allowed: true,
  });
  assert.equal(
    canViewRoom(active, { isHost: false, isBanned: true, hasValidInvite: false }).reason,
    "banned"
  );
  assert.equal(
    canViewRoom({ visibility: "public", isActive: false }, {
      isHost: false,
      isBanned: false,
      hasValidInvite: false,
    }).reason,
    "room_inactive"
  );
  // Host may still see their inactive room.
  assert.equal(
    canViewRoom({ visibility: "public", isActive: false }, {
      isHost: true,
      isBanned: false,
      hasValidInvite: false,
    }).allowed,
    true
  );
  assert.equal(
    canViewRoom({ visibility: "private", isActive: true }, {
      isHost: false,
      isBanned: false,
      hasValidInvite: false,
    }).reason,
    "invite_required"
  );
  assert.equal(
    canViewRoom({ visibility: "private", isActive: true }, {
      isHost: false,
      isBanned: false,
      hasValidInvite: true,
    }).allowed,
    true
  );
});

test("isListedPublicly only lists active public rooms", () => {
  assert.equal(isListedPublicly({ visibility: "public", isActive: true }), true);
  assert.equal(isListedPublicly({ visibility: "unlisted", isActive: true }), false);
  assert.equal(isListedPublicly({ visibility: "private", isActive: true }), false);
  assert.equal(isListedPublicly({ visibility: "public", isActive: false }), false);
});

/* ────────────────────────────── invite tokens ──────────────────────────── */

test("generateInviteToken is URL-safe, opaque and unique", () => {
  const a = generateInviteToken();
  const b = generateInviteToken();
  assert.match(a, /^[A-Z0-9]{24}$/);
  assert.notEqual(a, b);
  assert.equal(isValidInviteTokenFormat(a), true);
});

test("isValidInviteTokenFormat rejects malformed input", () => {
  assert.equal(isValidInviteTokenFormat("SHORT"), false);
  assert.equal(isValidInviteTokenFormat("lowercase-token-1234567890"), false);
  assert.equal(isValidInviteTokenFormat(""), false);
  assert.equal(isValidInviteTokenFormat(null), false);
  assert.equal(isValidInviteTokenFormat(123), false);
  assert.equal(isValidInviteTokenFormat("A".repeat(65)), false);
});

test("buildInviteUrl normalises trailing slashes", () => {
  assert.equal(buildInviteUrl("https://sphere.app", "ABC"), "https://sphere.app/join/ABC");
  assert.equal(buildInviteUrl("https://sphere.app///", "ABC"), "https://sphere.app/join/ABC");
});

test("checkInviteUsable covers revoked, expired and exhausted", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const base = { expiresAt: null, revokedAt: null, uses: 0, maxUses: null };
  assert.equal(checkInviteUsable(base, now).usable, true);
  assert.equal(
    checkInviteUsable({ ...base, revokedAt: now }, now).reason,
    "revoked"
  );
  assert.equal(
    checkInviteUsable({ ...base, expiresAt: new Date("2025-12-31T00:00:00Z") }, now).reason,
    "expired"
  );
  assert.equal(checkInviteUsable({ ...base, maxUses: 3, uses: 3 }, now).reason, "exhausted");
  assert.equal(checkInviteUsable({ ...base, maxUses: 3, uses: 2 }, now).usable, true);
});

test("defaultInviteExpiry is seven days out", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(defaultInviteExpiry(now).getTime(), now.getTime() + DEFAULT_INVITE_TTL_MS);
});

/* ─────────────────────────────── reactions ─────────────────────────────── */

test("reactions use a small, validated vocabulary", () => {
  assert.ok(ALLOWED_REACTIONS.length > 0);
  for (const emoji of ALLOWED_REACTIONS) {
    assert.equal(isAllowedReaction(emoji), true);
    assert.equal(typeof REACTION_LABELS[emoji], "string");
  }
  assert.equal(isAllowedReaction("🚀"), false);
  assert.equal(isAllowedReaction(""), false);
  assert.equal(isAllowedReaction(42), false);
});

/* ─────────────────────────── universal media types ─────────────────────── */

test("normalizeSearchCategory defaults to music", () => {
  assert.equal(normalizeSearchCategory("video"), "video");
  assert.equal(normalizeSearchCategory("all"), "all");
  assert.equal(normalizeSearchCategory("music"), "music");
  assert.equal(normalizeSearchCategory(undefined), "music");
  assert.equal(normalizeSearchCategory("nonsense"), "music");
  assert.deepEqual([...SEARCH_CATEGORIES], ["music", "video", "all"]);
});

test("mediaTypeForYoutubeCategory treats category 10 as music", () => {
  assert.equal(mediaTypeForYoutubeCategory("10"), "music");
  assert.equal(mediaTypeForYoutubeCategory("24"), "video");
  assert.equal(mediaTypeForYoutubeCategory(null), "video");
});

test("resolveMediaType prefers the reported type then falls back", () => {
  assert.equal(resolveMediaType("Youtube", "podcast"), "podcast");
  assert.equal(resolveMediaType("Itunes", null), "music");
  assert.equal(resolveMediaType("Spotify", null), "music");
  assert.equal(resolveMediaType("Youtube", null), "video");
  assert.equal(resolveMediaType(null, "bogus"), "video");
});

test("mediaTypeLabel is human readable", () => {
  assert.equal(mediaTypeLabel("music"), "Music");
  assert.equal(mediaTypeLabel("video"), "Video");
  assert.equal(mediaTypeLabel("podcast"), "Podcast");
  assert.equal(mediaTypeLabel("trailer"), "Trailer");
  assert.equal(mediaTypeLabel(null), "Media");
});

test("isEmbeddedVideo only matches YouTube streams", () => {
  assert.equal(isEmbeddedVideo("Youtube"), true);
  assert.equal(isEmbeddedVideo("Itunes"), false);
  assert.equal(isEmbeddedVideo(null), false);
});

test("unavailableReason explains non-playable items", () => {
  assert.equal(unavailableReason({ available: false }), "This item is no longer available.");
  assert.equal(
    unavailableReason({ type: "Youtube", embeddable: false }),
    "The uploader has disabled embedded playback for this video."
  );
  assert.equal(unavailableReason({ type: "Youtube", embeddable: true }), null);
  assert.equal(unavailableReason({}), null);
});

/* ─────────────────────────── category filtering ────────────────────────── */

function track(id: string, mediaType: string): Track {
  return {
    provider: "youtube",
    id,
    title: `Track ${id}`,
    artist: "Artist",
    thumbnail: "",
    artwork: "",
    durationSeconds: 200,
    url: `https://youtube.com/watch?v=${id}`,
    embeddable: true,
    source: "youtube-data-api",
    mediaType,
  };
}

test("filterTracksByCategory filters and falls back when empty", () => {
  const mixed = [track("a", "music"), track("b", "video"), track("c", "music")];
  assert.deepEqual(
    filterTracksByCategory(mixed, "music").map((t) => t.id),
    ["a", "c"]
  );
  assert.deepEqual(
    filterTracksByCategory(mixed, "video").map((t) => t.id),
    ["b"]
  );
  // No matches → return the original list rather than an empty one.
  assert.deepEqual(
    filterTracksByCategory([track("a", "music")], "video").map((t) => t.id),
    ["a"]
  );
  // Unknown category → passthrough.
  assert.equal(filterTracksByCategory(mixed, "all").length, 3);
});

/* ───────────────────────────── AI plan parsing ─────────────────────────── */

test("sanitizeQueries trims, de-dupes and caps", () => {
  assert.deepEqual(
    sanitizeQueries(["  lofi beats ", "lofi beats", "jazz", 5, "", "x", "pop party"]),
    ["lofi beats", "jazz", "pop party"]
  );
  assert.deepEqual(sanitizeQueries(["aa", "bb", "cc", "dd", "ee"], 2), ["aa", "bb"]);
  assert.deepEqual(sanitizeQueries("not an array"), []);
});

test("parseSuggestionPlan extracts JSON from prose and fences", () => {
  const plain = parseSuggestionPlan('{"intro":"Here you go","queries":["chill lofi","jazz"]}');
  assert.deepEqual(plain, { intro: "Here you go", queries: ["chill lofi", "jazz"] });

  const fenced = parseSuggestionPlan(
    'Sure! ```json\n{"intro":"","queries":["party hits"]}\n``` Enjoy.'
  );
  assert.deepEqual(fenced, { intro: "", queries: ["party hits"] });

  assert.equal(parseSuggestionPlan("no json here"), null);
  assert.equal(parseSuggestionPlan('{"intro":"x","queries":[]}'), null);
  assert.equal(parseSuggestionPlan('{"intro":"x","queries":["a"]'), null);
});
