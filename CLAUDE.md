# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TabQuest** is an intelligent browser tab management extension that helps users organize, analyze, and optimize their browsing experience. The extension provides smart tab grouping, usage tracking, and productivity insights.

## Technology Stack

- **Framework**: WXT (Web Extension Tools) - Modern web extension framework
- **Frontend**: React 18 + TypeScript
- **UI Surface**: Chrome Side Panel API (requires Chrome 114+)
- **State Management**: Zustand
- **Storage**: Chrome Storage API (sync and local)
- **Internationalization**: i18next + react-i18next
- **Styling**: Tailwind CSS with glass morphism design system
- **Build System**: WXT + Vite
- **Extension**: Chrome Extension Manifest V3

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Package extension for distribution
npm run package
```

## Project Structure

```
tab-quest/
├── src/
│   ├── entrypoints/           # WXT entry points
│   │   ├── sidepanel.tsx      # Side panel entry point
│   │   ├── popup-component.tsx # Main UI component (shared)
│   │   ├── options.tsx        # Options page
│   │   └── background.ts      # Background service worker
│   ├── components/
│   │   ├── charts/            # Chart components
│   │   │   ├── SimpleBarChart.tsx
│   │   │   └── SimpleLineChart.tsx
│   │   ├── modals/            # Modal dialogs
│   │   │   └── CategoryEditModal.tsx
│   │   ├── pages/             # Page-level components
│   │   │   ├── CategoryManager.tsx  # Category management
│   │   │   ├── DashboardModal.tsx   # Analytics dashboard
│   │   │   ├── HelpModal.tsx        # Help documentation
│   │   │   ├── TabGroupsModal.tsx   # Tab groups view
│   │   │   └── TabList.tsx          # Tab listing
│   │   ├── shared/            # Shared components
│   │   │   ├── AIInsightCard.tsx    # AI insights display
│   │   │   ├── AILogo.tsx           # AI logo component
│   │   │   └── ProductivityScore.tsx # Score display
│   │   └── ui/                # UI primitives
│   │       ├── ColorPicker.tsx      # Color selection
│   │       ├── ConfirmModal.tsx     # Confirmation dialog
│   │       ├── CustomSelect.tsx     # Custom dropdown
│   │       ├── FavIcon.tsx          # Favicon display
│   │       ├── InfoTooltip.tsx      # Tooltip component
│   │       └── LanguageSwitcher.tsx # Language selector
│   ├── lib/                   # Core libraries
│   │   ├── i18n.ts            # i18next configuration
│   │   └── tabClassifier.ts   # Tab classification logic
│   ├── locales/               # Translation files
│   │   ├── en.json            # English
│   │   ├── ko.json            # Korean
│   │   └── ja.json            # Japanese
│   ├── store/                 # Zustand state stores
│   │   ├── categoryStore.ts   # Category management
│   │   ├── tabStore.ts        # Tab state and operations
│   │   └── aiStore.ts         # AI features state
│   ├── utils/                 # Utility functions
│   │   ├── chromeTabHelpers.ts    # Chrome API helpers
│   │   ├── colorUtils.ts          # Color utilities
│   │   ├── configs.ts             # Configuration constants
│   │   ├── errorBoundary.ts       # Error handling
│   │   ├── preflightCheck.ts      # Pre-operation checks
│   │   ├── snapshotStorage.ts     # Snapshot management
│   │   ├── storage.ts             # Chrome storage wrapper
│   │   ├── tabAnalyzer.ts         # Tab analysis logic
│   │   ├── tabFilters.ts          # Tab filtering utilities
│   │   ├── tabTracker.ts          # Usage tracking
│   │   ├── undoManager.ts         # Undo/Redo system
│   │   └── unifiedOrganizer.ts    # Tab organization logic
│   ├── types/                 # TypeScript definitions
│   │   ├── analytics.ts       # Analytics types
│   │   ├── category.ts        # Category types
│   │   ├── css.d.ts           # CSS module types
│   │   ├── organize.ts        # Organization types
│   │   ├── snapshot.ts        # Snapshot types
│   │   └── storage.ts         # Storage types
│   └── tabs/                  # Full tab pages
│       └── dashboard.tsx      # Analytics dashboard page
├── public/
│   └── icon/                  # Extension icons (16, 32, 48, 128)
├── wxt.config.ts              # WXT framework configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Architecture Overview

### WXT Framework

- Modern web extension framework built on Vite
- Automatic manifest generation
- Hot Module Replacement in development
- TypeScript-first with full type safety
- Built-in storage utilities with type safety

### State Management

- **categoryStore**: Manages user-defined categories for tab organization
- Local React state for UI components
- Chrome Storage API for persistence via WXT utilities

### Storage Architecture

- **Sync Storage**: User preferences and settings
  - `categories`: User-defined tab categories
  - `categoryMapping`: Domain to category mappings
  - `language`: Selected interface language
- **Local Storage**: Usage data and statistics
  - `tabUsageData`: Tab usage metrics
  - `dailyStats`: Daily productivity statistics
  - `aiInsights`: AI-generated insights and suggestions

### Component Architecture

- Glass morphism design with Tailwind CSS
- Modular components for maintainability
- Responsive full-screen layout optimized for side panel
- Dark mode compatible
- Side panel provides persistent access and resizable width

## Key Features

1. **Side Panel Interface**: Persistent sidebar UI with resizable width and always-on access
2. **Category-based Tab Organization**: Custom categories with automatic tab grouping
3. **Tab Usage Tracking**: Monitor time spent, access frequency, and productivity metrics
4. **Undo/Redo System**: Full undo/redo support for all organization actions
5. **Snapshot Management**: Save and restore tab states with timestamps
6. **Tab Filtering**: Filter by domain, title, or usage patterns
7. **Interactive Charts**: Bar and line charts showing usage patterns
8. **AI Insights**: AI-generated suggestions for productivity improvement
9. **Multi-language Support**: English, Korean, and Japanese with i18next
10. **Glass Morphism Design**: Modern UI with backdrop blur and gradients
11. **Tab Groups Integration**: View and manage existing Chrome tab groups

## Chrome Extension Permissions

Current permissions in manifest:

- `tabs`: Access to tab information and management
- `tabGroups`: Create and manage tab groups
- `storage`: Store user preferences and usage data
- `activeTab`: Access to the currently active tab
- `windows`: Access to browser windows
- `alarms`: Schedule periodic tasks for tracking
- `sidePanel`: Enable side panel UI (requires Chrome 114+)

## Development Tips

1. **WXT Development**:
   - Use `defineConfig` in wxt.config.ts for configuration
   - Entry points go in src/entrypoints/
   - Public assets in public/ folder
   - TypeScript configs are handled by WXT
   - WXT auto-generates HTML files for TSX entrypoints (don't create manual HTML files)

2. **Side Panel Development**:
   - Side panel opens when extension icon is clicked (chrome.action.onClicked)
   - Use responsive layout (w-full h-screen) instead of fixed dimensions
   - Side panel persists across tab navigation
   - Requires Chrome 114+ for Side Panel API support

3. **Storage Management**:
   - Use Chrome Storage API directly for persistence
   - Separate sync storage for preferences and local storage for data
   - Storage utilities defined in utils/storage.ts

4. **Debugging**:
   - Debug utilities are conditionally loaded only in development
   - Use Chrome DevTools for extension debugging
   - Check background script logs in service worker console
   - Side panel can be inspected separately from the main page

5. **Performance**:
   - Direct Chrome API calls for instant tab operations
   - Efficient state management with Zustand
   - Tailwind CSS purged in production build

6. **Testing**:
   - Manual testing through Chrome extension developer mode
   - Use multiple browser profiles for testing different scenarios
   - Test side panel resizing and persistence across tabs

## Common Issues & Solutions

1. **WebSocket Errors in Dev Mode**: Normal behavior for HMR, safely ignored
2. **TypeScript Errors**: Ensure proper type guards for optional Chrome API values
3. **Tab Group Ordering**: Use chrome.tabGroups.move() for consistent ordering
4. **Storage Type Safety**: Use generic types with storage utilities
5. **WXT Multiple Entrypoints Error**: Only use .tsx files for entrypoints, WXT auto-generates HTML
6. **Side Panel Not Opening**: Ensure Chrome version is 114+ and sidePanel permission is granted

## Build & Deployment

1. **Development Build**:

   ```bash
   npm run dev
   # Creates build in .output/chrome-mv3-dev/
   ```

2. **Production Build**:

   ```bash
   npm run build
   # Creates optimized build in .output/chrome-mv3/
   ```

3. **Loading in Browser**:
   - Open chrome://extensions
   - Enable Developer mode
   - Load unpacked from .output/chrome-mv3-dev/ (dev) or .output/chrome-mv3/ (prod)

## Code Style Guidelines

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use proper type guards for Chrome API responses
- Follow existing component patterns
- Keep components small and focused
- Use Tailwind utility classes consistently

## Internationalization

The extension supports multiple languages using i18next:

- Language files stored in `src/locales/`
- Dynamic language switching without reload
- Persistent language preference in sync storage
- Supports: English (en), Korean (ko), Japanese (ja)

## Key Components

### State Management (Zustand Stores)

- **categoryStore**: Category CRUD, reordering, color management
- **tabStore**: Tab operations, filters, undo/redo, snapshots
- **aiStore**: AI insights generation and management

### Core Utilities

- **unifiedOrganizer**: Main tab organization logic
- **undoManager**: Undo/redo stack management
- **snapshotStorage**: Snapshot save/restore with compression
- **tabTracker**: Usage tracking with time and frequency metrics
- **tabAnalyzer**: Tab analysis and productivity scoring
- **chromeTabHelpers**: Chrome API wrapper functions

### UI Components

- **CategoryManager**: Category list with drag-and-drop
- **TabList**: Tab display with filtering and actions
- **DashboardModal**: Analytics dashboard with charts
- **TabGroupsModal**: Existing tab groups viewer
- **Chart components**: Custom bar and line charts

## Development Best Practices

1. **Type Safety**: Use strict TypeScript with proper type guards
2. **Chrome API**: Always check for undefined values from Chrome APIs
3. **Error Handling**: Wrap Chrome API calls in try-catch blocks
4. **State Management**: Use Zustand stores, avoid prop drilling
5. **i18n**: Use `useTranslation` hook, add keys to all locale files
6. **Styling**: Use Tailwind utilities, follow glass morphism patterns
7. **Performance**: Batch Chrome API calls, use React.memo when needed

## Common Patterns

### Chrome API Usage

```typescript
// Always check for runtime errors
const tabs = await chrome.tabs.query({});
if (chrome.runtime.lastError) {
  console.error(chrome.runtime.lastError);
  return;
}
```

### Store Updates

```typescript
// Use Zustand's set with immer-style updates
set((state) => {
  state.categories.push(newCategory);
});
```

### i18n Keys

```typescript
// Use translation hook with proper keys
const { t } = useTranslation();
return <div>{t('tabs.organize')}</div>;
```
