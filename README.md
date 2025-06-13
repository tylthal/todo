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

## Workspace Ownership Model

Workspaces are now associated with user accounts. The shared
[`Workspace` interface](packages/shared/src/models/Workspace.ts) defines an
`ownerId` for the account that created the workspace along with a list of
`contributorIds` for other accounts that can edit it. The
[`User` interface](packages/shared/src/models/User.ts) tracks matching
`ownedWorkspaceIds` and `contributedWorkspaceIds` so the application knows which
boards a user controls. Every workspace therefore has a single owner account and
may optionally list contributor accounts.
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
5. Install dependencies in each workspace by running `npm install` inside each package directory or again at the repository root. This must be done before building.
6. Build all packages:
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

## Code Quality

Run ESLint and Prettier from the repository root:

```bash
npm run lint    # check code style
npm run format  # automatically format files
```

## Deployment

Infrastructure is managed with [Terraform](https://www.terraform.io/).  The
configuration lives in the `infra/` directory and provisions an S3 bucket, a
CloudFront distribution and Route53 record pointing `notes.thalman.org` to the
distribution.

### Prerequisites

- [Terraform 1.5+](https://www.terraform.io/downloads) installed
- An AWS account with credentials configured via environment variables or an
  AWS profile
- A Route53 hosted zone for `thalman.org` must already exist

### Deploying infrastructure

1. Change into the infrastructure directory and initialize Terraform:
   ```bash
   cd infra
   terraform init
   ```
2. Apply the configuration, providing a unique S3 bucket name, Cognito settings
   and AWS region:
   ```bash
   terraform apply \
     -var="bucket_name=<your-bucket>" \
     -var="aws_region=<region>" \
     -var="acm_certificate_arn=<certificate-arn>" \
     -var="google_client_id=<google-oauth-client-id>" \
     -var="google_client_secret=<google-oauth-secret>" \
     -var="callback_urls=[\"https://notes.example.com/callback\"]" \
      -var="logout_urls=[\"https://notes.example.com\"]" \
      -var="cognito_domain_prefix=<unique-prefix>"
   ```
  Terraform will output the CloudFront distribution ID which is required for
  frontend deployments.
  It also prints the `user_pool_id`, `user_pool_client_id` and
  `cognito_hosted_ui_domain` values used when configuring the frontend
  authentication flow.

### Authentication configuration

The frontend requires a few environment variables so it can talk to your
Cognito user pool. Create a `.env` file in `packages/frontend` with the
following values:

```bash
VITE_COGNITO_USER_POOL_ID=<your-user-pool-id>
VITE_COGNITO_CLIENT_ID=<your-app-client-id>
VITE_COGNITO_DOMAIN=<your-hosted-ui-domain>
VITE_COGNITO_REDIRECT_URI=<http://localhost:5173>
VITE_COGNITO_LOGOUT_URI=<http://localhost:5173>
```

`VITE_COGNITO_REDIRECT_URI` should match one of the callback URLs specified in
your Cognito app client settings while `VITE_COGNITO_LOGOUT_URI` must be an
allowed logout URL.

### Deploying the frontend

Once the infrastructure is created you can build and upload the frontend using
the following command from the repository root:

```bash
npm run deploy:frontend
```

This Node script runs on Windows, macOS and Linux.

The command expects `S3_BUCKET` and `CLOUDFRONT_DISTRIBUTION_ID` environment
variables to be set so it can sync the build artifacts to S3 and invalidate the
CloudFront cache. Example commands to set them from Terraform outputs:

For Bash or other Unix shells:

```bash
export S3_BUCKET=$(terraform -chdir=infra output -raw bucket_name)
export CLOUDFRONT_DISTRIBUTION_ID=$(terraform -chdir=infra output -raw cloudfront_distribution_id)
```

For PowerShell:

```powershell
$Env:S3_BUCKET = terraform -chdir=infra output -raw bucket_name
$Env:CLOUDFRONT_DISTRIBUTION_ID = terraform -chdir=infra output -raw cloudfront_distribution_id
```

For Windows cmd.exe:

```cmd
set S3_BUCKET="$(terraform -chdir=infra output -raw bucket_name)"
set CLOUDFRONT_DISTRIBUTION_ID="$(terraform -chdir=infra output -raw cloudfront_distribution_id)"
```

### Backend Deployment

Update the Lambda function after making backend changes with:

```bash
npm run deploy:backend
```

The script compiles the backend, packages the Lambda code and uploads it using the AWS CLI. Set the `LAMBDA_FUNCTION_NAME` environment variable to the function name, which can be retrieved from Terraform outputs:

For Bash or other Unix shells:

```bash
export LAMBDA_FUNCTION_NAME=$(terraform -chdir=infra output -raw lambda_function_name)
```

For PowerShell:

```powershell
$Env:LAMBDA_FUNCTION_NAME = terraform -chdir=infra output -raw lambda_function_name
```

For Windows cmd.exe:

```cmd
set LAMBDA_FUNCTION_NAME="$(terraform -chdir=infra output -raw lambda_function_name)"
```
