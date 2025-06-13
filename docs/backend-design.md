# Backend Design

This document outlines the planned backend architecture for the Sticky Notes application.

## Persisted Models

### User
- `id` – unique identifier for the account
- `name` – display name
- `email` – primary email address
- `ownedWorkspaceIds` – IDs of workspaces created by the user
- `contributedWorkspaceIds` – IDs of workspaces shared with the user

### Workspace
- `id` – unique identifier
- `name` – workspace title
- `ownerId` – ID of the owning user
- `contributorIds` – user IDs with edit permission
- `canvas` – zoom, pan and other board settings

### Note
- `id` – unique identifier
- `workspaceId` – workspace that contains the note
- All shape properties (`x`, `y`, `width`, `height`, `zIndex`, `rotation`, `color`, `pinned`, `locked`, `archived`)
- `content` – text or other note data

## Workspace Membership Model

Each workspace has a single **owner** who can invite **contributors** by user ID or email. Contributors may create and edit notes but cannot delete the workspace or change ownership. Membership changes are stored on the workspace item with the list of contributor IDs. Users maintain back‑references via their owned and contributed workspace lists.

Sharing works by adding a contributor ID to a workspace and updating the contributor's `contributedWorkspaceIds` array. Public share links can be added later using a token mapping to a workspace.

## API Endpoints

The backend will expose a REST API and a WebSocket API.

### REST Endpoints
- `POST /workspaces` – create a workspace
- `GET /workspaces/{id}` – retrieve a workspace
- `PATCH /workspaces/{id}` – update workspace name or membership
- `GET /workspaces` – list workspaces the caller can access
- `POST /notes` – create a note in the active workspace
- `PATCH /notes/{id}` – update a note (position, size, content)
- `GET /notes?workspaceId={id}` – list notes for a workspace

### WebSocket Events
WebSocket connections subscribe to a workspace channel. Events include:
- `workspaceUpdated` – emitted when workspace metadata changes
- `noteCreated`, `noteUpdated`, `noteDeleted` – emitted for note mutations

API Gateway routes these events to all connected clients for the workspace.

## Real-time Updates

A WebSocket API (API Gateway + Lambda) broadcasts change events to clients. Each workspace acts as a channel; clients join by sending a `subscribe` message with the workspace ID. When a note or workspace is modified, the responsible Lambda publishes an event to all subscribed connections for that workspace enabling real-time collaboration.

## DynamoDB Design

A single-table model stores users, workspaces and notes.

| PK | SK | Entity | Example Fields |
|----|----|--------|----------------|
| `USER#<id>` | `PROFILE` | User | name, email, ownedWorkspaceIds, contributedWorkspaceIds |
| `WORKSPACE#<id>` | `META` | Workspace | ownerId, contributorIds, canvas |
| `WORKSPACE#<id>` | `NOTE#<noteId>` | Note | shape props, content |

### Access Patterns
- **Get user profile:** `PK=USER#id` `SK=PROFILE`
- **List user workspaces:** query `PK=WORKSPACE#id` on each ID in user's workspace lists
- **List notes in workspace:** `PK=WORKSPACE#id` with begins_with `SK=NOTE#`
- **Update note:** `PK=WORKSPACE#id` `SK=NOTE#noteId`
- **Update workspace metadata:** `PK=WORKSPACE#id` `SK=META`

The table's partition key is a composite string (e.g., `USER#123`) while the sort key identifies the item type. This approach keeps all items for a workspace together and supports efficient retrieval of notes and workspace metadata.
