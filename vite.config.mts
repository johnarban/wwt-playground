// Utilities
import { fileURLToPath, URL } from 'node:url';
import Vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Plugins
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import legacy from '@vitejs/plugin-legacy';

const isLegacyBuild = process.env.LEGACY === 'true';

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
    // Only included when LEGACY=true (i.e. `yarn build-legacy`).
    // Generates a legacy bundle (SystemJS + polyfills) for browsers that don't
    // support native ES modules — targets ~2017-era browsers (Chrome 49+,
    // Firefox 52+, Safari 10+, Edge 14+).
    // renderModernChunks: false — only emit the legacy bundle (not both modern
    // + legacy), which halves the Babel/terser work and keeps the output simple.
    ...(isLegacyBuild ? [legacy({
      targets: ['chrome >= 62', 'firefox >= 53', 'safari >= 11', 'edge >= 16'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderModernChunks: false,
    })] : []),
  ],
  optimizeDeps: {
    exclude: [
      'vuetify',
    ],
    // a yarn-linked package is not pre-bundled by default, so its UMD entry would be served raw
    include: [
      '@wwtelescope/engine',
      '@wwtelescope/engine-pinia',
    ],
  },
  define: { 'process.env': {} },
  resolve: {
    // i don't know if this is standard. but toolkit package.json has the es modules on the "module" field
    // and at least for local development, vites needs to check module first. check here if it all
    // blows up once we start using the vue-toolkit from npm
    mainFields: ['module', 'browser'],
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
