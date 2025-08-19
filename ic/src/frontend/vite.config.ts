import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import environment from 'vite-plugin-environment';
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
export default defineConfig({
  base: '/',
  plugins: [react() , nodePolyfills({ globals: { Buffer: true } }),tailwindcss(), environment('all', { prefix: 'CANISTER_' }), environment('all', { prefix: 'DFX_' })],
  envDir: '../',
  define: {
    'process.env': process.env
  },
  optimizeDeps: {
    esbuildOptions: {
      
      define: {
        global: 'globalThis'
      },
    },
        exclude: ['@noir-lang/noirc_abi', '@noir-lang/acvm_js']
  },
  
  resolve: {
    alias: [
      {
        find: 'declarations',
        replacement: fileURLToPath(new URL('../src/declarations', import.meta.url))
      }
    ]
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true
      }
    },
    host: '127.0.0.1'
  }
});