# TabQuest Documentation

## 📚 Documentation Index

### Core Documentation
- [Architecture Overview](./architecture.md) - System structure and design
- [Core Features](./core-features.md) - Main features explained
- [State Management](./state-management.md) - Zustand store architecture
- [Tab Organization](./tab-organization.md) - Tab grouping logic
- [Data Structure](./data-structure.md) - Storage and data models
- [Development Setup](./development-setup.md) - Getting started guide

---

## 🚀 Quick Start

TabQuest is a Chrome extension built with WXT framework that helps users manage browser tabs intelligently using the Chrome Side Panel API.

### Key Features
- 🎯 **Smart Tab Organization**: Category-based automatic grouping
- 🏷️ **Category Management**: Custom category system with colors
- 🤖 **AI Insights**: Smart productivity suggestions
- ↩️ **Undo/Redo**: Full undo/redo support for all actions
- 📸 **Snapshots**: Save and restore tab states
- 🌍 **Multi-language**: English, Korean, Japanese

### Project Structure
```
tab-quest/
├── docs/              # 📚 Documentation
├── src/
│   ├── entrypoints/   # Entry points (sidepanel, popup, background)
│   ├── components/    # React components
│   │   ├── modals/    # Modal dialogs
│   │   ├── pages/     # Page components
│   │   ├── shared/    # Shared components
│   │   └── ui/        # UI primitives
│   ├── store/         # Zustand stores
│   ├── utils/         # Utility functions
│   ├── lib/           # Core libraries
│   ├── locales/       # i18n translations
│   └── types/         # TypeScript types
└── public/            # Static assets
```

---

## 📖 Documentation Guide

Start with [Architecture Overview](./architecture.md) to understand the system structure, then explore specific topics based on your needs.

### For Developers
1. [Development Setup](./development-setup.md) - Environment configuration
2. [Architecture Overview](./architecture.md) - System design
3. [State Management](./state-management.md) - Zustand stores

### For Understanding Features
1. [Core Features](./core-features.md) - Feature descriptions
2. [Tab Organization](./tab-organization.md) - Grouping algorithms
3. [Data Structure](./data-structure.md) - Storage and data models
