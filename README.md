# Sticky Notes SaaS

This repository contains a small proof-of-concept implementation and planning
material for a minimalist sticky notes application.  The code demonstrates the
core UI interactions while leaving room for a future AWS powered backend.

## Vision
Create a clean and vibrant web application that lets users manage tasks and idea
s using interactive sticky notes.

## MVP Features
- User accounts with AWS Cognito authentication
- Private boards per user
- Add, edit, delete, drag and resize notes
- Color coding and text formatting
- Tagging and free‑text search
- Attach files and images to notes
- Share notes privately or publicly with revocable URLs
- Real‑time collaboration among authenticated users

## Technical Stack
- **Frontend:** React.js hosted via AWS Amplify or CloudFront
- **Backend:** Serverless architecture using AWS Lambda and API Gateway
- **Database:** DynamoDB

Longer term features like offline capability, integrations, and analytics are detailed in `todo.md`.

## Current Demo

The demo React application implements a basic sticky note board with the
following capabilities:

- Create multiple workspaces and switch between them
- Drag, resize and color notes
- Pan and zoom the canvas using the mouse or touch gestures

The backend package only exposes a simple Lambda function returning a greeting
and serves as a placeholder for future API development.
## Frontend Service Layer

A new `AppService` manages all client-side state including the active user, workspaces and their canvas data. Components now call the service when mutating state (adding notes, switching workspaces, etc.) and subscribe to its change events to keep React state in sync. These methods will later post updates to the backend.


## Repository Structure

The project uses a monorepo managed with npm workspaces. Source code lives in `packages/`:

- `packages/frontend` – React single page application
- `packages/backend` – AWS Lambda handlers and infrastructure code
- `packages/shared` – Reusable TypeScript utilities shared by other packages

## Architecture Overview

```
Browser ──> Frontend (React / Vite) ──> Backend API (AWS Lambda)
```

The frontend is a Vite-based React app responsible for rendering notes and managing local state.  The backend folder contains a placeholder Lambda handler which would be expanded to persist notes in DynamoDB and provide authentication via Cognito.  Shared utilities live under the `shared` package and can be imported by both frontend and backend code.

## Local Development

1. Install Node.js (version 16 or newer).
2. From the repository root, install all dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev:frontend
   ```
4. Run the backend locally:
   ```bash
   npm run dev:backend
   ```
5. Build all packages:
   ```bash
   npm run build
   ```

## Frontend Development

The React application lives in `packages/frontend`. Running the following command
starts the [Vite](https://vitejs.dev/) dev server with hot module replacement:

```bash
npm run dev:frontend
```

Any changes under `packages/frontend/src` will automatically reload the browser.
Styles are plain CSS files imported from the React components. To build the
production bundle for the frontend only, run:

```bash
npm run build --workspace packages/frontend
```
