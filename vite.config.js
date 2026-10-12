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
        // The Redmine plugin serves Rails-digested assets. A single entry
        // avoids shared chunks whose relative URLs would bypass Sprockets'
        // asset-path rewriting when the browser imports the viewer module.
        entry: mode === 'csys-plugin'
          ? './src/main-prod.js'
          : {
              prod: './src/main-prod.js',
              dev: './src/main-dev.js'
            },
        ...(mode === 'csys-plugin' ? { fileName: () => 'prod.js' } : {}),
        formats: mode === 'csys-plugin' ? ['es'] : ['es', 'cjs']
      }
    },
    define: {
      'process.env': env
    }
  })
}
