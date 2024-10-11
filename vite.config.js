import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
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
          prod: './src/main-prod.js',
          dev: './src/main-dev.js'
        },
        formats: ['es', 'cjs']
      }
    },
    define: {
      'process.env': env
    }
  })
}
