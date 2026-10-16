/**
 * Pure room-policy helpers.
 *
 * Every authorization decision that depends only on room configuration lives
 * here so the API routes, the client UI and the tests share one source of
 * truth. The server is always the enforcement point; the client uses these
 * only to hide controls it cannot use.
 */

export type RoomMode = "dj" | "listen_together";
export type RoomVisibility = "public" | "unlisted" | "private";
export type ChatMode = "all" | "hosts" | "muted";
export type AddMode = "all" | "hosts";

export interface RoomPolicy {
  mode: RoomMode;
  visibility: RoomVisibility;
  isActive: boolean;
  isLocked: boolean;
  chatMode: ChatMode;
  addMode: AddMode;
  callsEnabled: boolean;
}

export interface ViewerState {
  isHost: boolean;
  isBanned: boolean;
  hasValidInvite: boolean;
}

/** Who may add media to the queue. */
export function canAddMedia(room: Pick<RoomPolicy, "isLocked" | "addMode">, isHost: boolean): boolean {
  if (room.isLocked) return false;
  return room.addMode === "all" || isHost;
}

/** Who may post chat messages. Locking a room freezes chat for everyone. */
export function canChat(room: Pick<RoomPolicy, "isLocked" | "chatMode">, isHost: boolean): boolean {
  if (room.isLocked) return false;
  if (room.chatMode === "all") return true;
  if (room.chatMode === "hosts") return isHost;
  return false;
}

/** Who may control shared playback (play/pause/seek/skip). Host-only by design. */
export function canControlPlayback(_room: Pick<RoomPolicy, "mode">, isHost: boolean): boolean {
  return isHost;
}

/** Who may moderate (kick, ban, mute, lock, close polls/battles). */
export function canModerate(_room: Pick<RoomPolicy, "mode">, isHost: boolean): boolean {
  return isHost;
}

/** Who may start/join the in-room call. */
export function canUseCall(room: Pick<RoomPolicy, "callsEnabled" | "isActive">): boolean {
  return room.callsEnabled && room.isActive;
}

/** Who may create polls / battles. Any non-banned participant, per product rules. */
export function canCreateActivity(isHost: boolean, canInteract: boolean): boolean {
  return isHost || canInteract;
}

export interface ViewDecision {
  allowed: boolean;
  reason?: "room_inactive" | "banned" | "invite_required";
}

/**
 * Whether a viewer may load a room at all.
 *
 *  - inactive rooms are visible to the host only (so they can review/recap)
 *  - banned users are blocked
 *  - `private` rooms require a valid invitation token
 */
export function canViewRoom(
  room: Pick<RoomPolicy, "visibility" | "isActive">,
  viewer: ViewerState
): ViewDecision {
  if (viewer.isBanned) return { allowed: false, reason: "banned" };
  if (!room.isActive && !viewer.isHost) return { allowed: false, reason: "room_inactive" };
  if (room.visibility === "private" && !viewer.isHost && !viewer.hasValidInvite) {
    return { allowed: false, reason: "invite_required" };
  }
  return { allowed: true };
}

/** Whether a room should appear in the public directory. */
export function isListedPublicly(room: Pick<RoomPolicy, "visibility" | "isActive">): boolean {
  return room.visibility === "public" && room.isActive;
}
