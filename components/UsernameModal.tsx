"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, Sparkles } from "lucide-react";

export function UsernameModal() {
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setChecking(false);
      return;
    }

    const checkUsername = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          if (!data.user?.username) {
            setShow(true);
          }
        }
      } catch (e) {
        console.error("Error checking username:", e);
      } finally {
        setChecking(false);
      }
    };

    checkUsername();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();

    if (!trimmed || trimmed.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Only letters, numbers, and underscores allowed");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });

      const data = await res.json();

      if (res.ok) {
        setShow(false);
      } else {
        setError(data.message || "Failed to set username");
      }
    } catch (e) {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (checking || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-[#121212] border border-[#27272A] rounded-2xl p-8 max-w-sm w-full shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-[#10B981]" />
            </div>
            <h2 className="text-xl font-heading font-black text-white">
              Pick Your Username
            </h2>
            <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
              This is how you'll appear in rooms, chats, and queues.
              <br />
              Choose something cool — it must be unique!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                <input
                  placeholder="e.g. beatmaster_42"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError("");
                  }}
                  disabled={saving}
                  autoFocus
                  maxLength={20}
                  className="w-full bg-[#090909] border border-[#27272A] text-white text-sm h-11 pl-10 pr-4 rounded-xl placeholder:text-[#71717A] focus:outline-none focus:border-[#10B981]/50 transition-colors"
                />
              </div>
              {error && (
                <p className="text-xs text-red-400 mt-2 pl-1">{error}</p>
              )}
              <p className="text-[10px] text-[#52525B] mt-2 pl-1">
                3–20 characters • Letters, numbers, underscores only
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || !username.trim()}
              className="w-full bg-[#10B981] hover:bg-[#10B981]/90 disabled:opacity-50 text-white h-11 text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Set Username"
              )}
            </button>
          </form>

          <button
            onClick={() => setShow(false)}
            className="w-full text-center text-xs text-[#52525B] hover:text-[#A1A1AA] transition-colors mt-4 cursor-pointer"
          >
            I'll do this later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
