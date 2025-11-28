# Migration Guide - Room-Based Features

## ⚠️ Important: Database Migration Required

Before running the application, you **must** apply the database migration to add room functionality.

## Migration Steps

### 1. Start Your PostgreSQL Database

Make sure your PostgreSQL server is running:
```bash
# Check if PostgreSQL is running
# Windows:
Get-Service postgresql*

# If not running, start it from Services or:
# Start PostgreSQL service
```

### 2. Verify Database Connection

Check your `.env` file has the correct database URL:
```env
DATABASE_URL="postgresql://postgres:randompassword@localhost:5432/postgres"
```

Test the connection:
```bash
npx prisma db pull
```

### 3. Apply the Migration

Run the migration to add the Room model and update the schema:
```bash
npx prisma migrate dev --name add_rooms
```

This will:
- Create the `Room` table
- Add `roomId` foreign key to `Stream` table
- Add `played` and `createdAt` fields to `Stream`
- Add `currentStreamId` to track now playing
- Add cascade delete rules

### 4. Generate Prisma Client

After migration, regenerate the Prisma client:
```bash
npx prisma generate
```

### 5. Verify Migration

Check that all tables exist:
```bash
npx prisma studio
```

You should see:
- User table
- Room table (NEW)
- Stream table (with new fields)
- Upvote table

## Schema Changes Summary

### New Table: Room
```prisma
model Room {
  id               String   @id @default(cuid())
  name             String
  hostId           String
  host             User     @relation(fields: [hostId], references: [id])
  streams          Stream[]
  currentStreamId  String?
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
}
```

### Updated: Stream
**Added fields:**
- `roomId` (required) - Links stream to a room
- `played` - Tracks if song was already played
- `createdAt` - When song was added

**Relations:**
- Added `room` relation
- Added cascade delete (when room deleted, streams deleted)

### Updated: User
**Added relation:**
- `rooms` - User can create multiple rooms

### Updated: Upvote
**Added:**
- Cascade delete on stream deletion

## Breaking Changes

⚠️ **All existing streams in the database will need a roomId**

If you have existing data, you'll need to:
1. Create a default room first
2. Update all existing streams to belong to that room

Or start fresh:
```bash
npx prisma migrate reset --force
```

## Testing the Migration

After migration, test the new features:

1. **Create a room**
   ```bash
   # Via API
   POST /api/rooms
   {
     "name": "Test Room"
   }
   ```

2. **Add a stream to the room**
   ```bash
   POST /api/streams
   {
     "creatorId": "user-id",
     "url": "https://www.youtube.com/watch?v=...",
     "roomId": "room-id"
   }
   ```

3. **Get room details**
   ```bash
   GET /api/rooms/[roomId]
   ```

## Rollback (If Needed)

If you need to undo the migration:
```bash
npx prisma migrate reset
```

Then reapply only previous migrations:
```bash
npx prisma migrate deploy
```

## Troubleshooting

### Error: Can't reach database server
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Verify database exists

### Error: Migration failed
- Check for foreign key conflicts
- Ensure no duplicate data
- Try `npx prisma migrate reset --force` for fresh start

### Error: Generated client out of sync
- Run `npx prisma generate` again
- Restart your development server

## Next Steps

After successful migration:
1. Start the dev server: `npm run dev`
2. Sign in with Google
3. Navigate to `/dashboard`
4. Create your first room!

---

**Need help?** Check the full setup guide in `SETUP.md`
