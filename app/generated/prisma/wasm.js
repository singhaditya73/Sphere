
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  username: 'username',
  provider: 'provider'
};

exports.Prisma.RoomScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  mode: 'mode',
  hostId: 'hostId',
  currentStreamId: 'currentStreamId',
  isActive: 'isActive',
  isPlaying: 'isPlaying',
  playbackPosition: 'playbackPosition',
  playbackStartedAt: 'playbackStartedAt',
  createdAt: 'createdAt',
  visibility: 'visibility',
  description: 'description',
  category: 'category',
  isLocked: 'isLocked',
  chatMode: 'chatMode',
  addMode: 'addMode',
  callsEnabled: 'callsEnabled',
  endedAt: 'endedAt'
};

exports.Prisma.StreamScalarFieldEnum = {
  id: 'id',
  type: 'type',
  url: 'url',
  extractedId: 'extractedId',
  title: 'title',
  artist: 'artist',
  duration: 'duration',
  smallImg: 'smallImg',
  bigImg: 'bigImg',
  previewUrl: 'previewUrl',
  mediaType: 'mediaType',
  category: 'category',
  active: 'active',
  played: 'played',
  userId: 'userId',
  roomId: 'roomId',
  createdAt: 'createdAt'
};

exports.Prisma.UpvoteScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  streamId: 'streamId'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  text: 'text',
  userId: 'userId',
  roomId: 'roomId',
  createdAt: 'createdAt'
};

exports.Prisma.RoomParticipantScalarFieldEnum = {
  id: 'id',
  roomId: 'roomId',
  userId: 'userId',
  role: 'role',
  isMuted: 'isMuted',
  joinedAt: 'joinedAt',
  lastSeenAt: 'lastSeenAt'
};

exports.Prisma.RoomInviteScalarFieldEnum = {
  id: 'id',
  token: 'token',
  roomId: 'roomId',
  createdById: 'createdById',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  uses: 'uses',
  maxUses: 'maxUses',
  createdAt: 'createdAt'
};

exports.Prisma.RoomBanScalarFieldEnum = {
  id: 'id',
  roomId: 'roomId',
  userId: 'userId',
  createdById: 'createdById',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.ReactionScalarFieldEnum = {
  id: 'id',
  roomId: 'roomId',
  userId: 'userId',
  emoji: 'emoji',
  streamId: 'streamId',
  createdAt: 'createdAt'
};

exports.Prisma.PollScalarFieldEnum = {
  id: 'id',
  roomId: 'roomId',
  createdById: 'createdById',
  question: 'question',
  isClosed: 'isClosed',
  closesAt: 'closesAt',
  createdAt: 'createdAt'
};

exports.Prisma.PollOptionScalarFieldEnum = {
  id: 'id',
  pollId: 'pollId',
  label: 'label',
  position: 'position'
};

exports.Prisma.PollVoteScalarFieldEnum = {
  id: 'id',
  pollId: 'pollId',
  optionId: 'optionId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.BattleScalarFieldEnum = {
  id: 'id',
  roomId: 'roomId',
  createdById: 'createdById',
  isClosed: 'isClosed',
  createdAt: 'createdAt'
};

exports.Prisma.BattleEntryScalarFieldEnum = {
  id: 'id',
  battleId: 'battleId',
  streamId: 'streamId',
  position: 'position'
};

exports.Prisma.BattleVoteScalarFieldEnum = {
  id: 'id',
  battleId: 'battleId',
  entryId: 'entryId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.RoomFavoriteScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  roomId: 'roomId',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Provider = exports.$Enums.Provider = {
  Google: 'Google'
};

exports.RoomMode = exports.$Enums.RoomMode = {
  dj: 'dj',
  listen_together: 'listen_together'
};

exports.RoomVisibility = exports.$Enums.RoomVisibility = {
  public: 'public',
  unlisted: 'unlisted',
  private: 'private'
};

exports.ChatMode = exports.$Enums.ChatMode = {
  all: 'all',
  hosts: 'hosts',
  muted: 'muted'
};

exports.AddMode = exports.$Enums.AddMode = {
  all: 'all',
  hosts: 'hosts'
};

exports.StreamType = exports.$Enums.StreamType = {
  Spotify: 'Spotify',
  Youtube: 'Youtube',
  Itunes: 'Itunes'
};

exports.ParticipantRole = exports.$Enums.ParticipantRole = {
  host: 'host',
  guest: 'guest'
};

exports.Prisma.ModelName = {
  User: 'User',
  Room: 'Room',
  Stream: 'Stream',
  Upvote: 'Upvote',
  Message: 'Message',
  RoomParticipant: 'RoomParticipant',
  RoomInvite: 'RoomInvite',
  RoomBan: 'RoomBan',
  Reaction: 'Reaction',
  Poll: 'Poll',
  PollOption: 'PollOption',
  PollVote: 'PollVote',
  Battle: 'Battle',
  BattleEntry: 'BattleEntry',
  BattleVote: 'BattleVote',
  RoomFavorite: 'RoomFavorite'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
