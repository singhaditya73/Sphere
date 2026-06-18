# Sphere

> **Music Powered by Democracy**

BeatNet is a collaborative music streaming platform where users join rooms, add songs from YouTube or Spotify, and vote on what plays next. Let the crowd decide the playlist!

## ✨ Features

- 🎪 **Room-Based Sessions** - Create or join music rooms
- 🔗 **Multi-Platform** - Support for YouTube and Spotify links
- 👍 **Democratic Voting** - Upvote songs to influence the queue
- 🎵 **Smart Queue** - Songs ordered by popularity
- 👑 **Host Controls** - Room creators can manage playback
- 🔄 **Real-time Updates** - Live queue and vote updates
- 🔐 **Secure Auth** - Google OAuth integration
- 📱 **Responsive Design** - Works on all devices

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
# DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# Run database migrations
npx prisma migrate dev --name add_rooms

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 📖 Documentation

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

- **YouTube** - Full video link support
- **Spotify** - Track link support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
