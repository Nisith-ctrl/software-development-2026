/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/pages/Player.tsx'],
      exclude: ['**/*.test.*', 'src/domain/testData.ts'],
      reporter: ['text', 'html'],
    },
  },
});
