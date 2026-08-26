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
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { test: /node_modules\/(react|react-dom|react-router)/, name: 'vendor' },
            { test: /node_modules\/@supabase/, name: 'supabase' },
            { test: /node_modules\/@tanstack/, name: 'query' },
            { test: /node_modules\/recharts/, name: 'charts' },
            { test: /node_modules\/@phosphor-icons/, name: 'icons' },
            { test: /node_modules\/katex/, name: 'katex' },
            { test: /node_modules\/@radix-ui/, name: 'radix' },
          ],
        },
      },
    },
    // Fallback for Rollup-compat (deprecated in Vite 8, kept for safety)
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('@tanstack')) return 'query'
            if (id.includes('recharts')) return 'charts'
            if (id.includes('@phosphor-icons')) return 'icons'
            if (id.includes('katex')) return 'katex'
            if (id.includes('@radix-ui')) return 'radix'
          }
        },
      },
    },
  },
})
