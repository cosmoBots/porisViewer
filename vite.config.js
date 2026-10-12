import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
export default ({ mode }) => {
  const isCsysPlugin = mode === 'csys-plugin'
  const env = isCsysPlugin ? {} : loadEnv(mode, process.cwd(), '')

  return defineConfig({
    plugins: [vue(), vueJsx()],
    ...(isCsysPlugin ? { publicDir: false } : {}),
    envPrefix: isCsysPlugin ? 'COSMOSYS_PORIS_BUILD_' : 'VITE_',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      emptyOutDir: false,
      outDir: 'dist',
      sourcemap: !isCsysPlugin,
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
    define: isCsysPlugin ? {} : { 'process.env': env }
  })
}
