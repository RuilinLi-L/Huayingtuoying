import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: { rollupOptions: { input: { main: 'index.html', world: 'ar/world.html' } } },
    server: {
        port: 5173,
        allowedHosts: true,
    },
    preview: {
        port: 4173,
        allowedHosts: true,
    },
});
