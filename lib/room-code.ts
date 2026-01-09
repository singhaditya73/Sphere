// Generate a short, memorable room code
// Format: BEAT-XXXX (4 alphanumeric characters, avoiding ambiguous chars)

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1, L

export function generateRoomCode(): string {
  let code = 'BEAT-';
  for (let i = 0; i < 4; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

// Check if a string looks like a room code vs a UUID
export function isRoomCode(input: string): boolean {
  return /^BEAT-[A-Z0-9]{4}$/i.test(input);
}

// Normalize input (handles both code and UUID)
export function normalizeRoomInput(input: string): { type: 'code' | 'id', value: string } {
  const trimmed = input.trim().toUpperCase();
  if (isRoomCode(trimmed)) {
    return { type: 'code', value: trimmed };
  }
  // Extract from URL if pasted
  if (input.includes('/room/')) {
    const id = input.split('/room/')[1].split('?')[0].trim();
    return { type: isRoomCode(id.toUpperCase()) ? 'code' : 'id', value: id };
  }
  return { type: 'id', value: input.trim() };
}
