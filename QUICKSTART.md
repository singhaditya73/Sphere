# Quick Start Guide 🚀

Get BeatNet running in 5 minutes!

## Prerequisites ✓

- ✅ Node.js 18+ installed
- ✅ PostgreSQL installed and running
- ✅ Google OAuth credentials (or use existing ones in `.env`)

## Step-by-Step Setup

### 1. Start PostgreSQL

**Windows:**
```powershell
# Check if running
Get-Service postgresql*

# Start if needed
Start-Service postgresql-x64-[version]
```

### 2. Verify Environment

Check `.env` file has:
```env
DATABASE_URL="postgresql://postgres:randompassword@localhost:5432/postgres"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### 3. Run Database Migration

```powershell
npx prisma migrate dev --name add_rooms
```

Expected output:
```
✔ Generated Prisma Client
✔ Applied migration
```

### 4. Generate Prisma Client

```powershell
npx prisma generate
```

### 5. Start Development Server

```powershell
npm run dev
```

### 6. Open Application

Visit: http://localhost:3000

## First-Time Usage

### Create Your First Room

1. Click **"Enter Rooms"** on homepage
2. Sign in with Google
3. Click **"Create Room"**
4. Enter room name (e.g., "My Party")
5. Click **"Create"**

### Add Your First Song

1. Go to YouTube
2. Copy any video URL (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)
3. Paste in "Add to Queue" input
4. Click **"Add Song"**
5. Watch it appear in the queue!

### Test Voting

1. Click the **upvote button** (thumbs up)
2. Number increases
3. Song moves up in queue
4. Button becomes filled/highlighted

### Play Music

1. As room host, click **"Start Playing"** or **"Next Track"**
2. Top song moves to "Now Playing"
3. Click the link to open in YouTube/Spotify

### Invite Friends

1. Share the room URL: `http://localhost:3000/room/[your-room-id]`
2. Friends sign in with Google
3. Everyone can add songs and vote!

## Troubleshooting

### Database Connection Error

```
Error: Can't reach database server
```

**Solution:**
- Start PostgreSQL service
- Check DATABASE_URL in `.env`
- Verify port 5432 is not blocked

### Migration Already Applied

```
Error: Migration already applied
```

**Solution:** Already done! Skip to step 4.

### Prisma Client Out of Sync

```
Error: Generated Client is outdated
```

**Solution:**
```powershell
npx prisma generate
```

### Port 3000 Already in Use

```
Error: Port 3000 is already in use
```

**Solution:**
```powershell
# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or change port in package.json
```

## Testing Checklist

- [ ] Can visit homepage
- [ ] Can sign in with Google
- [ ] Can see dashboard
- [ ] Can create a room
- [ ] Can add YouTube link
- [ ] Can add Spotify link
- [ ] Can upvote a song
- [ ] Can see queue reorder
- [ ] Can click "Next Track" (as host)
- [ ] Can see "Now Playing" update
- [ ] Can leave room

## Common Commands

```powershell
# Start dev server
npm run dev

# View database in browser
npx prisma studio

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset --force

# Check for errors
npm run build

# Format code
npm run lint
```

## Development Tips

### Hot Reload Not Working?

- Save file with Ctrl+S
- Check terminal for errors
- Restart dev server: Ctrl+C, then `npm run dev`

### Changes Not Showing?

- Hard refresh: Ctrl+Shift+R
- Clear browser cache
- Check browser console for errors

### Database Changes?

```powershell
# After editing schema.prisma
npx prisma migrate dev --name describe_your_changes
npx prisma generate
```

## File Structure Reference

```
beatnet/
├── app/
│   ├── dashboard/          👈 Room browser page
│   ├── room/[roomId]/      👈 Individual room page
│   └── api/                👈 All backend endpoints
├── components/             👈 UI components
├── prisma/
│   └── schema.prisma       👈 Database schema
└── .env                    👈 Environment variables
```

## Environment Variables Explained

```env
# Your PostgreSQL connection
DATABASE_URL="postgresql://user:password@host:port/database"

# From Google Cloud Console > APIs & Services > Credentials
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# For NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="random-string-here"

# Your app URL
NEXTAUTH_URL="http://localhost:3000"
```

## Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Go to Credentials
5. Create OAuth 2.0 Client ID
6. Add authorized redirect: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Secret to `.env`

## Next Steps

- 📖 Read [SETUP.md](./SETUP.md) for detailed documentation
- 🔧 Read [MIGRATION.md](./MIGRATION.md) for database details
- 📝 Read [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details

## Need Help?

- Check error messages in terminal
- Check browser console (F12)
- Review logs in `npx prisma studio`
- Open an issue on GitHub

## Success! 🎉

If you can:
- ✅ Create a room
- ✅ Add a song
- ✅ Upvote it
- ✅ See it in the queue

**You're all set!** Enjoy BeatNet! 🎵

---

Happy streaming! 🎊
