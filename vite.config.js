import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
/*
// https://vitejs.dev/config/
export default defineConfig({
  rollupOptions: {
    input: './src/main-dev.js',
    output: {
      dir: 'dist/dev'
    }
  },
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
*/

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return defineConfig({
    plugins: [vue(), vueJsx()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      emptyOutDir: false,
      outDir: 'dist',
      sourcemap: true,
      lib: {
        entry: {
          dev: './src/main-dev.js',
          prod: './src/main-prod.js'
        },
        formats: ['es', 'cjs']
      }
    },
    define: {
      'process.env': env
    }
  })
}
