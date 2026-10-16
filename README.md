# Sphere

> **Music Powered by Democracy**

BeatNet is a collaborative music streaming platform where users join rooms, search or paste songs (YouTube, Spotify, or keyless iTunes previews), and vote on what plays next. Let the crowd decide the playlist!

## ✨ Features

- 🎪 **Room-Based Sessions** - Create or join music rooms
- 🔎 **Native Song Search** - Find tracks inside a room with the Add Song dialog (keyless iTunes previews, or full-length YouTube with an API key)
- 📺 **Universal Media** - One shared queue for music, music videos and general videos (filter by Music / Videos / All media)
- 🔗 **Multi-Platform** - Support for YouTube and Spotify links
- 👍 **Democratic Voting** - Upvote songs to influence the queue
- 🎵 **Smart Queue** - Songs ordered by popularity
- 👑 **Host Controls** - Room creators can manage playback, kick/ban, mute, lock the room and restrict chat or adding
- 🔐 **Private Rooms & Invites** - Public / unlisted / private visibility, QR + link invites, rotate/revoke
- 📹 **Integrated Calls** - Optional LiveKit audio/video calls with screen sharing (host-gated, no recording)
- 😀 **Reactions, Polls & Battles** - Live emoji reactions (kept separate from upvotes), polls and song battles
- 🤖 **AI Companion** - Suggests real media via the search provider (never auto-queues anything)
- 📺 **Party Mode** - A TV-friendly, read-only display with QR join and configurable privacy toggles
- 🔄 **Real-time Updates** - Live queue and vote updates
- 📱 **Responsive Design** - Works on all devices

See **[SPHERE_2.0.md](./SPHERE_2.0.md)** for the full feature breakdown, environment setup and phased checklist.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database running
- Google OAuth credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/singhaditya73/BeatNet.git
cd BeatNet

# Install dependencies
npm install

# Set up environment variables (see .env.example)
# DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET
# YOUTUBE_API_KEY (optional — full-length YouTube; otherwise keyless iTunes previews)
# LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET (optional — in-room calls)
# GROQ_API_KEY (+ optional AI_MODEL / AI_BASE_URL) (optional — AI room companion)

# Sync the database schema with Prisma (see SPHERE_2.0.md for notes)
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 📖 Documentation

- **[SONG_SEARCH.md](./SONG_SEARCH.md)** - Native song search, provider setup, API and limits
- **[SETUP.md](./SETUP.md)** - Complete setup guide and feature documentation
- **[MIGRATION.md](./MIGRATION.md)** - Database migration instructions

## 🎯 How It Works

1. **Sign In** - Authenticate with your Google account
2. **Browse Rooms** - See all active music sessions
3. **Create/Join** - Start your own room or join an existing one
4. **Add Songs** - Paste YouTube or Spotify links
5. **Vote** - Upvote your favorite tracks
6. **Enjoy** - Watch the most popular songs play first!

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma
- **Auth**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Music Search**: keyless iTunes Search API by default; YouTube Data API v3 when keyed (server-side provider abstraction)
- **Calls**: LiveKit (`livekit-client` + `livekit-server-sdk`), server-minted room tokens
- **QR codes**: generated server-side with `qrcode` (no third-party image service)
- **AI companion**: Groq (OpenAI-compatible) by default, server-side only
- **Tests**: Node.js built-in test runner (`npm test`)

## 📁 Project Structure

```
beatnet/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Room browser
│   ├── room/[roomId]/    # Room interface
│   └── page.tsx          # Landing page
├── components/           # UI components
├── prisma/              # Database schema
└── lib/                 # Utilities
```

## 🎵 Supported Platforms

- **YouTube** - Full video link support (and full-length in-app search with an API key)
- **Spotify** - Track link support
- **iTunes / Apple Music** - Keyless in-app search with 30-second preview playback

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
