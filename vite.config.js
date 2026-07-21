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
          '': 'Adds external ratings and enhanced cast cards to Letterboxd',
          ru: 'Добавляет в Letterboxd внешние рейтинги и карточки актёров',
          es: 'Añade valoraciones externas y fichas del reparto a Letterboxd',
          'pt-BR':
            'Adiciona avaliações externas e cartões do elenco ao Letterboxd',
          de: 'Ergänzt Letterboxd um externe Wertungen und Besetzungskarten',
          fr: 'Ajoute des notes externes et des fiches de distribution à Letterboxd',
          'zh-CN': '为 Letterboxd 添加外部评分和增强演员卡片',
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
        connect: [
          'www.rottentomatoes.com',
          'rottentomatoes.com',
          'backend.metacritic.com',
        ],
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
