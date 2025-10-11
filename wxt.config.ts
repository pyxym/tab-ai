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
  manifest: {
    name: 'TabQuest - AI-Powered Tab Manager',
    version: '1.0.0',
    description: 'AI-powered browser tab management extension',
    permissions: ['tabs', 'storage', 'activeTab', 'tabGroups', 'windows', 'alarms', 'sidePanel'],
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
