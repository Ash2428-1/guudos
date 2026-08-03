import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    // Mirror the tsconfig "@/*" -> "src/*" alias for domain unit tests.
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
});
