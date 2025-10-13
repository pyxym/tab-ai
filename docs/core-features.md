# Core Features

## 1. Smart Tab Organization

### Overview
Automatically groups tabs by domain and category to organize your browser systematically.

### Key Logic

**UnifiedOrganizer** ([unifiedOrganizer.ts](../src/utils/unifiedOrganizer.ts))

Main organization flow:
1. Query all tabs in current window
2. Ungroup all existing tab groups
3. Categorize tabs by domain
4. Reorder tabs by category sequence
5. Create tab groups with colors and names

### Features
- **Domain Normalization**: Removes `www.`, handles subdomains
- **System URL Exclusion**: Skips `chrome://`, `edge://` tabs
- **Priority**: User mapping > Category domains > Uncategorized
- **Undo/Redo**: Full undo/redo support for organization actions

---

## 2. Category System

### Overview
Category management system to organize tabs into meaningful groups.

### Default Categories
- **Work**: Development tools (GitHub, GitLab, VS Code)
- **Productivity**: Productivity apps (Notion, Trello, Asana)
- **Learning**: Educational sites (Coursera, Udemy, documentation)
- **Entertainment**: Media sites (YouTube, Netflix, Spotify)
- **Social**: Social media (Twitter, LinkedIn, Facebook)
- **Shopping**: E-commerce (Amazon, eBay)
- **Uncategorized**: Unassigned tabs

### Category Mapping
Priority order:
1. User-defined domain mapping
2. Category domain list
3. Subdomain pattern matching
4. Default to uncategorized

### Category Management
- Create, edit, delete categories
- Assign custom colors
- Reorder categories with drag-and-drop
- Map domains to categories
- System categories cannot be deleted

---

## 3. AI Insights

### Overview
AI-powered suggestions to improve productivity based on browsing patterns.

### Insight Types
- **Tips**: Helpful suggestions for better tab management
- **Alerts**: Important notifications about tab status
- **Warnings**: Issues requiring attention
- **Achievements**: Productivity milestones

### Generation Triggers
- Duplicate tabs detected (same domain)
- Too many open tabs (>20)
- Unorganized tabs (no groups)
- Category imbalance

### Implementation
Located in [useInsightsGenerator.ts](../src/hooks/useInsightsGenerator.ts):
- Analyzes current tab state
- Generates contextual insights
- Provides actionable recommendations

---

## 4. Undo/Redo System

### Overview
Full undo/redo support for all tab organization actions.

### Implementation ([undoManager.ts](../src/utils/undoManager.ts))

**Tracked Actions**:
- Smart organize
- Category changes
- Tab movements
- Group creation/deletion

**Features**:
- Snapshot-based state management
- Configurable history size (default: 10)
- Efficient state compression
- Keyboard shortcuts support (Ctrl+Z, Ctrl+Shift+Z)

---

## 5. Snapshot Management

### Overview
Save and restore complete tab states with timestamps.

### Features ([snapshotStorage.ts](../src/utils/snapshotStorage.ts))

- Save current tab layout
- Restore previous states
- Compress snapshot data
- Automatic cleanup of old snapshots
- Named snapshots for easy identification

### Use Cases
- Save workspace before switching tasks
- Restore session after browser crash
- Experiment with different organizations

---

## 6. Multi-language Support

### Supported Languages
- 🇺🇸 English (en)
- 🇰🇷 Korean (ko)
- 🇯🇵 Japanese (ja)

### Implementation ([i18n.ts](../src/lib/i18n.ts))

**Features**:
- i18next + react-i18next
- Dynamic language switching
- Persistent language preference
- Fallback to English

### Usage
```typescript
const { t } = useTranslation();
<h1>{t('tabs.organize')}</h1>
```

---

## 7. Tab Filtering

### Filter Types ([tabFilters.ts](../src/utils/tabFilters.ts))

- By domain
- By title
- By category
- By active status
- By pinned status

### Implementation
- Real-time search
- Multiple filter criteria
- Efficient filtering algorithms

---

## 8. Side Panel Interface

### Overview
Modern Chrome Side Panel API integration for persistent access.

### Features
- Always visible alongside browsing
- Resizable width
- Persistent across tab navigation
- Responsive layout
- Glass morphism design

### Requirements
- Chrome 114+ for Side Panel API
- Enabled in manifest V3

---

## 9. Tab Groups Integration

### Overview
View and manage existing Chrome tab groups.

### Features
- Display all tab groups in current window
- Show group colors and names
- Tab count per group
- Quick navigation to groups

### Implementation
Located in [TabGroupManager.tsx](../src/components/pages/TabGroupManager.tsx)

---

## 10. Smart Organization Algorithm

### Enhanced Organization ([useSmartOrganize.ts](../src/hooks/useSmartOrganize.ts))

**Process**:
1. Analyze current tab distribution
2. Detect patterns and duplicates
3. Categorize tabs intelligently
4. Create optimal tab groups
5. Generate insights

**Features**:
- Duplicate detection
- Pattern recognition
- Optimal grouping
- Performance optimization
