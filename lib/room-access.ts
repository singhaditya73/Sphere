/**
 * Server-side room access control.
 *
 * Every mutating route funnels through here so authorization is enforced in one
 * place instead of being re-implemented (and forgotten) per endpoint. The
 * helpers return plain result objects; routes translate them to responses.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { canViewRoom, type RoomPolicy, type ViewerState } from "@/lib/room-policy";
import type { Room, User } from "@/app/generated/prisma";

export interface SessionUser {
  id: string;
  email: string | null;
  username: string | null;
}

export type RoomRow = Room;

export interface RoomContext {
  room: RoomRow;
  user: SessionUser | null;
  isHost: boolean;
  isBanned: boolean;
  /** Signed in, not banned and the room is active. Policy decides the rest. */
  canInteract: boolean;
}

export type AccessFailure = {
  ok: false;
  status: number;
  message: string;
  code?: string;
};

export type AccessResult = { ok: true; ctx: RoomContext } | AccessFailure;

/** Resolve the signed-in user from the session, or null when signed out. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prismaClient.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, username: true },
  });
  return user;
}

/** Build the Prisma `where` for a room id-or-code, optionally including inactive rooms. */
export function roomWhereClause(roomIdParam: string, includeInactive = false) {
  const base = isRoomCode(roomIdParam)
    ? { code: roomIdParam.toUpperCase() }
    : { id: roomIdParam };
  return includeInactive ? base : { ...base, isActive: true };
}

export async function resolveRoom(roomIdParam: string, includeInactive = false): Promise<RoomRow | null> {
  if (!roomIdParam || roomIdParam.length > 128) return null;
  return prismaClient.room.findFirst({ where: roomWhereClause(roomIdParam, includeInactive) });
}

/** Whether an invitation token currently grants access to a room. */
export async function hasValidInvite(roomId: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const invite = await prismaClient.roomInvite.findUnique({ where: { token } });
  if (!invite || invite.roomId !== roomId) return false;
  if (invite.revokedAt) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return false;
  if (invite.maxUses != null && invite.uses >= invite.maxUses) return false;
  return true;
}

/**
 * Whether a user currently has access to a room that requires an invitation:
 * either they present a valid token, or they already redeemed one and are still
 * present in the room.
 */
export async function hasRoomAccess(
  roomId: string,
  userId: string | null,
  token?: string | null
): Promise<boolean> {
  if (await hasValidInvite(roomId, token)) return true;
  if (userId) {
    const participant = await prismaClient.roomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { id: true },
    });
    if (participant) return true;
  }
  return false;
}

/**
 * Load a room plus the caller's relationship to it.
 *
 * @param options.requireUser      reject anonymous callers
 * @param options.includeInactive  allow resolving ended/closed rooms (host recaps)
 * @param options.inviteToken      token presented by the caller (private rooms)
 */
export async function loadRoomContext(
  roomIdParam: string,
  options: { requireUser?: boolean; includeInactive?: boolean; inviteToken?: string | null } = {}
): Promise<AccessResult> {
  const user = await getSessionUser();
  if (options.requireUser && !user) {
    return { ok: false, status: 401, message: "Unauthorized", code: "UNAUTHORIZED" };
  }

  const room = await resolveRoom(roomIdParam, options.includeInactive);
  if (!room) {
    return { ok: false, status: 404, message: "Room not found", code: "ROOM_NOT_FOUND" };
  }

  const isHost = !!user && room.hostId === user.id;

  let isBanned = false;
  if (user && !isHost) {
    const ban = await prismaClient.roomBan.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
      select: { id: true },
    });
    isBanned = ban !== null;
  }

  const canInteract = !!user && !isBanned && room.isActive;
  return { ok: true, ctx: { room, user, isHost, isBanned, canInteract } };
}

/** Enforce that the caller may *see* the room (privacy + ban + active). */
export async function assertCanView(
  ctx: RoomContext,
  inviteToken?: string | null
): Promise<AccessFailure | null> {
  const viewer: ViewerState = {
    isHost: ctx.isHost,
    isBanned: ctx.isBanned,
    hasValidInvite: await hasRoomAccess(ctx.room.id, ctx.user?.id ?? null, inviteToken),
  };
  const decision = canViewRoom(ctx.room as Pick<RoomPolicy, "visibility" | "isActive">, viewer);
  if (decision.allowed) return null;

  if (decision.reason === "banned") {
    return { ok: false, status: 403, message: "You have been removed from this room.", code: "BANNED" };
  }
  if (decision.reason === "invite_required") {
    return {
      ok: false,
      status: 403,
      message: "This room is private. A valid invitation is required.",
      code: "INVITE_REQUIRED",
    };
  }
  return { ok: false, status: 404, message: "Room not found", code: "ROOM_NOT_FOUND" };
}

/** Record presence for a signed-in viewer and prune stale participants. */
const lastPrune = new Map<string, number>();

export async function heartbeat(roomId: string, user: SessionUser | null, isHost: boolean): Promise<void> {
  if (!user) return;
  const now = new Date();
  await prismaClient.roomParticipant.upsert({
    where: { roomId_userId: { roomId, userId: user.id } },
    create: { roomId, userId: user.id, role: isHost ? "host" : "guest", lastSeenAt: now },
    update: { lastSeenAt: now, role: isHost ? "host" : "guest" },
  });

  // Prune stale participants, but at most once every 30s per room so the 2s
  // poll loop does not hammer the database with deleteMany on every tick.
  const last = lastPrune.get(roomId) ?? 0;
  if (now.getTime() - last < 30_000) return;
  lastPrune.set(roomId, now.getTime());
  const staleBefore = new Date(now.getTime() - 60_000);
  await prismaClient.roomParticipant.deleteMany({
    where: { roomId, lastSeenAt: { lt: staleBefore } },
  });
}

/** Convenience: the list of users currently present in a room. */
export async function listParticipants(roomId: string) {
  const since = new Date(Date.now() - 60_000);
  const rows = await prismaClient.roomParticipant.findMany({
    where: { roomId, lastSeenAt: { gte: since } },
    include: { user: { select: { id: true, email: true, username: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((row) => ({
    userId: row.userId,
    email: row.user.email,
    username: row.user.username,
    role: row.role,
    isMuted: row.isMuted,
    joinedAt: row.joinedAt,
  }));
}

export type { User };

/**
 * Authorize a queue vote (up/down). Votes may only target a stream in an active
 * room, by a non-banned user, while the room is not locked.
 */
export async function assertCanVote(
  streamId: string,
  user: SessionUser
): Promise<{ ok: true; roomId: string } | AccessFailure> {
  const stream = await prismaClient.stream.findUnique({
    where: { id: streamId },
    select: { id: true, roomId: true, room: { select: { isLocked: true, isActive: true } } },
  });
  if (!stream || !stream.room.isActive) {
    return { ok: false, status: 404, message: "Track not found", code: "STREAM_NOT_FOUND" };
  }
  const ban = await prismaClient.roomBan.findUnique({
    where: { roomId_userId: { roomId: stream.roomId, userId: user.id } },
    select: { id: true },
  });
  if (ban) {
    return { ok: false, status: 403, message: "You have been removed from this room.", code: "BANNED" };
  }
  if (stream.room.isLocked) {
    return { ok: false, status: 403, message: "Voting is paused while this room is locked.", code: "ROOM_LOCKED" };
  }
  return { ok: true, roomId: stream.roomId };
}
