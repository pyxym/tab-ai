import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  dev: {
    server: {
      port: 3000,
    },
    reloadCommand: 'Alt+R',
  },
  // 🚀 성능 최적화: Vite 빌드 설정
  vite: () => ({
    build: {
      // 청크 크기 최적화
      chunkSizeWarningLimit: 1000,
      // 🚀 소스맵 최적화: 프로덕션에서는 완전히 제거
      sourcemap: process.env.NODE_ENV === 'development',
      // 번들 크기 최소화
      minify: 'esbuild',
      target: 'es2020',
      // 압축 최적화
      cssCodeSplit: true,
      reportCompressedSize: false, // 빌드 속도 향상
    },
    // 최적화 설정
    optimizeDeps: {
      include: ['react', 'react-dom', 'i18next', 'react-i18next', 'zustand'],
    },
    // Esbuild 최적화
    esbuild: {
      // 🚀 프로덕션: console, debugger 모두 제거
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none', // 라이센스 주석 제거
    },
  }),
  manifest: {
    name: 'TabQuest - Create & Share Tab Workspaces',
    version: '1.0.0',
    description: 'Create your own tab workspaces, share them with others, and discover new ways to organize your browsing',
    permissions: ['tabs', 'storage', 'activeTab', 'tabGroups', 'windows', 'sidePanel'],
    action: {
      default_title: 'TabQuest - Open Side Panel',
      default_icon: {
        '16': 'icon/icon-16.png',
        '32': 'icon/icon-32.png',
        '48': 'icon/icon-48.png',
        '128': 'icon/icon-128.png',
      },
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    icons: {
      '16': 'icon/icon-16.png',
      '32': 'icon/icon-32.png',
      '48': 'icon/icon-48.png',
      '128': 'icon/icon-128.png',
      '256': 'icon/icon-256.png',
      '512': 'icon/icon-512.png',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
  },
});
