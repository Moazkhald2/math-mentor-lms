import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    target: 'es2022',
    // Never ship source maps to production browsers
    sourcemap: false,
    minify: 'oxc',
    chunkSizeWarningLimit: 500,
    rolldownOptions: {
      output: {
        minify: {
          compress: {
            dropConsole: true,
            dropDebugger: true,
          },
        },
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules[\\/](react|react-dom|react-router)/ },
            { name: 'query', test: /node_modules[\\/]@tanstack/ },
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'charts', test: /node_modules[\\/]recharts/ },
            { name: 'forms', test: /node_modules[\\/](react-hook-form|zod)/ },
          ],
        },
      },
    },
  },
})
