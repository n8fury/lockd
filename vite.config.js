import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { getManifest } from './src/manifest.js';

// BROWSER is set by the build scripts (build:chrome / build:firefox).
// CRXJS is Chromium-first; its `browser: 'firefox'` mode emits a Firefox-compatible
// build. If Firefox friction grows, the fallback is a dedicated Firefox build path.
const browser = process.env.BROWSER === 'firefox' ? 'firefox' : 'chrome';

export default defineConfig({
  plugins: [
    crx({
      manifest: getManifest(browser),
      browser,
    }),
  ],
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: true,
  },
  // CRXJS needs a stable HMR port during `dev`.
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});
