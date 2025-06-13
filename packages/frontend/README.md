# Frontend

This package contains the React frontend powered by Vite.

## Vite Configuration

The `vite.config.ts` file defines an alias so libraries referencing the Node.js
`global` object work in the browser:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    global: 'globalThis',
  },
});
```

Run the build with:

```bash
npm run build --workspace packages/frontend
```

## Environment variables

Copy `.env.example` to `.env` and provide your Cognito settings:

```bash
cp .env.example .env
```

The application expects these variables:

- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`
- `VITE_COGNITO_REDIRECT_URI`
- `VITE_COGNITO_LOGOUT_URI`

