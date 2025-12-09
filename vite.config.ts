import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      outputDir: 'dist',
      copyDtsFiles: true
    })
  ],
  build: {
    lib: {
      entry: 'index.ts',
      name: 'QryCodesVueFoamtree',
      formats: ['es', 'cjs'],
      fileName: (format) => `qry-codes-vue-foamtree.${format}.js`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
});