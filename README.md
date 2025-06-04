# Sticky Notes SaaS

This repository contains the planning material for building a minimalist single
page application for managing sticky notes.

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

Longer term features like offline capability, integrations, and analytics are de
tailed in `todo.md`.

## Repository Structure

The project uses a monorepo managed with npm workspaces. Source code lives in `packages/`:

- `packages/frontend` – React single page application
- `packages/backend` – AWS Lambda handlers and infrastructure code
- `packages/shared` – Reusable TypeScript utilities shared by other packages

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
npm run build --workspace frontend
```
