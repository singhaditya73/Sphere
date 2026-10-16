"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Phone,
  PhoneOff,
  Settings,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";

type CallStatus = "idle" | "connecting" | "connected" | "error" | "unconfigured";

interface ParticipantView {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  videoTrack: unknown | null;
  screenTrack: unknown | null;
  audioTrack: unknown | null;
}

interface VideoCallProps {
  roomId: string;
  /** Whether calling is allowed in this room (room.callsEnabled && active). */
  enabled: boolean;
  isHost: boolean;
}

function upsert(list: ParticipantView[], identity: string, patch: Partial<ParticipantView>): ParticipantView[] {
  const index = list.findIndex((p) => p.identity === identity);
  if (index === -1) {
    return [...list, { identity, name: identity, isLocal: false, isSpeaking: false, micEnabled: false, cameraEnabled: false, videoTrack: null, screenTrack: null, audioTrack: null, ...patch }];
  }
  const next = [...list];
  next[index] = { ...next[index], ...patch };
  return next;
}

/** Attach/detach a LiveKit track to a media element without React fighting us. */
function MediaTile({ track, kind }: { track: unknown; kind: "video" | "audio" }) {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    const t = track as { attach?: (el: HTMLElement) => void; detach?: (el: HTMLElement) => void } | null;
    if (!el || !t?.attach) return;
    t.attach(el as HTMLElement);
    return () => {
      try {
        t.detach?.(el as HTMLElement);
      } catch {
        /* ignore */
      }
    };
  }, [track]);

  if (kind === "audio") {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio ref={ref as React.RefObject<HTMLAudioElement>} autoPlay />;
  }
  return (
    <video
      ref={ref as React.RefObject<HTMLVideoElement>}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
    />
  );
}

/**
 * In-room video calling backed by LiveKit.
 *
 * The token is minted server-side per room and per user; this component only
 * ever holds a short-lived JWT. Camera/mic tracks are stopped on leave so the
 * browser's recording indicator clears. Leaving the call does not leave the
 * Sphere room.
 */
export function VideoCall({ roomId, enabled, isHost }: VideoCallProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState<ParticipantView[]>([]);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [mics, setMics] = useState<{ id: string; label: string }[]>([]);

  const roomRef = useRef<any>(null);

  const resetState = useCallback(() => {
    setParticipants([]);
    setMicOn(false);
    setCamOn(false);
    setSharing(false);
  }, []);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
    }
    resetState();
    setStatus("idle");
  }, [resetState]);

  // Always clean up on unmount so tracks never linger.
  useEffect(() => () => void leave(), [leave]);

  const refreshDevices = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const cams = await room.getLocalDevices("videoinput");
      const ms = await room.getLocalDevices("audioinput");
      setCameras(cams.map((d: MediaDeviceInfo) => ({ id: d.deviceId, label: d.label || "Camera" })));
      setMics(ms.map((d: MediaDeviceInfo) => ({ id: d.deviceId, label: d.label || "Microphone" })));
    } catch {
      /* device enumeration may be blocked until permission is granted */
    }
  }, []);

  const join = useCallback(async () => {
    setStatus("connecting");
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/call/token`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.status === 503) {
        setStatus("unconfigured");
        setError(body?.message || "Video calling is not configured.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setError(body?.message || "Could not join the call.");
        return;
      }

      const { Room, RoomEvent, Track } = await import("livekit-client");
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const toView = (participant: any): ParticipantView => ({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isLocal: participant.isLocal,
        isSpeaking: participant.isSpeaking,
        micEnabled: participant.isMicrophoneEnabled,
        cameraEnabled: participant.isCameraEnabled,
        videoTrack: participant.getTrackPublication?.(Track.Source.Camera)?.videoTrack ?? null,
        screenTrack: participant.getTrackPublication?.(Track.Source.ScreenShare)?.videoTrack ?? null,
        audioTrack: participant.getTrackPublication?.(Track.Source.Microphone)?.audioTrack ?? null,
      });

      const syncAll = () => {
        const list: ParticipantView[] = [];
        for (const participant of [room.localParticipant, ...room.remoteParticipants.values()]) {
          list.push(toView(participant));
        }
        setParticipants(list);
        setMicOn(room.localParticipant.isMicrophoneEnabled);
        setCamOn(room.localParticipant.isCameraEnabled);
        setSharing(room.localParticipant.isScreenShareEnabled);
      };

      room
        .on(RoomEvent.ParticipantConnected, syncAll)
        .on(RoomEvent.ParticipantDisconnected, syncAll)
        .on(RoomEvent.TrackSubscribed, syncAll)
        .on(RoomEvent.TrackUnsubscribed, syncAll)
        .on(RoomEvent.LocalTrackPublished, syncAll)
        .on(RoomEvent.LocalTrackUnpublished, syncAll)
        .on(RoomEvent.TrackMuted, syncAll)
        .on(RoomEvent.TrackUnmuted, syncAll)
        .on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
          const ids = new Set(speakers.map((s) => s.identity));
          setParticipants((prev) =>
            prev.map((p) => ({ ...p, isSpeaking: ids.has(p.identity) }))
          );
        })
        .on(RoomEvent.Disconnected, () => {
          resetState();
          setStatus("idle");
          roomRef.current = null;
        });

      await room.connect(body.url, body.token);
      // Start with the mic only; camera is opt-in so joining is lightweight.
      await room.localParticipant.setMicrophoneEnabled(true);
      try {
        await room.startAudio();
      } catch {
        /* audio may need a user gesture; the mute button doubles as the gesture */
      }
      syncAll();
      void refreshDevices();
      setStatus("connected");
    } catch (e) {
      console.error("Call join failed:", e);
      setStatus("error");
      setError(
        "Could not access your camera or microphone. Check browser permissions and try again."
      );
      void leave();
    }
  }, [leave, refreshDevices, resetState, roomId]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
    if (next) void refreshDevices();
  }, [refreshDevices]);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
    if (next) void refreshDevices();
  }, [refreshDevices]);

  const toggleShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const next = !room.localParticipant.isScreenShareEnabled;
      await room.localParticipant.setScreenShareEnabled(next, { audio: true });
      setSharing(next);
    } catch {
      setError("Screen sharing was cancelled or is not supported on this device.");
    }
  }, []);

  const switchDevice = useCallback(async (kind: "videoinput" | "audioinput", deviceId: string) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.switchActiveDevice(kind, deviceId);
    } catch {
      setError("Could not switch device.");
    }
  }, []);

  const screenSharer = participants.find((p) => p.screenTrack);

  if (!enabled) return null;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle video call"
        className="fixed bottom-24 left-4 sm:left-6 z-40 h-11 rounded-full px-4 bg-[#121212]/95 backdrop-blur-md border border-[#27272A] hover:border-[#10B981]/50 text-white text-xs font-bold inline-flex items-center gap-2 shadow-2xl transition-colors cursor-pointer"
      >
        <Phone className="w-4 h-4 text-[#10B981]" />
        {status === "connected" ? `Call · ${participants.length}` : "Call"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-40 left-4 right-4 sm:right-auto sm:w-[380px] z-40 bg-[#121212]/98 backdrop-blur-md border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272A]/60">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#10B981]" /> Room Call
                {status === "connected" && (
                  <span className="text-[10px] text-[#A1A1AA] normal-case font-medium">· {participants.length} in call</span>
                )}
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Hide call panel"
                className="w-7 h-7 rounded-full border border-[#27272A] text-[#A1A1AA] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[52vh] overflow-y-auto">
              {status === "idle" && (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-[#A1A1AA]">
                    Join the room call to talk, share your screen, or listen in.
                  </p>
                  <button
                    onClick={join}
                    className="h-10 px-6 rounded-full bg-[#10B981] hover:bg-[#10B981]/90 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" /> Join call
                  </button>
                </div>
              )}

              {status === "connecting" && (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#A1A1AA]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" /> Connecting…
                </div>
              )}

              {(status === "error" || status === "unconfigured") && (
                <div className="space-y-3">
                  <p className="text-xs text-[#F59E0B]">{error}</p>
                  {status === "unconfigured" && (
                    <p className="text-[10px] text-[#71717A] leading-relaxed">
                      An administrator must set <code>LIVEKIT_URL</code>, <code>LIVEKIT_API_KEY</code> and{" "}
                      <code>LIVEKIT_API_SECRET</code> to enable calling.
                    </p>
                  )}
                  <button
                    onClick={join}
                    className="h-9 px-4 rounded-full border border-[#27272A] text-white text-xs font-bold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {status === "connected" && (
                <>
                  {screenSharer?.screenTrack ? (
                    <div className="rounded-xl overflow-hidden border border-[#10B981]/40 bg-black aspect-video">
                      <MediaTile track={screenSharer.screenTrack} kind="video" />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    {participants.map((p) => (
                      <div
                        key={p.identity}
                        className={`relative rounded-xl overflow-hidden border bg-black aspect-video ${
                          p.isSpeaking ? "border-[#10B981]" : "border-[#27272A]"
                        }`}
                      >
                        {p.cameraEnabled && p.videoTrack ? (
                          <MediaTile track={p.videoTrack} kind="video" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[#10B981] bg-[#18181B]">
                            {(p.name || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {!p.isLocal && p.audioTrack ? <MediaTile track={p.audioTrack} kind="audio" /> : null}
                        <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1 text-[9px] text-white bg-black/50 rounded px-1.5 py-0.5">
                          {p.micEnabled ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5 text-[#F87171]" />}
                          <span className="truncate">{p.name}{p.isLocal ? " (you)" : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {error && <p className="text-[10px] text-[#F87171]">{error}</p>}

                  {devicesOpen && (
                    <div className="space-y-2 border-t border-[#27272A]/60 pt-3">
                      <label className="block text-[9px] uppercase tracking-wider text-[#A1A1AA]">Camera</label>
                      <select
                        onChange={(e) => switchDevice("videoinput", e.target.value)}
                        className="w-full bg-[#090909] border border-[#27272A] rounded-lg h-8 px-2 text-[11px] text-white"
                      >
                        {cameras.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                      <label className="block text-[9px] uppercase tracking-wider text-[#A1A1AA]">Microphone</label>
                      <select
                        onChange={(e) => switchDevice("audioinput", e.target.value)}
                        className="w-full bg-[#090909] border border-[#27272A] rounded-lg h-8 px-2 text-[11px] text-white"
                      >
                        {mics.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {status === "connected" && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[#27272A]/60">
                <button
                  onClick={toggleMic}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  aria-pressed={micOn}
                  className={`h-9 w-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                    micOn ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]" : "bg-[#7F1D1D]/20 border-[#EF4444]/30 text-[#F87171]"
                  }`}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleCam}
                  aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                  aria-pressed={camOn}
                  className={`h-9 w-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                    camOn ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]" : "bg-[#090909] border-[#27272A] text-[#A1A1AA]"
                  }`}
                >
                  {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleShare}
                  aria-label={sharing ? "Stop sharing screen" : "Share your screen"}
                  aria-pressed={sharing}
                  className={`h-9 w-9 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                    sharing ? "bg-[#818CF8]/15 border-[#818CF8]/40 text-[#818CF8]" : "bg-[#090909] border-[#27272A] text-[#A1A1AA]"
                  }`}
                >
                  {sharing ? <MonitorX className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setDevicesOpen((v) => !v)}
                  aria-label="Device settings"
                  aria-pressed={devicesOpen}
                  className="h-9 w-9 rounded-full flex items-center justify-center border bg-[#090909] border-[#27272A] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={leave}
                  aria-label="Leave call"
                  className="h-9 px-4 rounded-full bg-[#7F1D1D]/20 border border-[#EF4444]/30 text-[#F87171] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#7F1D1D]/30 transition-colors cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" /> Leave
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
