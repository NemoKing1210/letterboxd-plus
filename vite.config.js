import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };

const RAW_BASE =
  'https://raw.githubusercontent.com/NemoKing1210/letterboxd-plus/main';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, pure_getters: true },
      mangle: true,
      format: { comments: false },
    },
    cssMinify: true,
    target: 'es2018',
    reportCompressedSize: true,
  },
  esbuild: {
    legalComments: 'none',
  },
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: {
          '': 'Letterboxd Plus',
          ru: 'Letterboxd Plus',
          es: 'Letterboxd Plus',
          'pt-BR': 'Letterboxd Plus',
          de: 'Letterboxd Plus',
          fr: 'Letterboxd Plus',
          'zh-CN': 'Letterboxd Plus',
        },
        namespace: 'https://github.com/NemoKing1210/letterboxd-plus',
        version: pkg.version,
        description: {
          '': 'Extends Letterboxd with Rotten Tomatoes ratings and quality-of-life features',
          ru: 'Добавляет в Letterboxd рейтинги Rotten Tomatoes и улучшения интерфейса',
          es: 'Amplía Letterboxd con valoraciones de Rotten Tomatoes y mejoras de interfaz',
          'pt-BR':
            'Amplia o Letterboxd com avaliações do Rotten Tomatoes e melhorias de interface',
          de: 'Erweitert Letterboxd um Rotten-Tomatoes-Bewertungen und Komfortfunktionen',
          fr: "Enrichit Letterboxd avec les notes Rotten Tomatoes et des améliorations d'interface",
          'zh-CN': '为 Letterboxd 添加 Rotten Tomatoes 评分和界面改进',
        },
        author: 'NemoKing1210',
        tag: ['letterboxd', 'movies', 'ratings'],
        homepageURL: 'https://github.com/NemoKing1210/letterboxd-plus',
        supportURL: 'https://github.com/NemoKing1210/letterboxd-plus/issues',
        updateURL: `${RAW_BASE}/letterboxd-plus.user.js`,
        downloadURL: `${RAW_BASE}/letterboxd-plus.user.js`,
        license: 'MIT',
        icon: 'https://letterboxd.com/favicon.ico',
        match: ['https://letterboxd.com/*', 'https://www.letterboxd.com/*'],
        connect: ['www.rottentomatoes.com', 'rottentomatoes.com'],
        'run-at': 'document-idle',
        noframes: true,
      },
      server: {
        prefix: 'dev:',
      },
      build: {
        fileName: 'letterboxd-plus.user.js',
        metaFileName: true,
      },
    }),
  ],
});
