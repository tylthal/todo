# Backend

This package contains the serverless backend used by the Sticky Notes app. It currently exposes a small Lambda handler for local development but will later persist data in AWS services.

## Prerequisites

- [Node.js](https://nodejs.org/) 16 or newer
- AWS credentials available via environment variables or your AWS config/credentials file

## Development

Run the development handler with:

```bash
npm start
```

This executes `src/handler.ts` using `ts-node`.

To create a production build run:

```bash
npm run build
```

The compiled JavaScript will be output to the `dist/` folder.

## Environment variables

Future persistence logic will rely on these variables:

- `TABLE_NAME` – DynamoDB table where notes and workspaces are stored
- `AWS_REGION` – AWS region used for service calls
- `LOG_LEVEL` – optional verbosity setting for debugging

