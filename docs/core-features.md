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

## 2. Tab Usage Tracking

### Overview
Tracks tab usage time in real-time and generates statistical data.

### TabTracker ([tabTracker.ts](../src/utils/tabTracker.ts))

**Tracking Events:**
- Tab activation, URL changes, window focus
- Periodic updates every 6 seconds

**Key Metrics:**
- Total time spent per tab
- Access count and frequency
- Category breakdown
- Daily statistics

---

## 3. Category System

### Overview
Category management system to organize tabs into meaningful groups.

### Default Categories
- **Work**: Development tools (GitHub, GitLab)
- **Productivity**: Productivity apps (Notion, Trello)
- **Entertainment**: Media sites
- **Social**: Social media
- **Shopping**: E-commerce
- **Uncategorized**: Unassigned tabs

### Category Mapping
Priority order:
1. User-defined domain mapping
2. Category domain list
3. Subdomain pattern matching
4. Default to uncategorized

---

## 4. AI Insights

### Overview
AI-powered suggestions to improve productivity based on browsing patterns.

### Insight Types
- **Tips**: Helpful suggestions
- **Alerts**: Important notifications
- **Warnings**: Issues requiring attention
- **Achievements**: Productivity milestones

### Generation Triggers
- Duplicate tabs detected
- Low productivity score (<50)
- Unusual usage patterns
- Category imbalance

---

## 5. Productivity Score

### Calculation Logic ([tabAnalyzer.ts](../src/utils/tabAnalyzer.ts))

**Factors:**
- Tab count (penalty for >20 tabs)
- Category distribution
- Usage time patterns
- Focus metrics

**Score Range:** 0-100
- 80+: Excellent productivity
- 60-79: Good
- 40-59: Fair
- <40: Needs improvement

---

## 6. Undo/Redo System

### Overview
Full undo/redo support for all tab organization actions.

### Implementation ([undoManager.ts](../src/utils/undoManager.ts))

**Tracked Actions:**
- Smart organize
- Category changes
- Tab movements
- Group creation/deletion

**Features:**
- Snapshot-based state management
- Configurable history size
- Efficient state compression

---

## 7. Snapshot Management

### Overview
Save and restore complete tab states with timestamps.

### Features ([snapshotStorage.ts](../src/utils/snapshotStorage.ts))

- Save current tab layout
- Restore previous states
- Compress snapshot data
- Automatic cleanup of old snapshots

---

## 8. Multi-language Support

### Supported Languages
- 🇺🇸 English (en)
- 🇰🇷 Korean (ko)
- 🇯🇵 Japanese (ja)

### Implementation ([i18n.ts](../src/lib/i18n.ts))

**Features:**
- i18next + react-i18next
- Dynamic language switching
- Persistent language preference
- Fallback to English

### Usage
```typescript
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>
```

---

## 9. Tab Filtering

### Filter Types ([tabFilters.ts](../src/utils/tabFilters.ts))

- By domain
- By title
- By category
- By usage pattern
- By time range

---

## 10. Interactive Charts

### Chart Components

**SimpleBarChart** ([SimpleBarChart.tsx](../src/components/charts/SimpleBarChart.tsx))
- Category usage breakdown
- Domain statistics
- Time-based metrics

**SimpleLineChart** ([SimpleLineChart.tsx](../src/components/charts/SimpleLineChart.tsx))
- Usage trends over time
- Productivity score history
- Daily patterns
