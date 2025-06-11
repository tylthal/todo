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
