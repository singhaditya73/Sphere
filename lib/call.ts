/**
 * LiveKit call configuration + token minting (server-side only).
 *
 * The API secret never leaves the server: only short-lived, room-scoped JWTs
 * are handed to the browser. When LiveKit is not configured the call feature
 * reports itself as unavailable instead of failing at runtime.
 */

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

type EnvLike = Record<string, string | undefined>;

export function getLiveKitConfig(env: EnvLike = process.env): LiveKitConfig | null {
  const url = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export function isCallConfigured(env: EnvLike = process.env): boolean {
  return getLiveKitConfig(env) !== null;
}

/**
 * Map a Sphere room to a LiveKit room name. Prefixed so Sphere rooms can never
 * collide with unrelated LiveKit rooms on the same project.
 */
export function livekitRoomName(roomId: string): string {
  return `sphere-${roomId}`;
}

export interface CallTokenInput {
  config: LiveKitConfig;
  roomId: string;
  /** Stable, unguessable participant identity (the Sphere user id). */
  identity: string;
  /** Display name shown on the participant tile. */
  name: string;
  /** Hosts get room-admin rights (mute/kick others) inside the call. */
  isHost: boolean;
}

/** Mint a room-scoped access token. Never call this on the client. */
export async function createCallToken(input: CallTokenInput): Promise<string> {
  const token = new AccessToken(input.config.apiKey, input.config.apiSecret, {
    identity: input.identity,
    name: input.name,
    ttl: "2h",
  });
  token.addGrant({
    room: livekitRoomName(input.roomId),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Only the Sphere host may moderate the call.
    roomAdmin: input.isHost,
  });
  return token.toJwt();
}

/** LiveKit's server SDK expects an http(s) URL, not the client's wss:// URL. */
export function livekitHttpUrl(url: string): string {
  return url.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
}

function roomService(config: LiveKitConfig): RoomServiceClient {
  return new RoomServiceClient(livekitHttpUrl(config.url), config.apiKey, config.apiSecret);
}

/**
 * Best-effort host moderation of the call. Returns false when LiveKit is not
 * configured or the participant is not currently in the call — the caller still
 * applies its own room-level effect (kick/ban/mute flag).
 */
export async function removeParticipantFromCall(roomId: string, identity: string): Promise<boolean> {
  const config = getLiveKitConfig();
  if (!config) return false;
  try {
    await roomService(config).removeParticipant(livekitRoomName(roomId), identity);
    return true;
  } catch {
    return false;
  }
}

/** Mute/unmute every published audio track for a participant (best-effort). */
export async function setParticipantMuted(
  roomId: string,
  identity: string,
  muted: boolean
): Promise<boolean> {
  const config = getLiveKitConfig();
  if (!config) return false;
  try {
    const svc = roomService(config);
    const room = livekitRoomName(roomId);
    const participants = await svc.listParticipants(room);
    const target = participants.find((p) => p.identity === identity);
    if (!target) return false;
    let changed = false;
    for (const track of target.tracks ?? []) {
      if (track.type === 0 /* AUDIO */) {
        await svc.mutePublishedTrack(room, identity, track.sid, muted);
        changed = true;
      }
    }
    return changed;
  } catch {
    return false;
  }
}
