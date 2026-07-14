# ChatStream — Architecture Decision Record (ADR-001)

Status: Accepted
Date: 2026-07-15
Author: [Your Name]

## Context

ChatStream is a full-stack real-time chat platform (MERN + Socket.io) supporting
1-to-1 messaging, group chats, media sharing, online presence, and detailed
read receipts. This document records the core data modeling and real-time
communication decisions made before implementation began.

## Decisions

### 1. Single unified Conversation model (not separate Direct/Group models)

Rather than creating separate `DirectChat` and `GroupChat` collections, we use
one `Conversation` model with an `isGroup` boolean flag.

Reasoning: A direct chat and a group chat are structurally the same thing —
a set of participants exchanging messages. Splitting them into two models
would duplicate message-fetching logic, socket room logic, and querying logic
across the codebase. A single model with a flag keeps the system DRY and
mirrors how production messaging apps (WhatsApp, Telegram) structure this
internally.

### 2. Denormalized `lastMessage` reference on Conversation

The `Conversation` model stores a reference to its most recent `Message`,
rather than requiring a live query against the Messages collection every time
a chat list is rendered.

**Reasoning:** The inbox/chat-list view needs to show a message preview for
every conversation on every load. Querying and sorting the Messages
collection per conversation, per load, doesn't scale. Storing a direct
reference trades a small amount of denormalization for significant read
performance — a standard practice for high-read, list-preview UI patterns.

### 3. Detailed read receipts via `readBy` array on Message

Each `Message` stores a `readBy: [ObjectId]` array (referencing Users) rather
than a simple boolean `isRead` flag.

Reasoning: In group conversations, "read" is not binary — different
members read messages at different times, and the UI needs to reflect
"read by 4 of 6" or show which specific users have seen a message
(Messenger-style), not just a delivered/read toggle. The array approach
handles both 1-to-1 (0 or 1 entries) and group cases (N entries) with a
single schema, avoiding a model split later.

### 4. Presence (`status`, `lastSeen`) persisted on User document

Online/offline status is stored on the `User` model itself, updated on
socket connect/disconnect, rather than held only in server memory.

Reasoning: In-memory presence tracking is lost on server restart or
across multiple server instances (relevant if we later scale horizontally).
Persisting status to the database means presence data survives restarts and
can be queried through normal REST endpoints without an active socket
connection.

### 5. Explicit Socket.io event contract, defined before implementation

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `user:online` | Client → Server → Broadcast | `{ userId }` | Notify others when a user connects |
| `user:offline` | Server → Broadcast | `{ userId, lastSeen }` | Notify others when a user disconnects |
| `message:send` | Client → Server | `{ conversationId, content, mediaUrl? }` | Client sends a new message |
| `message:receive` | Server → Client(s) | full Message object | Server pushes new message to participants |
| `message:read` | Client → Server → Broadcast | `{ messageId, userId }` | Mark a message as read |
| `typing:start` | Client → Server → Broadcast | `{ conversationId, userId }` | Show typing indicator |
| `typing:stop` | Client → Server → Broadcast | `{ conversationId, userId }` | Hide typing indicator |

Reasoning: Defining event names and payload shapes up front prevents ad
hoc event naming as features are added, which is a common source of
unmaintainable real-time codebases. This table is the source of truth for
both client and server socket handlers.

## Data Models Summary

### User
username, email, password (hashed), avatar, bio,
status ("online" | "offline"), lastSeen, createdAt

### Conversation
isGroup, participants[], groupName, groupAvatar,
groupAdmins[], lastMessage (ref), createdAt

### Message
conversationId (ref), sender (ref), content, mediaUrl,
mediaType, readBy[] (ref), createdAt

## Consequences

- Slightly more complex query logic on the frontend to compute "read by X of Y"
  from an array, versus a simple boolean check — acceptable trade-off for
  the added functionality.
- `lastMessage` denormalization requires updating the Conversation document
  every time a new message is created — handled in the message creation
  controller/socket handler, documented here so it isn't missed during
  implementation.