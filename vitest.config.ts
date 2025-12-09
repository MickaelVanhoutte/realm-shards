import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/lib/**/*.ts'],
            exclude: ['src/**/__tests__/**', 'src/**/*.test.ts']
        }
    },
    resolve: {
        alias: {
            '$lib': resolve(__dirname, './src/lib')
        }
    },
    define: {
        'import.meta.env.BASE_URL': JSON.stringify('/')
    }
});
