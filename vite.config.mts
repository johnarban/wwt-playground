// Utilities
import { fileURLToPath, URL } from 'node:url';
import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Plugins
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
    }),
  ],
  optimizeDeps: {
    exclude: [
      'vuetify',
    ],
  },
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {},
  css: {
    preprocessorOptions: {
      less: {
        math: 'always',
      },
    },
  },
});
