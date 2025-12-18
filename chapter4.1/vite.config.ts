import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false
  },
  build: {
    target: 'esnext'  // Required for WebGPU
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'  // Required for WebGPU top-level await
    }
  }
});