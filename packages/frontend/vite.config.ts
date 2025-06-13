import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        global: {},
    },
    server: {
        port: 5173,
    },
    resolve: {
        alias: {
            './runtimeConfig': './runtimeConfig.browser',
            '@sticky-notes/shared': resolve(__dirname, '../shared/src'),
        },
    },
});
