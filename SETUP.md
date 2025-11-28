# BeatNet - Collaborative Music Streaming Platform

BeatNet is a democratic music streaming platform where users join rooms, add songs from YouTube or Spotify, and vote on what plays next. The crowd decides the playlist!

## 🎵 Features

### Room-Based Music Sessions
- **Create Rooms**: Host your own music session with a custom name
- **Join Active Rooms**: Browse and join existing music rooms
- **Real-time Updates**: Queue and votes update automatically every 5 seconds

### Democratic Queue System
- **Add Songs**: Paste YouTube or Spotify links to add songs to the queue
- **Upvote/Downvote**: Vote on songs to influence play order
- **Smart Ordering**: Songs with more upvotes move up in the queue
- **Visual Feedback**: See which songs you've upvoted with highlighted buttons

### Host Controls
- **Play Next**: Room hosts can skip to the next track
- **Auto-play**: System automatically plays the most upvoted song
- **Track History**: Played songs are marked and won't replay

### User Experience
- **Authentication**: Secure Google OAuth login
- **Responsive UI**: Works on desktop and mobile devices
- **Real-time Polling**: Automatic updates without page refresh
- **Rate Limiting**: Prevents spam and abuse

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Google OAuth credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/singhaditya73/BeatNet.git
   cd BeatNet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/beatnet"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Start your PostgreSQL database**
   Make sure PostgreSQL is running on port 5432

5. **Run database migrations**
   ```bash
   npx prisma migrate dev --name add_rooms
   ```

6. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
beatnet/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth authentication
│   │   ├── rooms/         # Room management endpoints
│   │   ├── streams/       # Song/queue management
│   │   └── user/          # User information
│   ├── dashboard/         # Room browser page
│   ├── room/[roomId]/     # Individual room view
│   ├── login/             # Login page
│   └── page.tsx           # Landing page
├── components/            # Reusable UI components
├── lib/                   # Utilities and database
├── prisma/               # Database schema and migrations
└── public/               # Static assets
```

## 🗄️ Database Schema

### Models

**User**
- `id`: Unique identifier
- `email`: User email (from Google OAuth)
- `provider`: Authentication provider (Google)
- Relations: rooms, streams, upvotes

**Room**
- `id`: Unique identifier
- `name`: Room name
- `hostId`: Creator's user ID
- `currentStreamId`: Currently playing track
- `isActive`: Room status
- Relations: host (User), streams

**Stream**
- `id`: Unique identifier
- `type`: Platform (YouTube/Spotify)
- `url`: Original link
- `extractedId`: Video/track ID
- `title`: Song title
- `smallImg`/`bigImg`: Thumbnail images
- `active`: Currently playing flag
- `played`: Already played flag
- `roomId`: Parent room
- Relations: room, user, upvotes

**Upvote**
- `id`: Unique identifier
- `userId`: Voter's user ID
- `streamId`: Target stream
- Relations: user, stream
- Constraint: One vote per user per stream

## 🎯 API Endpoints

### Rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms` - Get all active rooms
- `GET /api/rooms/[roomId]` - Get room details with queue
- `POST /api/rooms/[roomId]/next` - Play next track (host only)

### Streams
- `POST /api/streams` - Add a song to queue
- `GET /api/streams?roomId=xxx` - Get room queue
- `POST /api/streams/upvote` - Upvote a song
- `POST /api/streams/downvote` - Remove upvote
- `GET /api/streams/my-upvotes?roomId=xxx` - Get user's upvoted songs

### User
- `GET /api/user` - Get current user information

## 🎨 UI Components

- **Dashboard Page**: Browse and create rooms
- **Room Page**: View queue, vote, add songs, see now playing
- **Appbar**: Navigation and user menu
- **Real-time Polling**: Auto-refresh every 5-10 seconds

## 🔒 Security Features

- **Rate Limiting**: Max 5 song additions per minute per IP
- **Authentication**: Required for all room/voting actions
- **Validation**: Zod schemas for request validation
- **URL Validation**: Regex checks for YouTube/Spotify links

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **UI**: Tailwind CSS + shadcn/ui components
- **Validation**: Zod
- **Icons**: Lucide React

## 📝 Usage Flow

1. **Sign in** with Google account
2. **Create or join** a music room
3. **Add songs** by pasting YouTube or Spotify links
4. **Vote** on songs to influence the queue order
5. **Host** can skip tracks or let them play automatically
6. **Watch** the queue update in real-time as others vote

## 🎵 Supported Platforms

- **YouTube**: Full support for video links
  - Format: `https://www.youtube.com/watch?v=VIDEO_ID`
  - Format: `https://youtu.be/VIDEO_ID`

- **Spotify**: Link support (playback requires Spotify Web Player integration)
  - Format: `https://open.spotify.com/track/TRACK_ID`

## 🚧 Future Enhancements

- [ ] WebSocket integration for instant updates
- [ ] Spotify Web Player integration for in-app playback
- [ ] Room chat functionality
- [ ] Playlist history and analytics
- [ ] Room privacy settings (public/private)
- [ ] Invite links for rooms
- [ ] User profiles and listening stats
- [ ] Search integration for songs

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ by the BeatNet team
