# SyncParty - Scalable YouTube Watch Party Platform

[![GitHub Repo](https://img.shields.io/badge/GitHub-SyncParty-black?style=for-the-badge&logo=github)](https://github.com/souravchoudhary7773-hue/SyncParty)
![Architecture](https://img.shields.io/badge/Architecture-Clean%20OOP-emerald?style=for-the-badge)
![WebSockets](https://img.shields.io/badge/Real--Time-Socket.IO%204.x-blue?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-MongoDB%20%2B%20Mongoose-green?style=for-the-badge)
![Scalability](https://img.shields.io/badge/Scaling-Redis%20Adapter%20Ready-red?style=for-the-badge)

SyncParty is a production-grade, highly scalable **YouTube Watch Party** real-time synchronization platform. It enables users to watch YouTube videos together with frame-accurate video state sync, role-based permission control (RBAC), real-time chat, floating emoji reactions, and horizontal WebSocket server scaling architecture.

---

## 🌟 Key Features

### 1. Real-Time Video Synchronization
- **Playback Sync**: Play, pause, seek, and video URL changes are broadcast instantly to room participants via WebSockets.
- **Drift Compensation Algorithm**: Client-side YouTube IFrame player monitors time drift relative to server timestamp. If drift exceeds **1.5 seconds**, automatically seeks to the exact frame to eliminate jumpy sync loops.
- **Throttling & Debouncing**: Server debounces rapid-fire seek scrubbing events to prevent broadcast storms.

### 2. Role-Based Access Control (RBAC)
- **Host**: Automatically assigned to the room creator. Full access to playback controls, video changes, role management (promote/demote), kicking users, and transferring host privileges.
- **Moderator**: Assigned by the Host. Access to play/pause, seek, and change video.
- **Participant / Viewer**: Default for joiners. Watch-only mode with locked UI playback controls and strict server-side validation matrix rejecting unauthorized events.
- **Auto-Host Reassignment**: If a host leaves the room, the system automatically promotes the next oldest participant to Host.

### 3. High-Concurrency Scalability & System Design
- **Redis Pub/Sub Socket.IO Adapter**: Architecture pre-configured for `@socket.io/redis-adapter` so multiple WebSocket backend instances can run behind a Layer 7 Load Balancer.
- **Single-Snapshot Join Fanout**: When a participant joins (`join_room`), the server transmits a single compressed snapshot containing room state, current playback position, member list, and last 50 chat messages.
- **MongoDB Persistence Layer**: Persistent storage for active rooms, playback states, user sessions, and chat audit logs using Mongoose models. Includes auto-fallback to `mongodb-memory-server` for zero-setup local dev.

### 4. Interactive Experience
- **Real-Time Text Chat**: Room chat with system log entries (joins, leaves, role updates, video changes).
- **Floating Emoji Reactions**: Live emoji reaction particle burst overlaid on the video player screen.
- **Shareable Deep Links**: Instant room code generation with shareable URL parameters (`?room=XXXXXX`).

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Responsive UI, state management, glassmorphic dark theme |
| **Backend** | Node.js + Express + TypeScript | REST API endpoints, health check, room routing |
| **Real-time Engine** | Socket.IO 4.x | Bidirectional WebSockets with transport fallback |
| **Database** | MongoDB + Mongoose | Room persistence, session history, chat audit logs |
| **Scalability** | Redis Adapter (`ioredis`) | Pub/Sub cross-server broadcast for multi-instance clusters |
| **Video Engine** | YouTube IFrame Player API | Synchronized embedded video player |

---

## 🏛 System Architecture & WebSocket Flow

```
+-------------------------------------------------------------------------------+
|                                 CLIENT SIDE                                   |
|  +-------------------------------------------------------------------------+  |
|  | Modern React + TS UI (Glassmorphic, Responsive)                          |  |
|  | - YouTube Iframe API Sync Player (Drift Compensation & Throttling)      |  |
|  | - RBAC Control Bar (Play/Pause/Seek disabled for Participants)           |  |
|  | - Real-time Participant Sidebar with Role Badges & Host Actions         |  |
|  | - Real-time Chat & Floating Emoji Reaction Overlay                      |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
                                      |
                                      | WebSockets (Socket.IO w/ Fallback)
                                      v
+-------------------------------------------------------------------------------+
|                            BACKEND SERVER (Node + TS)                          |
|  +-------------------------------------------------------------------------+  |
|  | Express HTTP Server & API Routes                                        |  |
|  | - Health Check & System Stats (`/api/health`, `/api/rooms/:id`)        |  |
|  +-------------------------------------------------------------------------+  |
|  | Socket.IO Server & Router Layer                                          |  |
|  | - Event Deserializer & Validator                                        |  |
|  +-------------------------------------------------------------------------+  |
|  | Object-Oriented Domain Layer (Clean OOP Architecture)                     |  |
|  | - `RoomManager`: Handles room lifecycle, lookup, horizontal distribution |  |
|  | - `Room`: Encapsulates video state, participant list, chat & RBAC rules   |  |
|  | - `User`: Participant state, socket mappings, permissions               |  |
|  | - `PermissionGuard`: Strict server-side RBAC validation matrix          |  |
|  +-------------------------------------------------------------------------+  |
|  | MongoDB Persistence Layer (Mongoose Schemas & Drivers)                    |  |
|  | - MongoDB Room Collection (`RoomModel`: code, title, videoState, roles)   |  |
|  | - MongoDB Chat & Audit Log Collection (`ChatMessageModel`)              |  |
|  | - Redis Pub/Sub Adapter Support (Socket.IO Redis Adapter abstraction)   |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
                                      |
                                      v
                        +---------------------------+
                        |      MongoDB Database     |
                        | (In-Memory + Atlas/Local) |
                        +---------------------------+
```

---

## 🔌 WebSocket Events API Specification

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | Client ➔ Server | `{ roomId, username }` | Joins room, assigns Host or Participant role |
| `leave_room` | Client ➔ Server | `{ roomId }` | Leaves room & cleans up socket membership |
| `room_snapshot` | Server ➔ Client | `{ room, chatHistory }` | Initial room state & member list fanout |
| `sync_state` | Server ➔ Client | `{ videoId, currentTime, isPlaying }` | Broadcast video state update |
| `play` | Client ➔ Server | `{ currentTime }` | Requires Host/Moderator; broadcasts play state |
| `pause` | Client ➔ Server | `{ currentTime }` | Requires Host/Moderator; broadcasts pause state |
| `seek` | Client ➔ Server | `{ time }` | Requires Host/Moderator; broadcasts seek state |
| `change_video` | Client ➔ Server | `{ videoId }` | Requires Host/Moderator; changes room video |
| `assign_role` | Client ➔ Server | `{ targetUserId, role }` | Requires Host; updates participant role |
| `remove_participant`| Client ➔ Server | `{ targetUserId }` | Requires Host; kicks user from room |
| `transfer_host` | Client ➔ Server | `{ targetUserId }` | Requires Host; transfers room ownership |
| `send_message` | Client ➔ Server | `{ text }` | Sends chat message & persists to MongoDB |
| `send_reaction` | Client ➔ Server | `{ emoji }` | Broadcasts floating emoji reaction |

---

## ⚡ High-Concurrency Scalability & Load Testing

SyncParty includes an automated scale simulation script capable of testing 50 to 500+ concurrent WebSocket participants in real-time.

To run the high-concurrency scale test:

```bash
# Set scale test target users (e.g. 100 concurrent clients)
SCALE_USERS=100 npm run test:scale
```

### Scale Test Output Example:
```text
=======================================================
🔥 WATCH PARTY HIGH-CONCURRENCY SCALE TEST INITIATED 🔥
Target: 100 concurrent WebSocket clients joining room [SCALE1]
=======================================================
👑 Host connected successfully! Spawning 99 concurrent participants...
📈 Join Progress: 10/99 participants joined
📈 Join Progress: 50/99 participants joined
📈 Join Progress: 99/99 participants joined

✅ SUCCESS: All 100 clients joined in 1.48s!
⚡ Testing real-time broadcast fanout across all sockets...
=======================================================
📊 HIGH-CONCURRENCY SCALE TEST RESULTS:
   - Connected Clients: 100
   - State Sync Notifications Received: 100
   - Chat Broadcast Notifications Received: 100
   - System Latency: Excellent (No lost sockets)
=======================================================
```

---

## 🚀 Local Installation & Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Install Dependencies
```bash
# Install root, server, and client dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Launch Development Servers
Run the full-stack application concurrently:
```bash
npm run dev
```
- **Client Application**: Available at `http://localhost:3000`
- **Backend API & WebSockets**: Available at `http://localhost:4000`
- **Database**: Automatically starts `mongodb-memory-server` if no `MONGODB_URI` environment variable is defined.

---

## 📦 Deployment Instructions

### Deploying to Render / Railway
1. **Environment Variables**:
   - `PORT`: `4000`
   - `MONGODB_URI`: Your MongoDB Atlas connection string (optional; falls back to in-memory if omitted).
   - `REDIS_URL`: Your Redis cluster connection string (optional; enables horizontal WebSocket server scaling).
2. **Build Commands**:
   - Build Command: `npm run build`
   - Start Command: `npm run start`

---

## 📜 License
MIT License - Open Source for watch party enthusiasts.
